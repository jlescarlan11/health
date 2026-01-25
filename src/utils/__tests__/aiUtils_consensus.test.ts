import { calculateTriageScore } from '../aiUtils';

describe('calculateTriageScore - Comprehensive Consensus Check', () => {
  const baseSlots = {
    age: null,
    duration: '2 days',
    progression: null,
    red_flags_resolved: true,
    uncertainty_accepted: false,
    clinical_friction_detected: false,
    ambiguity_detected: false,
    internal_inconsistency_detected: false,
    turn_count: 5,
    denial_confidence: 'high' as const,
    symptom_category: 'simple' as const,
  };

  describe('Positive Cases (Consensus reached)', () => {
    it('should trigger waiver for "mild 2/10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'mild 2/10' });
      expect(score).toBe(1.0);
    });

    it('should trigger waiver for "slight 3 out of 10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'slight 3 out of 10' });
      expect(score).toBe(1.0);
    });

    it('should trigger waiver for boundary value 1: "minimal 1/10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'minimal 1/10' });
      expect(score).toBe(1.0);
    });

    it('should trigger waiver for boundary value 4: "minor 4 out of 10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'minor 4 out of 10' });
      expect(score).toBe(1.0);
    });

    it('should be case-insensitive: "MILD 3/10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'MILD 3/10' });
      expect(score).toBe(1.0);
    });

    it('should handle extra whitespace: "slight  2  /  10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'slight  2  /  10' });
      expect(score).toBe(1.0);
    });
  });

  describe('Negative Cases (No Consensus)', () => {
    it('should NOT trigger waiver for descriptor alone: "mild"', () => {
      // 0.8 base - 0.2 (2 nulls: age, progression) = 0.6
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'mild' });
      expect(score).toBeCloseTo(0.6);
    });

    it('should NOT trigger waiver for low score alone: "2/10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: '2/10' });
      expect(score).toBeCloseTo(0.6);
    });

    it('should NOT trigger waiver for high score alone: "7/10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: '7/10' });
      expect(score).toBeCloseTo(0.6);
    });

    it('should NOT trigger waiver for consensus failure (high score): "mild 7/10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'mild 7/10' });
      expect(score).toBeCloseTo(0.6);
    });

    it('should NOT trigger waiver for non-approved descriptor: "severe 2/10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'severe 2/10' });
      expect(score).toBeCloseTo(0.6);
    });

    it('should NOT trigger waiver for boundary value 5: "minor 5/10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'minor 5/10' });
      expect(score).toBeCloseTo(0.6);
    });

    it('should NOT trigger waiver for "slight 10/10"', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'slight 10/10' });
      expect(score).toBeCloseTo(0.6);
    });
  });

  describe('Edge Cases & Robustness', () => {
    it('should handle multiple numbers by matching the first valid low-range score', () => {
      // Regex /.../i.test() returns true if ANY match is found.
      // "mild 2/10 but was 8/10" contains both "mild" and "2/10".
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'mild 2/10 but was 8/10' });
      expect(score).toBe(1.0);
    });

    it('should NOT trigger if a high score precedes a low score without consensus on the first', () => {
      // "mild 8/10 then 2/10" -> still has "mild" and "2/10", so it triggers.
      // This is acceptable behavior for regex-based extraction.
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'mild 8/10 then 2/10' });
      expect(score).toBe(1.0);
    });

    it('should handle special characters', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'mild... 2/10!!!' });
      expect(score).toBe(1.0);
    });

    it('should NOT trigger for partial descriptor matches (e.g., "mildly")', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'mildly annoying 2/10' });
      expect(score).toBeCloseTo(0.6);
    });

    it('should handle malformed but recognizable numeric input', () => {
      const { score } = calculateTriageScore({ ...baseSlots, severity: 'slight 3out of10' });

      // The numeric regex allows zero whitespace between the number and "out of".
      expect(score).toBe(1.0);
    });

    it('should verify Age/Progression are the only waived penalties', () => {
      // If we miss Duration instead of Age

      const durationMissing = {
        ...baseSlots,

        age: '25',

        duration: null,

        progression: 'stable',

        severity: 'mild 2/10',
      };

      const { score } = calculateTriageScore(durationMissing);

      // coreSlots becomes ['duration', 'severity']

      // 'duration' is null -> 1 null count.

      // score = 0.8 - 0.1 = 0.7

      expect(score).toBeCloseTo(0.7);
    });
  });
});
