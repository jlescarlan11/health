import {
  detectHedging,
  analyzeProfileForHedging,
  applyHedgingCorrections,
  CRITICAL_HEDGING_FIELDS,
} from '../src/utils/hedgingDetector';
import { AssessmentProfile } from '../src/types/triage';

describe('Hedging Detector', () => {
  describe('detectHedging', () => {
    test('detects direct lack of knowledge', () => {
      expect(detectHedging("I don't know")).toBeTruthy();
      expect(detectHedging('Not sure about that')).toBeTruthy();
      expect(detectHedging('Unclear currently')).toBeTruthy();
      expect(detectHedging('I have no idea')).toBeTruthy();
    });

    test('detects probabilistic language', () => {
      expect(detectHedging('Maybe fever')).toBeTruthy();
      expect(detectHedging('Possibly chest pain')).toBeTruthy();
      expect(detectHedging('It probably is')).toBeTruthy();
      expect(detectHedging('Might be a cold')).toBeTruthy();
      expect(detectHedging('Could be nothing')).toBeTruthy();
    });

    test('detects subjective guessing', () => {
      expect(detectHedging('I think so')).toBeTruthy();
      expect(detectHedging('I guess it hurts')).toBeTruthy();
      expect(detectHedging('It seems fine')).toBeTruthy();
      expect(detectHedging('It appears red')).toBeTruthy();
    });

    test('detects vagueness', () => {
      expect(detectHedging('It sort of hurts')).toBeTruthy();
      expect(detectHedging('Kind of bad')).toBeTruthy();
      expect(detectHedging('Red-ish color')).toBeTruthy();
    });

    test('ignores safe inputs', () => {
      expect(detectHedging('Yes')).toBeNull();
      expect(detectHedging('No')).toBeNull();
      expect(detectHedging('Severe pain')).toBeNull();
      expect(detectHedging('3 days')).toBeNull();
      expect(detectHedging('Chest pain')).toBeNull();
      expect(detectHedging('None of the above')).toBeNull();
    });

    test('respects word boundaries (avoid false positives)', () => {
      expect(detectHedging('Mayberry')).toBeNull(); // "maybe" inside
      expect(detectHedging('Nuclear')).toBeNull(); // "unclear" inside
      expect(detectHedging('Improbable')).toBeNull(); // "probably" inside
      expect(detectHedging('Short of breath')).toBeNull(); // "sort of" check
    });

    test('is case insensitive', () => {
      expect(detectHedging('MAYBE')).toBeTruthy();
      expect(detectHedging('not SURE')).toBeTruthy();
    });
  });

  describe('analyzeProfileForHedging', () => {
    const safeProfile: AssessmentProfile = {
      age: '25',
      duration: '2 days',
      severity: 'High',
      progression: 'Worsening',
      red_flag_denials: 'None',
      summary: 'Safe case',
      triage_readiness_score: 1.0,
    };

    test('returns clean result for safe profile', () => {
      const result = analyzeProfileForHedging(safeProfile);
      expect(result.hasHedging).toBe(false);
      expect(result.isSafe).toBe(true);
      expect(Object.keys(result.hedgedFields)).toHaveLength(0);
    });

    test('flags hedging in critical fields', () => {
      const unsafeProfile = {
        ...safeProfile,
        severity: 'Maybe 8/10',
        red_flag_denials: "I don't think so",
      };
      const result = analyzeProfileForHedging(unsafeProfile);

      expect(result.hasHedging).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.hedgedFields['severity']).toBeTruthy();
      expect(result.hedgedFields['red_flag_denials']).toBeTruthy();
    });

    test('ignores hedging in non-critical fields', () => {
      const mixedProfile: AssessmentProfile = {
        ...safeProfile,
        summary: 'I think the patient is unsure.', // "think", "unsure" are hedging words
        clinical_friction_details: 'Patient seems confused', // "seems"
      };
      const result = analyzeProfileForHedging(mixedProfile);

      expect(result.hasHedging).toBe(false); // Should ignore summary/friction fields
      expect(result.isSafe).toBe(true);
    });
  });

  describe('applyHedgingCorrections', () => {
    test('updates metadata when hedging is found', () => {
      const input: AssessmentProfile = {
        age: 'Maybe 30',
        duration: '1 day',
        severity: 'Low',
        progression: 'Stable',
        red_flag_denials: 'None',
        summary: '',
      };

      const corrected = applyHedgingCorrections(input);

      expect(corrected.ambiguity_detected).toBe(true);
      expect(corrected.clinical_friction_detected).toBe(true);
      expect(corrected.clinical_friction_details).toContain('Hedging detected in: age ("Maybe")');
    });

    test('forces low confidence on red flag hedging', () => {
      const input: AssessmentProfile = {
        age: '25',
        duration: '1 day',
        severity: 'Low',
        progression: 'Stable',
        red_flag_denials: 'I guess not', // Hedging
        denial_confidence: 'high', // Wrongly set by LLM
        summary: '',
      };

      const corrected = applyHedgingCorrections(input);

      expect(corrected.ambiguity_detected).toBe(true);
      expect(corrected.denial_confidence).toBe('low'); // Forced downgrade
      expect(corrected.red_flags_resolved).toBe(false); // Forced unresolved
    });
  });
});
