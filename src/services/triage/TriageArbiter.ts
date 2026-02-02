import { AssessmentProfile, ChatHistoryItem, ArbiterResult } from '../../types/triage';
import { isMaternalContext, normalizeAge } from '../../utils/clinicalUtils';
import { normalizeNumericValue } from '../../utils/stringUtils';
import { normalizeSlot } from '../../utils/aiUtils';
import { detectProtocol, Protocol } from './ProtocolRegistry';

export interface TriageSessionContext {
  sessionId?: string;
  stableTurnCount?: number;
}

export class TriageArbiter {
  private static readonly MIN_TURNS_SIMPLE = 4;
  private static readonly MIN_TURNS_COMPLEX = 7;
  private static readonly MAX_QUESTIONS_HARD_CAP = 12;

  private stableTurnCount: number;

  constructor(initialStableTurnCount?: number) {
    const parsed = Number(initialStableTurnCount);
    this.stableTurnCount = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  public static evaluateAssessmentState(
    history: ChatHistoryItem[],
    profile: AssessmentProfile,
    currentTurn: number,
    totalPlannedQuestions: number,
    remainingQuestions: { tier?: number; is_red_flag?: boolean }[] = [],
    previousProfile?: AssessmentProfile,
    clarificationAttempts: number = 0,
    initialSymptom: string = '',
    sessionContext?: TriageSessionContext,
  ): ArbiterResult {
    const arbiter = new TriageArbiter(sessionContext?.stableTurnCount);
    return arbiter.evaluateAssessmentStateInternal(
      history,
      profile,
      currentTurn,
      totalPlannedQuestions,
      remainingQuestions,
      previousProfile,
      clarificationAttempts,
      initialSymptom,
    );
  }

  private evaluateAssessmentStateInternal(
    history: ChatHistoryItem[],
    profile: AssessmentProfile,
    currentTurn: number,
    totalPlannedQuestions: number,
    remainingQuestions: { tier?: number; is_red_flag?: boolean }[],
    previousProfile?: AssessmentProfile,
    clarificationAttempts: number = 0,
    initialSymptom: string = '',
  ): ArbiterResult {
    const isSaturated = this.calculateSaturation(
      profile,
      previousProfile,
      profile.triage_readiness_score ?? 0,
    );
    const newSaturationCount = this.stableTurnCount;

    if (currentTurn >= TriageArbiter.MAX_QUESTIONS_HARD_CAP) {
      return {
        signal: 'TERMINATE',
        reason: `HARD CAP REACHED: Terminating at ${currentTurn} turns.`,
        saturation_count: newSaturationCount,
      };
    }

    const isVulnerable = TriageArbiter.isVulnerableGroup(history, profile);
    if (isVulnerable && !profile.is_vulnerable) {
      profile.is_vulnerable = true;
    }

    if (profile.denial_confidence === 'low') {
      if (clarificationAttempts < 2) {
        return {
          signal: 'REQUIRE_CLARIFICATION',
          reason: 'SAFETY GUARD: Low confidence denial detected.',
          nextSteps: ['Execute mandatory re-verification protocol'],
          saturation_count: newSaturationCount,
        };
      }
    }

    if (profile.red_flags_resolved === false) {
      const hasUnattemptedRedFlags = remainingQuestions.some((q) => q.is_red_flag);
      if (hasUnattemptedRedFlags) {
        return {
          signal: 'PRIORITIZE_RED_FLAGS',
          reason: 'MANDATORY SAFETY GATE: Unresolved red flags detected.',
          nextSteps: ['Complete all red-flag verification questions immediately'],
          saturation_count: newSaturationCount,
        };
      }
      return {
        signal: 'CONTINUE',
        reason: 'MANDATORY SAFETY GATE: Red flags remain unresolved',
        nextSteps: ['Confirm denial or presence of critical red flags'],
        saturation_count: newSaturationCount,
      };
    }

    const sanityResult = TriageArbiter.evaluateClinicalSanity(profile, remainingQuestions, previousProfile);
    if (
      sanityResult.signal === 'RESOLVE_AMBIGUITY' ||
      sanityResult.signal === 'REQUIRE_CLARIFICATION' ||
      sanityResult.signal === 'DRILL_DOWN'
    ) {
      return { ...sanityResult, saturation_count: newSaturationCount };
    }

    if (isSaturated) {
      return {
        signal: 'TERMINATE',
        reason: 'CLINICAL SATURATION: Readiness 1.0 and stability maintained.',
        saturation_count: newSaturationCount,
      };
    }

    const isComplexCategory =
      profile.symptom_category === 'complex' ||
      profile.symptom_category === 'critical' ||
      profile.is_complex_case ||
      profile.is_vulnerable;
    const minTurnsRequired = isComplexCategory
      ? TriageArbiter.MIN_TURNS_COMPLEX
      : TriageArbiter.MIN_TURNS_SIMPLE;

    if (currentTurn < minTurnsRequired) {
      return {
        signal: 'CONTINUE',
        reason: `GUARDRAIL: Turn floor not reached. (Current: ${currentTurn}, Required: ${minTurnsRequired})`,
        nextSteps: ['Continue gathering clinical context'],
        saturation_count: newSaturationCount,
      };
    }

    if (sanityResult.signal !== 'TERMINATE') {
      return { ...sanityResult, saturation_count: newSaturationCount };
    }

    if (isComplexCategory || profile.clinical_friction_detected) {
      const hasUnattemptedTier3 = remainingQuestions.some((q) => q.tier === 3);
      if (hasUnattemptedTier3) {
        return {
          signal: 'CONTINUE',
          reason: `DEPTH FAIL: Tier 3 exhaustion required.`,
          nextSteps: ['Complete all remaining Tier 3 ambiguity resolution questions'],
          saturation_count: newSaturationCount,
        };
      }
    }

    const completenessResult = TriageArbiter.evaluateDataCompleteness(profile, initialSymptom);
    if (
      completenessResult.signal === 'TERMINATE' &&
      profile.triage_readiness_score === 1.0 &&
      profile.internal_inconsistency_detected
    ) {
      return {
        signal: 'REQUIRE_CLARIFICATION',
        reason: 'RESTRICTION: High readiness with contradictory history detected',
        needs_reset: true,
        nextSteps: ['Perform system-led reset of progress'],
        saturation_count: newSaturationCount,
      };
    }

    if (completenessResult.signal !== 'TERMINATE') {
      return { ...completenessResult, saturation_count: newSaturationCount };
    }

    const isExhausted = currentTurn >= totalPlannedQuestions;
    if (isExhausted || currentTurn >= 10) {
      return {
        signal: 'TERMINATE',
        reason: 'CLINICAL CLOSURE: Case is complete and verified.',
        saturation_count: newSaturationCount,
      };
    }

    return {
      signal: 'CONTINUE',
      reason: 'Continuing planned path to maximize clinical data density',
      saturation_count: newSaturationCount,
    };
  }

  private calculateSaturation(
    current: AssessmentProfile,
    previous: AssessmentProfile | undefined,
    readinessScore: number,
  ): boolean {
    if (!previous) {
      this.stableTurnCount = 0;
      return false;
    }
    const slotsIdentical = TriageArbiter.areClinicalSlotsIdentical(current, previous);
    const stableCount = slotsIdentical ? this.stableTurnCount + 1 : 0;
    this.stableTurnCount = stableCount;
    return readinessScore >= 1.0 && stableCount >= 2;
  }

  private static areClinicalSlotsIdentical(a: AssessmentProfile, b: AssessmentProfile): boolean {
    if (!this.semanticNumericCompare('age', a.age, b.age)) return false;
    if (!this.strictTextCompare('duration', a.duration, b.duration)) return false;
    if (!this.semanticNumericCompare('severity', a.severity, b.severity)) return false;
    if (!this.strictTextCompare('progression', a.progression, b.progression)) return false;
    if (!this.semanticDenialCompare('red_flag_denials', a.red_flag_denials, b.red_flag_denials, { allowNone: true })) return false;
    if (a.red_flags_resolved !== b.red_flags_resolved) return false;
    if (a.symptom_category !== b.symptom_category) return false;
    if (a.is_complex_case !== b.is_complex_case) return false;
    if (a.is_vulnerable !== b.is_vulnerable) return false;
    return true;
  }

  private static semanticNumericCompare(_field: string, valueA?: string | null, valueB?: string | null): boolean {
    const left = normalizeSlot(valueA);
    const right = normalizeSlot(valueB);
    if (!left && !right) return true;
    if (!left || !right) return false;
    const normalizedLeft = normalizeNumericValue(left);
    const normalizedRight = normalizeNumericValue(right);
    if (normalizedLeft !== null && normalizedRight !== null) return normalizedLeft === normalizedRight;
    return left.trim().toLowerCase() === right.trim().toLowerCase();
  }

  private static strictTextCompare(_field: string, valueA?: string | null, valueB?: string | null, options: { allowNone?: boolean } = {}): boolean {
    return normalizeSlot(valueA, options) === normalizeSlot(valueB, options);
  }

  private static semanticDenialCompare(_field: string, valueA?: string | null, valueB?: string | null, options: { allowNone?: boolean } = {}): boolean {
    const left = normalizeSlot(valueA, options);
    const right = normalizeSlot(valueB, options);
    if (left === right) return true;
    if (!left || !right) return false;
    const tokenize = (text: string) => new Set(text.toLowerCase().replace(/[.,;]/g, ' ').split(/\s+/).filter((s) => s.length > 2 && s !== 'denies' && s !== 'reports'));
    const setA = tokenize(left);
    const setB = tokenize(right);
    return setA.size === setB.size && [...setA].every((x) => setB.has(x));
  }

  private static evaluateDataCompleteness(profile: AssessmentProfile, initialSymptom: string): ArbiterResult {
    const missingFields: string[] = [];
    if (!normalizeSlot(profile.age)) missingFields.push('Age');
    if (!normalizeSlot(profile.duration)) missingFields.push('Duration');
    if (!normalizeSlot(profile.severity)) missingFields.push('Severity');
    if (!normalizeSlot(profile.red_flag_denials, { allowNone: true })) missingFields.push('Red Flag');

    if (missingFields.length > 0) return { signal: 'CONTINUE', reason: `Missing: ${missingFields.join(', ')}` };
    if (!profile.red_flags_resolved) return { signal: 'CONTINUE', reason: 'Red flags not resolved.' };

    const protocol = detectProtocol(profile.summary || '', initialSymptom);
    if (protocol) {
      const { missing, complete } = this.areProtocolSlotsComplete(profile, protocol);
      if (complete) return { signal: 'TERMINATE', reason: `${protocol.id} slots complete.` };
      return { signal: 'CONTINUE', reason: `Missing ${protocol.id} slots: ${missing.join(', ')}` };
    }

    if ((profile.triage_readiness_score ?? 0) < 0.9) return { signal: 'CONTINUE', reason: 'Readiness below threshold.' };
    return { signal: 'TERMINATE' };
  }

  private static areProtocolSlotsComplete(profile: AssessmentProfile, protocol: Protocol): { missing: string[], complete: boolean } {
    const details = (profile.specific_details as Record<string, any>) || {};
    const missing = protocol.required_slots.filter(slot => {
      // Check only specific_details
      const value = details[slot];
      return !normalizeSlot(value, { allowNone: true });
    });
    return { missing, complete: missing.length === 0 };
  }

  private static evaluateClinicalSanity(profile: AssessmentProfile, remainingQuestions: { tier?: number }[], previousProfile?: AssessmentProfile): ArbiterResult {
    if (previousProfile && previousProfile.symptom_category !== 'critical' && profile.symptom_category === 'critical') {
      return { signal: 'DRILL_DOWN', reason: 'Criticality escalation.' };
    }
    if (profile.ambiguity_detected && !profile.uncertainty_accepted) {
      return { signal: 'RESOLVE_AMBIGUITY', reason: 'Unresolved ambiguity.' };
    }
    if (profile.clinical_friction_detected) {
      return { signal: 'DRILL_DOWN', reason: 'Clinical friction.' };
    }
    if (profile.internal_inconsistency_detected || (profile.internal_consistency_score ?? 1) < 0.85) {
      if (remainingQuestions.some((q) => q.tier === 3)) return { signal: 'CONTINUE', reason: 'Inconsistency, check Tier 3.' };
      if ((profile.internal_consistency_score ?? 1) < 0.7) return { signal: 'REQUIRE_CLARIFICATION', reason: 'Severe inconsistency.', needs_reset: true };
    }
    if (!normalizeSlot(profile.progression)) return { signal: 'CONTINUE', reason: 'Missing progression.' };
    return { signal: 'TERMINATE' };
  }

  private static isVulnerableGroup(history: ChatHistoryItem[], profile: AssessmentProfile): boolean {
    const numericAge = normalizeAge(profile.age);
    const isPediatric = numericAge !== null && numericAge < 5;
    const isGeriatric = numericAge !== null && numericAge >= 65;
    const fullText = history.map((h) => h.text).join(' ');
    return isPediatric || isGeriatric || isMaternalContext(fullText) || profile.is_vulnerable === true;
  }
}
