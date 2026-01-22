import { calculateTriageScore, checkCriticalSystemKeywords } from '../src/utils/aiUtils';

describe('System-Based Lock (SBL) Integrity', () => {
  describe('checkCriticalSystemKeywords', () => {
    test('detects Cardiac keywords and returns critical', () => {
      expect(checkCriticalSystemKeywords('I have chest pain')).toBe('critical');
      expect(checkCriticalSystemKeywords('my left arm hurts and I feel squeezing in my chest')).toBe('critical');
    });

    test('detects Respiratory keywords and returns critical', () => {
      expect(checkCriticalSystemKeywords('shortness of breath')).toBe('critical');
      expect(checkCriticalSystemKeywords('I am wheezing and choking')).toBe('critical');
    });

    test('detects Neurological keywords and returns critical', () => {
      expect(checkCriticalSystemKeywords('slurred speech and facial drooping')).toBe('critical');
      expect(checkCriticalSystemKeywords('worst headache of my life')).toBe('critical');
    });

    test('detects Acute Abdomen keywords and returns complex', () => {
      expect(checkCriticalSystemKeywords('severe stomach pain')).toBe('complex');
      expect(checkCriticalSystemKeywords('rigid abdomen')).toBe('complex');
    });

    test('is case-insensitive', () => {
      expect(checkCriticalSystemKeywords('CHEST PAIN')).toBe('critical');
      expect(checkCriticalSystemKeywords('Severe Stomach Pain')).toBe('complex');
    });

    test('handles no keywords', () => {
      expect(checkCriticalSystemKeywords('I have a mild fever')).toBe(null);
      expect(checkCriticalSystemKeywords('')).toBe(null);
    });

    test('highest priority wins (critical over complex)', () => {
      // Cardiac (critical) + Abdomen (complex) -> critical
      expect(checkCriticalSystemKeywords('chest pain and stomach pain')).toBe('critical');
    });
  });

  describe('calculateTriageScore integration', () => {
    const completeSlots = {
      age: '30',
      duration: '1 day',
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
      turn_count: 5,
    };

    test('escalates simple -> critical when keywords are present', () => {
      const { escalated_category, score } = calculateTriageScore({
        ...completeSlots,
        symptom_category: 'simple',
        symptom_text: 'I have some chest pressure',
      });

      expect(escalated_category).toBe('critical');
      // Score should still be high because slots are complete, 
      // but category change affects turn floors in Arbiter.
      expect(score).toBe(1.0);
    });

    test('escalates simple -> complex when keywords are present', () => {
      const { escalated_category } = calculateTriageScore({
        ...completeSlots,
        symptom_category: 'simple',
        symptom_text: 'intense belly pain',
      });

      expect(escalated_category).toBe('complex');
    });

    test('re-applies turn count penalty after escalation to complex', () => {
      const { score } = calculateTriageScore({
        ...completeSlots,
        symptom_category: 'simple',
        symptom_text: 'severe stomach pain',
        turn_count: 3, // < 7
      });

      // Complex category with turn_count < 7 is capped at 0.85
      expect(score).toBeLessThanOrEqual(0.85);
    });

    test('does NOT downgrade category', () => {
      const { escalated_category } = calculateTriageScore({
        ...completeSlots,
        symptom_category: 'critical',
        symptom_text: 'severe stomach pain', // keywords are for 'complex'
      });

      expect(escalated_category).toBe('critical'); // Retains critical
    });

    test('handles missing symptom_text gracefully', () => {
      const { escalated_category } = calculateTriageScore({
        ...completeSlots,
        symptom_category: 'simple',
      });

      expect(escalated_category).toBe('simple');
    });
  });
});
