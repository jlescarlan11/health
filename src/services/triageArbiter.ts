import { AssessmentProfile } from '../types/triage';
import { isMaternalContext, normalizeAge } from '../utils/clinicalUtils';
import { normalizeSlot } from '../utils/aiUtils';

export type TriageSignal =
  | 'TERMINATE'
  | 'CONTINUE'
  | 'RESOLVE_AMBIGUITY'
  | 'PRIORITIZE_RED_FLAGS'
  | 'REQUIRE_CLARIFICATION'
  | 'RESOLVE_FRICTION';

export interface ArbiterResult {
  signal: TriageSignal;
  reason?: string;
  nextSteps?: string[];
  needs_reset?: boolean;
  saturation_count?: number;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant' | 'system';
  text: string;
}

export class TriageArbiter {
  private static readonly MIN_TURNS_SIMPLE = 4;
  private static readonly MIN_TURNS_COMPLEX = 7;

  /**
   * Evaluates the current state of the assessment and returns a control signal.
   * Centralizes the "Safety-First" triage philosophy.
   */
  public static evaluateAssessmentState(
    history: ChatHistoryItem[],
    profile: AssessmentProfile,
    currentTurn: number,
    totalPlannedQuestions: number,
    remainingQuestions: { tier?: number; is_red_flag?: boolean }[] = [],
    previousProfile?: AssessmentProfile,
    currentSaturationCount: number = 0,
    clarificationAttempts: number = 0,
  ): ArbiterResult {
    // Calculate new saturation state
    const newSaturationCount = this.calculateSaturation(
      profile,
      previousProfile,
      currentSaturationCount,
    );

    // --- 0. VULNERABLE GROUP DETECTION ---
    const isVulnerable = this.isVulnerableGroup(history, profile);
    if (isVulnerable && !profile.is_vulnerable) {
      profile.is_vulnerable = true;
    }

    // --- 1. AMBIGUOUS DENIAL SAFEGUARD (Force Clarification) ---
    // If the user issued a denial but the confidence is low (ambiguous phrasing), force verification.
    // Loop Protection: Max 2 clarification attempts.
    if (profile.denial_confidence === 'low') {
      if (clarificationAttempts < 2) {
        return {
          signal: 'REQUIRE_CLARIFICATION',
          reason: 'SAFETY GUARD: Low confidence denial detected. Verification required.',
          nextSteps: ['Execute mandatory re-verification protocol'],
          saturation_count: newSaturationCount,
        };
      } else {
        console.warn('[TriageArbiter] Clarification attempts exhausted. Treating ambiguity as potential risk.');
        // Fallback: Proceed, but the low confidence score will likely force a conservative recommendation later.
      }
    }

    // --- 2. MANDATORY SAFETY GATE: RED FLAGS ---
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

    // --- 3. CLINICAL SANITY & FRICTION OVERRIDE (Early Intervention) ---
    const sanityResult = this.evaluateClinicalSanity(profile, remainingQuestions);

    // IMMEDIATE INTERVENTION: These signals override the turn floor because they require specific active resolution.
    if (
      sanityResult.signal === 'RESOLVE_AMBIGUITY' ||
      sanityResult.signal === 'RESOLVE_FRICTION' ||
      sanityResult.signal === 'REQUIRE_CLARIFICATION'
    ) {
      return { ...sanityResult, saturation_count: newSaturationCount };
    }

    // --- 2b. CLINICAL SATURATION (Explicit Early Termination) ---
    // If we have reached full readiness (1.0) and the profile has been stable (no new info)
    // for 2 consecutive turns, we can safely terminate even if below the turn floor.
    if (profile.triage_readiness_score === 1.0 && newSaturationCount >= 2) {
      return {
        signal: 'TERMINATE',
        reason: 'CLINICAL SATURATION: Readiness 1.0 and stability maintained for 2+ turns.',
        saturation_count: newSaturationCount,
      };
    }

    // --- 3. DETERMINISTIC TURN FLOORS (Non-Overridable for Termination) ---
    const isComplexCategory =
      profile.symptom_category === 'complex' ||
      profile.symptom_category === 'critical' ||
      profile.is_complex_case ||
      profile.is_vulnerable;
    const minTurnsRequired = isComplexCategory ? this.MIN_TURNS_COMPLEX : this.MIN_TURNS_SIMPLE;

    if (currentTurn < minTurnsRequired) {
      return {
        signal: 'CONTINUE',
        reason: `GUARDRAIL: Turn floor not reached for ${isComplexCategory ? (profile.is_vulnerable ? 'vulnerable' : 'complex') : 'simple'} category. (Current: ${currentTurn}, Required: ${minTurnsRequired})`,
        nextSteps: ['Continue gathering clinical context'],
        saturation_count: newSaturationCount,
      };
    }

    // --- 4. RESUME SANITY CHECK (Soft Continue) ---
    // If we are above the floor, we must now respect "soft" continue signals (e.g., missing progression)
    // that were held back to allow the floor check to take precedence if needed.
    if (sanityResult.signal !== 'TERMINATE') {
      return { ...sanityResult, saturation_count: newSaturationCount };
    }

    // --- 5. TIER 3 EXHAUSTION FOR COMPLEX/FRICTION CASES ---
    if (isComplexCategory || profile.clinical_friction_detected) {
      const hasUnattemptedTier3 = remainingQuestions.some((q) => q.tier === 3);
      if (hasUnattemptedTier3) {
        return {
          signal: 'CONTINUE',
          reason: `DEPTH FAIL: Tier 3 exhaustion required for ${isComplexCategory ? 'complex case' : 'clinical friction'}.`,
          nextSteps: ['Complete all remaining Tier 3 ambiguity resolution questions'],
          saturation_count: newSaturationCount,
        };
      }
    }

    // --- 6. DATA COMPLETENESS GATE ---
    const completenessResult = this.evaluateDataCompleteness(profile);

    if (
      completenessResult.signal === 'TERMINATE' &&
      profile.triage_readiness_score === 1.0 &&
      profile.internal_inconsistency_detected
    ) {
      return {
        signal: 'REQUIRE_CLARIFICATION',
        reason:
          'RESTRICTION: High readiness with contradictory history detected (False Positive Completeness)',
        needs_reset: true,
        nextSteps: ['Perform system-led reset of progress', 'Re-verify symptom timeline'],
        saturation_count: newSaturationCount,
      };
    }

    if (completenessResult.signal !== 'TERMINATE') {
      return { ...completenessResult, saturation_count: newSaturationCount };
    }

    // --- 7. TERMINATION EXECUTION ---
    const isExhausted = currentTurn >= totalPlannedQuestions;

    if (isExhausted || currentTurn >= 10) {
      // Safety ceiling increased to allow for Turn 7 floor
      return {
        signal: 'TERMINATE',
        reason: 'CLINICAL CLOSURE: Case is complete, coherent, and safety-verified.',
        saturation_count: newSaturationCount,
      };
    }

    return {
      signal: 'CONTINUE',
      reason: 'Continuing planned path to maximize clinical data density',
      saturation_count: newSaturationCount,
    };
  }

