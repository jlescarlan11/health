import { getLevenshteinDistance, findAllFuzzyMatches, FUZZY_THRESHOLD } from '../stringUtils';

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

    });

    