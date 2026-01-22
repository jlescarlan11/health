import { normalizeSlot, calculateTriageScore } from '../aiUtils';

describe('normalizeSlot', () => {
  test('returns null for actual null or undefined', () => {
    expect(normalizeSlot(null)).toBeNull();
    expect(normalizeSlot(undefined)).toBeNull();
  });

  test('returns null for empty or whitespace-only strings', () => {
    expect(normalizeSlot('')).toBeNull();
    expect(normalizeSlot('   ')).toBeNull();
    expect(normalizeSlot('\t\n')).toBeNull();
  });

  test('returns null for explicit null indicators (case-insensitive)', () => {
    const indicators = ['null', 'n/a', 'none', 'unknown', 'not mentioned', 'unsure'];
    indicators.forEach((ind) => {
      expect(normalizeSlot(ind)).toBeNull();
      expect(normalizeSlot(ind.toUpperCase())).toBeNull();
      expect(normalizeSlot(`  ${ind}  `)).toBeNull();
    });
  });

  test('returns original string for valid values', () => {
    expect(normalizeSlot('35 years old')).toBe('35 years old');
    expect(normalizeSlot('mild')).toBe('mild');
    expect(normalizeSlot('stable')).toBe('stable');
    expect(normalizeSlot('No significant changes')).toBe('No significant changes');
  });

  test('returns original string if it contains null indicator but is not exactly it', () => {
    // These should NOT be normalized to null because they contain meaningful context
    expect(normalizeSlot('unknown cause')).toBe('unknown cause');
    expect(normalizeSlot('not mentioned explicitly')).toBe('not mentioned explicitly');
    expect(normalizeSlot('unsure about duration')).toBe('unsure about duration');
  });

  test('respects allowNone option', () => {
    // Default behavior
    expect(normalizeSlot('none')).toBeNull();
    
    // With option
    expect(normalizeSlot('none', { allowNone: true })).toBe('none');
    expect(normalizeSlot('NONE', { allowNone: true })).toBe('NONE'); // Case preservation? Function returns original value if not normalized.
    
    // Other indicators should still be null
    expect(normalizeSlot('null', { allowNone: true })).toBeNull();
    expect(normalizeSlot('n/a', { allowNone: true })).toBeNull();
  });
});

describe('calculateTriageScore with dirty slots', () => {
  test('treats "null" string as missing slot', () => {
    const { score } = calculateTriageScore({
      age: 'null',
      duration: '1 day',
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
      uncertainty_accepted: false,
    });
    // Should be treated as 1 missing slot
    // score = 0.80 - (1 * 0.10) = 0.70
    expect(score).toBeCloseTo(0.7);
  });

  test('treats "Unknown" string as missing slot', () => {
    const { score } = calculateTriageScore({
      age: '30',
      duration: 'Unknown',
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
      uncertainty_accepted: false,
    });
    // Should be treated as 1 missing slot
    // score = 0.80 - (1 * 0.10) = 0.70
    expect(score).toBeCloseTo(0.7);
  });

  test('treats "N/A" string as missing slot', () => {
    const { score } = calculateTriageScore({
      age: '30',
      duration: '1 day',
      severity: 'N/A',
      progression: 'stable',
      red_flags_resolved: true,
      uncertainty_accepted: false,
    });
    // Should be treated as 1 missing slot
    // score = 0.80 - (1 * 0.10) = 0.70
    expect(score).toBeCloseTo(0.7);
  });

  test('treats valid but similar strings as present', () => {
    const { score } = calculateTriageScore({
      age: '30',
      duration: 'unknown duration', // Not exactly "unknown", so it counts as present
      severity: 'mild',
      progression: 'stable',
      red_flags_resolved: true,
      uncertainty_accepted: false,
    });
    // All slots present
    expect(score).toBe(1.0);
  });
});