  private static calculateSaturation(
    current: AssessmentProfile,
    previous: AssessmentProfile | undefined,
    count: number,
  ): number {
    if (!previous) return 0;

    // If slots are identical, increment counter. Otherwise reset to 0.
    if (this.areClinicalSlotsIdentical(current, previous)) {
      return count + 1;
    }
    return 0;
  }

  private static areClinicalSlotsIdentical(a: AssessmentProfile, b: AssessmentProfile): boolean {
    // Critical clinical slots
    if (normalizeSlot(a.age) !== normalizeSlot(b.age)) return false;
    if (normalizeSlot(a.duration) !== normalizeSlot(b.duration)) return false;
    if (normalizeSlot(a.severity) !== normalizeSlot(b.severity)) return false;
    if (normalizeSlot(a.progression) !== normalizeSlot(b.progression)) return false;

    // Safety & Category slots
    if (
      normalizeSlot(a.red_flag_denials, { allowNone: true }) !==
      normalizeSlot(b.red_flag_denials, { allowNone: true })
    )
      return false;
    if (a.red_flags_resolved !== b.red_flags_resolved) return false;
    if (a.symptom_category !== b.symptom_category) return false;

    // Complexity flags
    if (a.is_complex_case !== b.is_complex_case) return false;
    if (a.is_vulnerable !== b.is_vulnerable) return false;

    return true;
  }

