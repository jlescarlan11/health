import { getLevenshteinDistance, findFuzzyInString, findAllFuzzyMatches, FUZZY_THRESHOLD } from '../stringUtils';

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

  describe('findFuzzyInString', () => {
    const keywords = ['suicide', 'heart attack', 'chest pain'];

    it('should return null for empty input or keywords', () => {
      expect(findFuzzyInString('', keywords)).toBeNull();
      expect(findFuzzyInString('hello', [])).toBeNull();
    });

    it('should find exact matches', () => {
      expect(findFuzzyInString('I feel like suicide', keywords)).toBe('suicide');
      expect(findFuzzyInString('I have chest pain', keywords)).toBe('chest pain');
    });

    it('should find fuzzy matches for unigrams within threshold', () => {
      // suicide -> suicid (1 del), suicde (1 sub/del), etc.
      expect(findFuzzyInString('I might commit suicid', keywords)).toBe('suicide'); 
      expect(findFuzzyInString('suicde is bad', keywords)).toBe('suicide');
    });

    it('should find fuzzy matches for bigrams within threshold', () => {
      // "chest pain" -> "chest pane" (2 diff: 'i'->'e', 'n'->' ') NO wait, pain vs pane: p-a-i-n vs p-a-n-e.
      // pain (4) -> pane (4). i->n, n->e. Distance 2?
      // p=p, a=a, i!=n, n!=e.
      // dist('pain', 'pane') = 2?
      // let's check manually:
      // pain -> pan (del i) -> pane (ins e) = 2.
      // YES. threshold is 2.
      expect(findFuzzyInString('I have chest pane', keywords)).toBe('chest pain');

      // "heart attack" -> "hart attack"
      // heart -> hart (1 del)
      // dist("heart attack", "hart attack") = 1.
      expect(findFuzzyInString('My hart attack', keywords)).toBe('heart attack');
    });

    it('should handle case insensitivity and punctuation', () => {
      expect(findFuzzyInString('SUICIDE!', keywords)).toBe('suicide');
      expect(findFuzzyInString('Chest-Pain...', keywords)).toBe('chest pain');
    });

    it('should not match if distance exceeds threshold', () => {
      // suicide (7) -> su (2). Dist 5.
      expect(findFuzzyInString('su is bad', keywords)).toBeNull();
      
      // "chest pain" -> "chest X" (dist 4 for "pain" -> "X")
      expect(findFuzzyInString('chest X', keywords)).toBeNull();
    });

        it('should respect the defined FUZZY_THRESHOLD', () => {

          expect(FUZZY_THRESHOLD).toBe(2);

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

    