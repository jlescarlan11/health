import { findAllFuzzyMatches } from '../src/utils/stringUtils';

describe('False Positive Regression Tests', () => {
  test('should not match "coming" to "choking"', () => {
    const input = "I woke up with a lot of blood coming out from me";
    const keywords = ['choking'];
    const matches = findAllFuzzyMatches(input, keywords);
    expect(matches).not.toContain('choking');
  });

  test('should not match "dug" to "dugi"', () => {
     // This is an existing false positive, ensuring it works
     const input = "I dug a hole";
     const keywords = ['dugi'];
     const matches = findAllFuzzyMatches(input, keywords);
     expect(matches).not.toContain('dugi');
  });

  test('should not match "cooking" to "choking" (Safety Blocklist)', () => {
    const input = "I am cooking dinner for my family";
    const keywords = ['choking'];
    const matches = findAllFuzzyMatches(input, keywords);
    expect(matches).not.toContain('choking');
  });

  test('should still match "chking" to "choking" (Fuzzy Safety Net)', () => {
    const input = "Help I am chking on food";
    const keywords = ['choking'];
    const matches = findAllFuzzyMatches(input, keywords);
    expect(matches).toContain('choking');
  });
});