  /**
   * Stage A: Verify presence of required slots and base readiness.
   */
  private static evaluateDataCompleteness(profile: AssessmentProfile): ArbiterResult {
    const missingFields: string[] = [];

    if (!normalizeSlot(profile.age)) missingFields.push('Age');
    if (!normalizeSlot(profile.duration)) missingFields.push('Duration');
    if (!normalizeSlot(profile.severity)) missingFields.push('Severity');
    if (!normalizeSlot(profile.red_flag_denials, { allowNone: true }))
      missingFields.push('Red Flag Assessment');

    if (missingFields.length > 0) {
      return {
        signal: 'CONTINUE',
        reason: `COMPLETENESS FAIL: Missing critical slots [${missingFields.join(', ')}]`,
      };
    }

    if (!profile.red_flags_resolved) {
      return {
        signal: 'CONTINUE',
        reason: 'SAFETY FLOOR VIOLATION: Red flags not explicitly resolved. Termination blocked.',
      };
    }

    if ((profile.triage_readiness_score ?? 0) < 0.9) {
      return {
        signal: 'CONTINUE',
        reason: `READINESS FAIL: Triage readiness score ${profile.triage_readiness_score} below 0.90 threshold`,
      };
    }

    return { signal: 'TERMINATE' };
  }

  /**
   * Stage B: Evaluate internal medical consistency and clarity.
   */
  private static evaluateClinicalSanity(
    profile: AssessmentProfile,
    remainingQuestions: { tier?: number }[],
  ): ArbiterResult {
    // 1. NON-NEGOTIABLE: Ambiguity Safeguard
    // Allow termination if ambiguity is detected but the user has explicitly accepted uncertainty.
    if (profile.ambiguity_detected && !profile.uncertainty_accepted) {
      return {
        signal: 'RESOLVE_AMBIGUITY',
        reason: 'COHERENCE FAIL: Unresolved clinical ambiguity detected. Termination blocked.',
        nextSteps: ['Clarify anatomical locations or temporal relations'],
      };
    }

    // 2. CLINICAL FRICTION: Contradictory reports
    if (profile.clinical_friction_detected) {
      return {
        signal: 'RESOLVE_FRICTION',
        reason: `COHERENCE FAIL: Clinical friction detected. Details: ${profile.clinical_friction_details}`,
        nextSteps: ['Re-verify contradictory symptoms', 'Address mixed-signal reports'],
      };
    }

    // 3. COHERENCE: Internal Consistency / Tier 3 Requirement
    const isInconsistent =
      profile.internal_inconsistency_detected || (profile.internal_consistency_score ?? 1) < 0.85;

    if (isInconsistent) {
      const hasUnattemptedTier3 = remainingQuestions.some((q) => q.tier === 3);
      if (hasUnattemptedTier3) {
        return {
          signal: 'CONTINUE',
          reason:
            'COHERENCE FAIL: Inconsistency detected. Blocking termination until Tier 3 systematic rule-outs are exhausted.',
          nextSteps: ['Attempt all Tier 3 ambiguity-resolution questions'],
        };
      }

      if ((profile.internal_consistency_score ?? 1) < 0.7) {
        return {
          signal: 'REQUIRE_CLARIFICATION',
          reason: 'COHERENCE FAIL: Severe clinical contradiction.',
          needs_reset: true,
          nextSteps: ['Re-baseline symptom report'],
        };
      }
    }

    // 4. CLINICAL CONTEXT: Progression Check
    if (!normalizeSlot(profile.progression)) {
      return {
        signal: 'CONTINUE',
        reason: 'COHERENCE FAIL: Symptom progression (worsening/improving) is missing.',
      };
    }

    return { signal: 'TERMINATE' };
  }

  private static isVulnerableGroup(
    history: ChatHistoryItem[],
    profile: AssessmentProfile,
  ): boolean {
    const numericAge = normalizeAge(profile.age);
    const isPediatric = numericAge !== null && numericAge < 5;
    const isGeriatric = numericAge !== null && numericAge >= 65;

    const fullText = history.map((h) => h.text).join(' ');
    const isMaternal = isMaternalContext(fullText);

    return isPediatric || isMaternal || isGeriatric || profile.is_vulnerable === true;
  }
}
