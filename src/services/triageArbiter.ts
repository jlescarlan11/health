import { AssessmentProfile } from '../types/triage';

export type TriageSignal = 'TERMINATE' | 'CONTINUE' | 'RESOLVE_AMBIGUITY' | 'PRIORITIZE_RED_FLAGS' | 'REQUIRE_CLARIFICATION' | 'RESOLVE_FRICTION';

export interface ArbiterResult {
  signal: TriageSignal;
  reason?: string;
  nextSteps?: string[];
  needs_reset?: boolean;
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
    remainingQuestions: { tier?: number; is_red_flag?: boolean }[] = []
  ): ArbiterResult {
    // --- 1. MANDATORY SAFETY GATE: RED FLAGS ---
    if (profile.red_flags_resolved === false) {
      const hasUnattemptedRedFlags = remainingQuestions.some(q => q.is_red_flag);
      if (hasUnattemptedRedFlags) {
        return {
          signal: 'PRIORITIZE_RED_FLAGS',
          reason: 'MANDATORY SAFETY GATE: Unresolved red flags detected.',
          nextSteps: ['Complete all red-flag verification questions immediately']
        };
      }
      return {
        signal: 'CONTINUE',
        reason: 'MANDATORY SAFETY GATE: Red flags remain unresolved',
        nextSteps: ['Confirm denial or presence of critical red flags']
      };
    }

    // --- 2. CLINICAL SANITY & FRICTION OVERRIDE (Early Intervention) ---
    const sanityResult = this.evaluateClinicalSanity(profile, remainingQuestions);
    
    // IMMEDIATE INTERVENTION: These signals override the turn floor because they require specific active resolution.
    if (sanityResult.signal === 'RESOLVE_AMBIGUITY' || 
        sanityResult.signal === 'RESOLVE_FRICTION' || 
        sanityResult.signal === 'REQUIRE_CLARIFICATION') {
      return sanityResult;
    }

    // --- 3. DETERMINISTIC TURN FLOORS (Non-Overridable for Termination) ---
    const isComplexCategory = profile.symptom_category === 'complex' || profile.symptom_category === 'critical' || profile.is_complex_case;
    const minTurnsRequired = isComplexCategory ? this.MIN_TURNS_COMPLEX : this.MIN_TURNS_SIMPLE;

    if (currentTurn < minTurnsRequired) {
        return {
            signal: 'CONTINUE',
            reason: `GUARDRAIL: Turn floor not reached for ${isComplexCategory ? 'complex' : 'simple'} category. (Current: ${currentTurn}, Required: ${minTurnsRequired})`,
            nextSteps: ['Continue gathering clinical context']
        };
    }

    // --- 4. RESUME SANITY CHECK (Soft Continue) ---
    // If we are above the floor, we must now respect "soft" continue signals (e.g., missing progression)
    // that were held back to allow the floor check to take precedence if needed.
    if (sanityResult.signal !== 'TERMINATE') {
      return sanityResult;
    }

    // --- 5. TIER 3 EXHAUSTION FOR COMPLEX/FRICTION CASES ---
    if (isComplexCategory || profile.clinical_friction_detected) {
        const hasUnattemptedTier3 = remainingQuestions.some(q => q.tier === 3);
        if (hasUnattemptedTier3) {
            return {
                signal: 'CONTINUE',
                reason: `DEPTH FAIL: Tier 3 exhaustion required for ${isComplexCategory ? 'complex case' : 'clinical friction'}.`,
                nextSteps: ['Complete all remaining Tier 3 ambiguity resolution questions']
            };
        }
    }

    // --- 6. DATA COMPLETENESS GATE ---
    const completenessResult = this.evaluateDataCompleteness(profile);
    
    if (completenessResult.signal === 'TERMINATE' && 
        profile.triage_readiness_score === 1.0 && 
        profile.internal_inconsistency_detected) {
        return {
            signal: 'REQUIRE_CLARIFICATION',
            reason: 'RESTRICTION: High readiness with contradictory history detected (False Positive Completeness)',
            needs_reset: true,
            nextSteps: ['Perform system-led reset of progress', 'Re-verify symptom timeline']
        };
    }

    if (completenessResult.signal !== 'TERMINATE') {
      return completenessResult;
    }

    // --- 7. TERMINATION EXECUTION ---
    const isExhausted = currentTurn >= totalPlannedQuestions;

    if (isExhausted || currentTurn >= 10) { // Safety ceiling increased to allow for Turn 7 floor
      return {
        signal: 'TERMINATE',
        reason: 'CLINICAL CLOSURE: Case is complete, coherent, and safety-verified.'
      };
    }

    return {
      signal: 'CONTINUE',
      reason: 'Continuing planned path to maximize clinical data density'
    };
  }

  /**
   * Stage A: Verify presence of required slots and base readiness.
   */
  private static evaluateDataCompleteness(profile: AssessmentProfile): ArbiterResult {
    const missingFields: string[] = [];
    
    if (!profile.age || profile.age.toLowerCase() === 'null') missingFields.push('Age');
    if (!profile.duration || profile.duration.toLowerCase() === 'null') missingFields.push('Duration');
    if (!profile.severity || profile.severity.toLowerCase() === 'null') missingFields.push('Severity');
    if (!profile.red_flag_denials || profile.red_flag_denials.toLowerCase() === 'null') missingFields.push('Red Flag Assessment');

    if (missingFields.length > 0) {
      return {
        signal: 'CONTINUE',
        reason: `COMPLETENESS FAIL: Missing critical slots [${missingFields.join(', ')}]`
      };
    }

    if (!profile.red_flags_resolved) {
        return {
            signal: 'CONTINUE',
            reason: 'SAFETY FLOOR VIOLATION: Red flags not explicitly resolved. Termination blocked.'
        };
    }

    if ((profile.triage_readiness_score ?? 0) < 0.90) {
      return {
        signal: 'CONTINUE',
        reason: `READINESS FAIL: Triage readiness score ${profile.triage_readiness_score} below 0.90 threshold`
      };
    }

    return { signal: 'TERMINATE' };
  }

  /**
   * Stage B: Evaluate internal medical consistency and clarity.
   */
  private static evaluateClinicalSanity(
    profile: AssessmentProfile, 
    remainingQuestions: { tier?: number }[]
  ): ArbiterResult {
    // 1. NON-NEGOTIABLE: Ambiguity Safeguard
    // Allow termination if ambiguity is detected but the user has explicitly accepted uncertainty.
    if (profile.ambiguity_detected && !profile.uncertainty_accepted) {
      return {
        signal: 'RESOLVE_AMBIGUITY',
        reason: 'COHERENCE FAIL: Unresolved clinical ambiguity detected. Termination blocked.',
        nextSteps: ['Clarify anatomical locations or temporal relations']
      };
    }

    // 2. CLINICAL FRICTION: Contradictory reports
    if (profile.clinical_friction_detected) {
        return {
            signal: 'RESOLVE_FRICTION',
            reason: `COHERENCE FAIL: Clinical friction detected. Details: ${profile.clinical_friction_details}`,
            nextSteps: ['Re-verify contradictory symptoms', 'Address mixed-signal reports']
        };
    }

    // 3. COHERENCE: Internal Consistency / Tier 3 Requirement
    const isInconsistent = profile.internal_inconsistency_detected || (profile.internal_consistency_score ?? 1) < 0.85;
    
    if (isInconsistent) {
      const hasUnattemptedTier3 = remainingQuestions.some(q => q.tier === 3);
      if (hasUnattemptedTier3) {
        return {
          signal: 'CONTINUE',
          reason: 'COHERENCE FAIL: Inconsistency detected. Blocking termination until Tier 3 systematic rule-outs are exhausted.',
          nextSteps: ['Attempt all Tier 3 ambiguity-resolution questions']
        };
      }

      if ((profile.internal_consistency_score ?? 1) < 0.70) {
        return {
            signal: 'REQUIRE_CLARIFICATION',
            reason: 'COHERENCE FAIL: Severe clinical contradiction.',
            needs_reset: true,
            nextSteps: ['Re-baseline symptom report']
        };
      }
    }

    // 4. CLINICAL CONTEXT: Progression Check
    if (!profile.progression || profile.progression.toLowerCase() === 'null') {
        return {
            signal: 'CONTINUE',
            reason: 'COHERENCE FAIL: Symptom progression (worsening/improving) is missing.'
        };
    }

    return { signal: 'TERMINATE' };
  }
}