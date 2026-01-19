import { detectEmergency } from '../src/services/emergencyDetector';

describe('EmergencyDetector Contextual Exclusions', () => {
  test('should exclude emergency keywords when "father had" is present', () => {
    const result = detectEmergency('My father had chest pain', { isUserInput: true });
    expect(result.isEmergency).toBe(false);
    expect(result.hasExclusions).toBe(true);
    expect(result.excludedKeywords).toContain('chest pain');
  });

  test('should exclude emergency keywords when "history of" is present', () => {
    const result = detectEmergency('History of difficulty breathing', { isUserInput: true });
    expect(result.isEmergency).toBe(false);
    expect(result.hasExclusions).toBe(true);
    expect(result.excludedKeywords).toContain('difficulty breathing');
  });

  test('should exclude emergency keywords when "worried about" is present', () => {
    const result = detectEmergency('I am worried about heart attack', { isUserInput: true });
    expect(result.isEmergency).toBe(false);
    expect(result.hasExclusions).toBe(true);
    expect(result.excludedKeywords).toContain('heart attack');
  });

  test('should NOT exclude when "enableExclusions" is set to false', () => {
    const result = detectEmergency('My father had chest pain', { isUserInput: true, enableExclusions: false });
    expect(result.isEmergency).toBe(true);
    expect(result.hasExclusions).toBe(false);
  });

  test('should detect real emergency when exclusion is in another segment', () => {
    // "Father had chest pain. I am having difficulty breathing."
    // Segment 1 has exclusion. Segment 2 does not.
    const result = detectEmergency('Father had chest pain. I am having difficulty breathing.', { isUserInput: true });
    expect(result.isEmergency).toBe(true);
    expect(result.matchedKeywords).toContain('difficulty breathing');
    expect(result.excludedKeywords).toContain('chest pain');
  });
});
