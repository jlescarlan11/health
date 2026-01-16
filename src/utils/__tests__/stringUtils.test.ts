import { getLevenshteinDistance } from '../stringUtils';

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
      // 1. remove i (ntention)
      // 2. n -> e (etention)
      // 3. t -> x (exention)
      // 4. n -> c (execntion)
      // 5. (add) u (execution)
      // Wait, let's check standard example: intention to execution is 5
      expect(getLevenshteinDistance('intention', 'execution')).toBe(5);
    });

    it('should be case sensitive', () => {
      expect(getLevenshteinDistance('Kitten', 'kitten')).toBe(1);
    });
  });
});
