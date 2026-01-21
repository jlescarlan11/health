import { calculateTriageScore } from '../aiUtils';

describe('calculateTriageScore - Adaptive Strategy', () => {
  const baseSlots = {
    age: null,
    duration: '2 days',
    severity: 'mild', // Low risk
    progression: null,
    red_flags_resolved: true,
    uncertainty_accepted: false,
    clinical_friction_detected: false,
    ambiguity_detected: false,
    internal_inconsistency_detected: false,
    turn_count: 5,
    denial_confidence: 'high' as const,
  };

  it('should NOT penalize simple cases with missing slots if low risk', () => {
    // Behavior after fix:
    // symptom_category = 'simple'
    // severity = 'mild' (low risk)
    // Waive 'age' and 'progression' penalties.
    // Check remaining slots: 'duration' (present), 'severity' (present).
    // nullCount should be 0.
    // Score should be 1.0.
    const score = calculateTriageScore({
      ...baseSlots,
      symptom_category: 'simple',
    });

    expect(score).toBeCloseTo(1.0);
  });

  it('should still penalize complex cases even with low risk severity', () => {
    const score = calculateTriageScore({
      ...baseSlots,
      symptom_category: 'complex',
    });
    // Complex category -> Strict penalties apply.
    // Missing age, progression -> 2 nulls.
    // Base logic:
    // nullCount = 2.
    // !uncertainty_accepted -> score = 0.80 - (2 * 0.10) = 0.60.
    // Complex penalty: turn_count (5) < 7 -> min(score, 0.85). 0.60 is < 0.85.

    expect(score).toBeCloseTo(0.6);
  });

  it('should still penalize simple cases if severity is NOT low risk', () => {
    const score = calculateTriageScore({
      ...baseSlots,
      severity: 'severe', // High risk
      symptom_category: 'simple',
    });
    // Not low risk -> Strict penalties apply.
    // Missing age, progression -> 2 nulls.
    // Score: 0.80 - 0.20 = 0.60.
    expect(score).toBeCloseTo(0.6);
  });

  it('should handle numeric low risk severity (e.g., 2/10)', () => {
    const score = calculateTriageScore({
      ...baseSlots,
      severity: '2/10',
      symptom_category: 'simple',
    });
    // 2/10 is low risk. Should waive penalties.
    expect(score).toBeCloseTo(1.0);
  });

  it('should NOT waive penalties for moderate numeric severity (e.g., 5/10)', () => {
    const score = calculateTriageScore({
      ...baseSlots,
      severity: '5/10',
      symptom_category: 'simple',
    });
    // 5/10 is not low risk. Penalties apply.
    expect(score).toBeCloseTo(0.60);
  });

  it('should yield higher score for simple vs complex case with identical missing data', () => {
    const commonSlots = {
       ...baseSlots,
       age: null,
       progression: null,
       severity: 'mild', // Low risk, triggers adaptive logic for simple
       turn_count: 5
    };

    const simpleScore = calculateTriageScore({
      ...commonSlots,
      symptom_category: 'simple',
    });

    const complexScore = calculateTriageScore({
      ...commonSlots,
      symptom_category: 'complex',
    });

    // Simple should waive penalties (Score ~1.0)
    // Complex should enforce penalties (Score ~0.60)
    expect(simpleScore).toBeGreaterThan(complexScore);
  });
});
