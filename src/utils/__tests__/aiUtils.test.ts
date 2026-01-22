import { calculateTriageScore } from '../aiUtils';

describe('calculateTriageScore', () => {
  test('should return 1.0 for complete slots', () => {
    const { score } = calculateTriageScore({
      age: '30',
      duration: '1 day',
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
    });
    expect(score).toBe(1.0);
  });

  test('should apply major block when uncertainty is NOT accepted (current behavior)', () => {
    const { score } = calculateTriageScore({
      age: null, // 1 null
      duration: '1 day',
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
      uncertainty_accepted: false,
    });
    // score = 0.80 - (1 * 0.10) = 0.70
    expect(score).toBeCloseTo(0.7);
  });

  test('should apply minor penalty when uncertainty IS accepted (new behavior)', () => {
    const { score } = calculateTriageScore({
      age: null, // 1 null
      duration: '1 day',
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
      uncertainty_accepted: true,
    });
    // score = 1.0 - 0.05 (penalty) - (1 * 0.05) = 0.90
    expect(score).toBeCloseTo(0.9);
  });

  test('should handle multiple missing slots with uncertainty accepted', () => {
    const { score } = calculateTriageScore({
      age: null,
      duration: null,
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
      uncertainty_accepted: true,
    });
    // score = 1.0 - 0.05 (penalty) - (2 * 0.05) = 0.85
    expect(score).toBeCloseTo(0.85);
  });

  test('should respect safety floor for red flags', () => {
    const { score } = calculateTriageScore({
      age: '30',
      duration: '1 day',
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: false,
    });
    expect(score).toBeLessThanOrEqual(0.4);
  });

  test('should escalate category based on critical system keywords', () => {
    const { escalated_category } = calculateTriageScore({
      age: '30',
      duration: '1 day',
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
      symptom_category: 'simple',
      symptom_text: 'I have some chest pain',
    });
    expect(escalated_category).toBe('critical');
  });

  test('should escalate to complex for acute abdomen keywords', () => {
    const { escalated_category } = calculateTriageScore({
      age: '30',
      duration: '1 day',
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
      symptom_category: 'simple',
      symptom_text: 'I have severe stomach pain',
    });
    expect(escalated_category).toBe('complex');
  });

  test('should escalate to critical for trauma keywords', () => {
    const { escalated_category } = calculateTriageScore({
      age: '30',
      duration: '1 day',
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
      symptom_category: 'simple',
      symptom_text: 'Patient reports a gunshot wound to the leg',
    });
    expect(escalated_category).toBe('critical');
  });
});
