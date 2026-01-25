import { TriageArbiter, ChatHistoryItem } from '../triageArbiter';
import { AssessmentProfile } from '../../types/triage';

const baseProfile = (overrides: Partial<AssessmentProfile> = {}): AssessmentProfile => ({
  age: '45',
  duration: '2 days',
  severity: '7/10',
  progression: 'worsening',
  red_flag_denials: 'none',
  summary: 'Test profile',
  triage_readiness_score: 1.0,
  ambiguity_detected: false,
  internal_consistency_score: 1.0,
  red_flags_resolved: true,
  symptom_category: 'simple',
  ...overrides,
});

describe('TriageArbiter saturation & semantic comparison', () => {
  let debugSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    (TriageArbiter as any).stableTurnCount = 0;
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    debugSpy.mockRestore();
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('semanticNumericCompare', () => {
    const semanticNumericCompare = (TriageArbiter as any).semanticNumericCompare as (
      field: string,
      a?: string | null,
      b?: string | null,
    ) => boolean;

    it('should treat both null/undefined as a match', () => {
      expect(semanticNumericCompare.call(TriageArbiter, 'age', null, undefined)).toBe(true);
      expect(semanticNumericCompare.call(TriageArbiter, 'severity', undefined, undefined)).toBe(
        true,
      );
    });

    it('should treat one null/undefined as a mismatch', () => {
      expect(semanticNumericCompare.call(TriageArbiter, 'age', '45', null)).toBe(false);
    });

    it('should match numeric equivalents across formats', () => {
      expect(semanticNumericCompare.call(TriageArbiter, 'severity', '7/10', "it's a 7")).toBe(true);
      expect(semanticNumericCompare.call(TriageArbiter, 'age', 'forty-five', '45')).toBe(true);
    });

    it('should mismatch when numeric values differ', () => {
      expect(semanticNumericCompare.call(TriageArbiter, 'severity', '7', '8')).toBe(false);
    });

    it('should fall back to case-insensitive text when normalization fails', () => {
      expect(semanticNumericCompare.call(TriageArbiter, 'severity', 'moderate', 'moderate')).toBe(
        true,
      );
      expect(semanticNumericCompare.call(TriageArbiter, 'severity', 'moderate', 'severe')).toBe(
        false,
      );
      expect(semanticNumericCompare.call(TriageArbiter, 'severity', 'moderate', '7')).toBe(false);
    });
  });

  describe('areClinicalSlotsIdentical', () => {
    const areClinicalSlotsIdentical = (TriageArbiter as any).areClinicalSlotsIdentical as (
      a: AssessmentProfile,
      b: AssessmentProfile,
    ) => boolean;

    it('should treat semantically equivalent age/severity as identical', () => {
      const a = baseProfile({ severity: '7/10', age: '45' });
      const b = baseProfile({ severity: "it's a 7", age: '45 years' });
      expect(areClinicalSlotsIdentical.call(TriageArbiter, a, b)).toBe(true);
    });

    it('should detect changes in strict text fields', () => {
      const a = baseProfile({ duration: '2 days' });
      const b = baseProfile({ duration: '3 days' });
      expect(areClinicalSlotsIdentical.call(TriageArbiter, a, b)).toBe(false);
    });

    it('should detect changes in progression', () => {
      const a = baseProfile({ progression: 'worsening' });
      const b = baseProfile({ progression: 'improving' });
      expect(areClinicalSlotsIdentical.call(TriageArbiter, a, b)).toBe(false);
    });

    it('should respect allowNone semantics for red_flag_denials', () => {
      const a = baseProfile({ red_flag_denials: 'none' });
      const b = baseProfile({ red_flag_denials: 'none' });
      expect(areClinicalSlotsIdentical.call(TriageArbiter, a, b)).toBe(true);
    });

    it('should detect changes in red_flag_denials', () => {
      const a = baseProfile({ red_flag_denials: 'none' });
      const b = baseProfile({ red_flag_denials: 'yes' });
      expect(areClinicalSlotsIdentical.call(TriageArbiter, a, b)).toBe(false);
    });

    it('should detect changes in category/flags', () => {
      const a = baseProfile({ symptom_category: 'simple', is_vulnerable: false });
      const b = baseProfile({ symptom_category: 'complex', is_vulnerable: false });
      expect(areClinicalSlotsIdentical.call(TriageArbiter, a, b)).toBe(false);
    });
  });

  describe('calculateSaturation', () => {
    const calculateSaturation = (TriageArbiter as any).calculateSaturation as (
      current: AssessmentProfile,
      previous: AssessmentProfile | undefined,
      readinessScore: number,
    ) => boolean;

    it('should not saturate without a previous profile', () => {
      const result = calculateSaturation.call(TriageArbiter, baseProfile(), undefined, 1.0);
      expect(result).toBe(false);
      expect((TriageArbiter as any).stableTurnCount).toBe(0);
    });

    it('should require 2 stable turns at readiness 1.0', () => {
      const prev = baseProfile();
      const curr = baseProfile();

      expect(calculateSaturation.call(TriageArbiter, curr, prev, 1.0)).toBe(false);
      expect((TriageArbiter as any).stableTurnCount).toBe(1);

      expect(calculateSaturation.call(TriageArbiter, curr, prev, 1.0)).toBe(true);
      expect((TriageArbiter as any).stableTurnCount).toBe(2);
    });

    it('should remain saturated on additional stable turns', () => {
      const prev = baseProfile();
      const curr = baseProfile();

      calculateSaturation.call(TriageArbiter, curr, prev, 1.0);
      calculateSaturation.call(TriageArbiter, curr, prev, 1.0);
      expect(calculateSaturation.call(TriageArbiter, curr, prev, 1.0)).toBe(true);
      expect((TriageArbiter as any).stableTurnCount).toBe(3);
    });

    it('should not saturate if readiness < 1.0 even with stable turns', () => {
      const prev = baseProfile();
      const curr = baseProfile();

      calculateSaturation.call(TriageArbiter, curr, prev, 0.95);
      expect(calculateSaturation.call(TriageArbiter, curr, prev, 0.95)).toBe(false);
      expect((TriageArbiter as any).stableTurnCount).toBe(2);
    });

    it('should allow saturation once readiness returns to 1.0', () => {
      const prev = baseProfile();
      const curr = baseProfile();

      calculateSaturation.call(TriageArbiter, curr, prev, 1.0);
      expect(calculateSaturation.call(TriageArbiter, curr, prev, 0.8)).toBe(false);
      expect(calculateSaturation.call(TriageArbiter, curr, prev, 1.0)).toBe(true);
      expect((TriageArbiter as any).stableTurnCount).toBe(3);
    });

    it('should reset stable count when clinical data changes', () => {
      const prev = baseProfile({ severity: '7/10' });
      const curr = baseProfile({ severity: '8/10' });

      calculateSaturation.call(TriageArbiter, prev, prev, 1.0);
      expect(calculateSaturation.call(TriageArbiter, curr, prev, 1.0)).toBe(false);
      expect((TriageArbiter as any).stableTurnCount).toBe(0);
    });

    it('should treat non-numeric field changes as unstable', () => {
      const prev = baseProfile({ duration: '2 days' });
      const curr = baseProfile({ duration: '48 hours' });

      calculateSaturation.call(TriageArbiter, prev, prev, 1.0);
      expect(calculateSaturation.call(TriageArbiter, curr, prev, 1.0)).toBe(false);
      expect((TriageArbiter as any).stableTurnCount).toBe(0);
    });
  });

  describe('multi-turn assessment scenarios', () => {
    const history: ChatHistoryItem[] = [
      { role: 'assistant', text: 'Tell me about your symptoms' },
      { role: 'user', text: 'I have pain' },
    ];

    it('should terminate after two stable semantic turns at readiness 1.0', () => {
      const profile1 = baseProfile({ severity: '7/10', age: '45' });
      const result1 = TriageArbiter.evaluateAssessmentState(history, profile1, 1, 5, []);
      expect(result1.signal).toBe('CONTINUE');

      const profile2 = baseProfile({ severity: "it's a 7", age: '45' });
      const result2 = TriageArbiter.evaluateAssessmentState(history, profile2, 2, 5, [], profile1);
      expect(result2.signal).toBe('CONTINUE');

      const profile3 = baseProfile({ severity: 'seven out of ten', age: '45' });
      const result3 = TriageArbiter.evaluateAssessmentState(history, profile3, 3, 5, [], profile2);
      expect(result3.signal).toBe('TERMINATE');
      expect(result3.reason).toContain('CLINICAL SATURATION');
    });

    it('should avoid termination when a non-numeric field changes', () => {
      const profile1 = baseProfile({ severity: '7/10', duration: '2 days' });
      const result1 = TriageArbiter.evaluateAssessmentState(history, profile1, 1, 5, []);
      expect(result1.signal).toBe('CONTINUE');

      const profile2 = baseProfile({ severity: "it's a 7", duration: '2 days' });
      const result2 = TriageArbiter.evaluateAssessmentState(history, profile2, 2, 5, [], profile1);
      expect(result2.signal).toBe('CONTINUE');

      const profile3 = baseProfile({ severity: 'seven', duration: '48 hours' });
      const result3 = TriageArbiter.evaluateAssessmentState(history, profile3, 3, 5, [], profile2);
      expect(result3.signal).toBe('CONTINUE');
    });
  });

  describe('evaluateAssessmentState branch coverage', () => {
    it('should proceed when clarification attempts are exhausted', () => {
      const profile = baseProfile({
        denial_confidence: 'low',
        triage_readiness_score: 0.95,
      });

      const result = TriageArbiter.evaluateAssessmentState(
        [{ role: 'user', text: 'I feel fine' }],
        profile,
        1,
        5,
        [],
        undefined,
        2,
      );

      expect(result.signal).toBe('CONTINUE');
    });

    it('should block termination when tier 3 questions remain for complex cases', () => {
      const profile = baseProfile({
        symptom_category: 'complex',
        triage_readiness_score: 1.0,
      });

      const result = TriageArbiter.evaluateAssessmentState(
        [{ role: 'user', text: 'I have pain' }],
        profile,
        7,
        10,
        [{ tier: 3 }],
      );

      expect(result.signal).toBe('CONTINUE');
      expect(result.reason).toContain('DEPTH FAIL');
    });

    it('should request clarification on false-positive completeness with inconsistency', () => {
      const profile = baseProfile({
        triage_readiness_score: 1.0,
        internal_inconsistency_detected: true,
      });

      const result = TriageArbiter.evaluateAssessmentState(
        [{ role: 'user', text: 'I have pain' }],
        profile,
        4,
        10,
        [],
      );

      expect(result.signal).toBe('REQUIRE_CLARIFICATION');
      expect(result.reason).toContain('False Positive Completeness');
    });

    it('should continue when complete but not exhausted', () => {
      const profile = baseProfile({
        triage_readiness_score: 1.0,
      });

      const result = TriageArbiter.evaluateAssessmentState(
        [{ role: 'user', text: 'I have pain' }],
        profile,
        4,
        10,
        [],
      );

      expect(result.signal).toBe('CONTINUE');
      expect(result.reason).toContain('Continuing planned path');
    });
  });

  describe('evaluateDataCompleteness coverage', () => {
    it('should report missing red flag assessment when red_flag_denials is empty', () => {
      const profile = baseProfile({
        red_flag_denials: null,
        triage_readiness_score: 1.0,
      });

      const result = TriageArbiter.evaluateAssessmentState(
        [{ role: 'user', text: 'I have pain' }],
        profile,
        4,
        10,
        [],
      );

      expect(result.signal).toBe('CONTINUE');
      expect(result.reason).toContain('Red Flag Assessment');
    });

    it('should block termination when red flags are not resolved', () => {
      const profile = baseProfile({
        red_flags_resolved: false,
        triage_readiness_score: 1.0,
      });

      const evaluateDataCompleteness = (TriageArbiter as any).evaluateDataCompleteness as (
        profile: AssessmentProfile,
      ) => { signal: string; reason?: string };
      const result = evaluateDataCompleteness.call(TriageArbiter, profile);

      expect(result.signal).toBe('CONTINUE');
      expect(result.reason).toContain('SAFETY FLOOR VIOLATION');
    });
  });
});
