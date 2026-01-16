import { findAllFuzzyMatches, FUZZY_THRESHOLD } from '../stringUtils';

describe('String Utils - False Positives Prevention', () => {
  const EMERGENCY_KEYWORDS = ['dying', 'seizure', 'pain'];

  test('should NOT match "doing" to "dying" (false positive prevention)', () => {
    const input = 'i am doing something';
    const matches = findAllFuzzyMatches(input, EMERGENCY_KEYWORDS);
    expect(matches).not.toContain('dying');
  });

  test('should match "dying" correctly', () => {
    const input = 'i feel like dying';
    const matches = findAllFuzzyMatches(input, EMERGENCY_KEYWORDS);
    expect(matches).toContain('dying');
  });

  test('should match actual typos of "dying"', () => {
    const input = 'i feel like dyng'; // Typo (distance 1)
    const matches = findAllFuzzyMatches(input, EMERGENCY_KEYWORDS);
    expect(matches).toContain('dying');
  });

  test('should NOT match "laying" to "dying"', () => {
    const input = 'i am laying down';
    const matches = findAllFuzzyMatches(input, EMERGENCY_KEYWORDS);
    expect(matches).not.toContain('dying');
  });

  test('should NOT match "trying" to "dying"', () => {
    const input = 'i am trying hard';
    const matches = findAllFuzzyMatches(input, EMERGENCY_KEYWORDS);
    expect(matches).not.toContain('dying');
  });

  test('should match other keywords normally', () => {
    const input = 'i have pain';
    const matches = findAllFuzzyMatches(input, EMERGENCY_KEYWORDS);
    expect(matches).toContain('pain');
  });
});
