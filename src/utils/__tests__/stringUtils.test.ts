import {
  getLevenshteinDistance,
  findAllFuzzyMatches,
  FUZZY_THRESHOLD,
  normalizeNumericValue,
} from '../stringUtils';

describe('stringUtils', () => {
  describe('getLevenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(getLevenshteinDistance('kitten', 'kitten')).toBe(0);
      expect(getLevenshteinDistance('', '')).toBe(0);
    });

    it('should return the length of the other string when one is empty', () => {
      expect(getLevenshteinDistance('kitten', '')).toBe(6);
      expect(getLevenshteinDistance('', 'sitting')).toBe(7);
    });

    it('should calculate distance correctly for simple substitutions', () => {
      expect(getLevenshteinDistance('kitten', 'sitten')).toBe(1);
    });

    it('should calculate distance correctly for simple insertions', () => {
      expect(getLevenshteinDistance('kit', 'kitten')).toBe(3);
    });

    it('should calculate distance correctly for simple deletions', () => {
      expect(getLevenshteinDistance('kitten', 'kit')).toBe(3);
    });

    it('should calculate distance correctly for complex changes', () => {
      // kitten -> sitting
      // 1. k -> s (sitten)
      // 2. e -> i (sittin)
      // 3. (add) g (sitting)
      expect(getLevenshteinDistance('kitten', 'sitting')).toBe(3);

      // intention -> execution
      expect(getLevenshteinDistance('intention', 'execution')).toBe(5);
    });

    it('should be case sensitive', () => {
      expect(getLevenshteinDistance('Kitten', 'kitten')).toBe(1);
    });
  });

  describe('findAllFuzzyMatches', () => {
    const keywords = ['suicide', 'heart attack', 'chest pain', 'unconscious'];

    it('should return empty array for empty input', () => {
      expect(findAllFuzzyMatches('', keywords)).toEqual([]);

      expect(findAllFuzzyMatches('hello', [])).toEqual([]);
    });

    it('should find multiple exact matches', () => {
      const text = 'I have chest pain and I feel like suicide';

      const matches = findAllFuzzyMatches(text, keywords);

      expect(matches).toContain('chest pain');

      expect(matches).toContain('suicide');

      expect(matches.length).toBe(2);
    });

    it('should find both exact and fuzzy matches', () => {
      const text = 'I have chest pain and heart attak'; // typo in heart attack

      const matches = findAllFuzzyMatches(text, keywords);

      expect(matches).toContain('chest pain');

      expect(matches).toContain('heart attack');

      expect(matches.length).toBe(2);
    });

    it('should prioritize exact matches (optimization check)', () => {
      // If exact match exists, it should be found.

      // This test implicitly checks logic by ensuring correct output.

      const text = 'unconscious';

      const matches = findAllFuzzyMatches(text, keywords);

      expect(matches).toEqual(['unconscious']);
    });

    it('should handle fuzzy matches alone', () => {
      const text = 'unconsious'; // typo

      const matches = findAllFuzzyMatches(text, keywords);

      expect(matches).toEqual(['unconscious']);
    });
  });

  describe('normalizeNumericValue', () => {
    it('should normalize fraction formats', () => {
      expect(normalizeNumericValue('7/10')).toBe(7);
      expect(normalizeNumericValue('7 / 10')).toBe(7);
      expect(normalizeNumericValue('7 out of 10')).toBe(7);
      expect(normalizeNumericValue('pain is 7/10 severity')).toBe(7);
      expect(normalizeNumericValue('7.5/10')).toBe(7.5);
      expect(normalizeNumericValue('7/10 and 8/10')).toBe(7);
    });

    it('should normalize plain numbers', () => {
      expect(normalizeNumericValue('7')).toBe(7);
      expect(normalizeNumericValue('7.0')).toBe(7);
      expect(normalizeNumericValue("It's a 7")).toBe(7);
      expect(normalizeNumericValue('about 7')).toBe(7);
      expect(normalizeNumericValue('0')).toBe(0);
      expect(normalizeNumericValue('120')).toBe(120);
    });

    it('should normalize number words', () => {
      expect(normalizeNumericValue('seven')).toBe(7);
      expect(normalizeNumericValue('forty-five')).toBe(45);
      expect(normalizeNumericValue('one hundred')).toBe(100);
      expect(normalizeNumericValue('seven out of ten')).toBe(7);
      expect(normalizeNumericValue('about seven years')).toBe(7);
    });

    it('should normalize ranges using midpoint', () => {
      expect(normalizeNumericValue('5-7')).toBe(6);
      expect(normalizeNumericValue('between 5 and 7')).toBe(6);
      expect(normalizeNumericValue('from 2 to 4')).toBe(3);
      expect(normalizeNumericValue('between 2.5 and 3.5')).toBe(3);
      expect(normalizeNumericValue('5 to 7')).toBe(6);
    });

    it('should return null for non-numeric inputs', () => {
      expect(normalizeNumericValue('moderate')).toBeNull();
      expect(normalizeNumericValue('severe')).toBeNull();
      expect(normalizeNumericValue('pretty bad')).toBeNull();
      expect(normalizeNumericValue('-3')).toBeNull();
      expect(normalizeNumericValue('N/A')).toBeNull();
    });

    it('should return null for empty or invalid inputs', () => {
      expect(normalizeNumericValue('')).toBeNull();
      expect(normalizeNumericValue('   ')).toBeNull();
      expect(normalizeNumericValue(null)).toBeNull();
      expect(normalizeNumericValue(undefined)).toBeNull();
    });

    it('should prefer fraction notation over standalone numbers', () => {
      expect(normalizeNumericValue('7/10 severity 3')).toBe(7);
      expect(normalizeNumericValue('mild 8/10 then 2/10')).toBe(8);
      expect(normalizeNumericValue('7 out of 10 then 5')).toBe(7);
      expect(normalizeNumericValue('5 out of 10 then 7/10')).toBe(7);
    });

    it('should use the first standalone number when no higher-priority pattern exists', () => {
      expect(normalizeNumericValue('level 3 then 4')).toBe(3);
      expect(normalizeNumericValue('7/9 severity')).toBe(7);
      expect(normalizeNumericValue('2.75 total')).toBe(2.75);
      expect(normalizeNumericValue('1000000 cases')).toBe(1000000);
    });
  });
});
