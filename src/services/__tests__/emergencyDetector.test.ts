import { detectEmergency, tokenizeSentences, isNegated } from '../emergencyDetector';

describe('tokenizeSentences', () => {
  it('should split by period, comma, question mark, and exclamation point', () => {
    const text = 'Help! I have chest pain. Can you help me, please?';
    const tokens = tokenizeSentences(text);
    expect(tokens).toEqual(['Help', 'I have chest pain', 'Can you help me', 'please']);
  });

  it('should handle multiple consecutive punctuation marks', () => {
    const text = 'Emergency!!! Chest pain... help,me';
    const tokens = tokenizeSentences(text);
    expect(tokens).toEqual(['Emergency', 'Chest pain', 'help', 'me']);
  });

  it('should return empty array for empty input', () => {
    expect(tokenizeSentences('')).toEqual([]);
  });
});

describe('isNegated', () => {
  it('should detect simple negation before keyword', () => {
    expect(isNegated('I have no chest pain', 'chest pain')).toBe(true);
  });

  it('should detect negation within 3 words before', () => {
    expect(isNegated('I do not have any chest pain', 'chest pain')).toBe(true);
  });

  it('should detect negation after keyword', () => {
    expect(isNegated('Chest pain I have none', 'chest pain')).toBe(true);
  });

  it('should handle different negation keywords (never)', () => {
    expect(isNegated('I never have chest pain', 'chest pain')).toBe(true);
  });

  it('should handle contractions (dont)', () => {
    expect(isNegated("I don't have chest pain", 'chest pain')).toBe(true);
  });

  it('should handle medical negation (without, denies)', () => {
    expect(isNegated('Patient without chest pain', 'chest pain')).toBe(true);
    expect(isNegated('Patient denies chest pain', 'chest pain')).toBe(true);
  });

  it('should not detect negation if outside 3-word window', () => {
    // "No" is 4 words before "chest"
    expect(isNegated('No I really think that chest pain is bad', 'chest pain')).toBe(false);
  });

  it('should return false if keyword is not present', () => {
    expect(isNegated('I am fine', 'chest pain')).toBe(false);
  });

  it('should return false if keyword is present but not negated', () => {
    expect(isNegated('I have severe chest pain', 'chest pain')).toBe(false);
  });

  it('should detect negation in "I do not have chest pain"', () => {
    expect(isNegated('I do not have chest pain', 'chest pain')).toBe(true);
  });

  it('should detect negation in "chest pain is not present"', () => {
    expect(isNegated('chest pain is not present', 'chest pain')).toBe(true);
  });

  it('should return false if one match is negated but another is not in the same segment', () => {
    expect(isNegated('no chest pain but chest pain', 'chest pain')).toBe(false);
  });

  it('should be case insensitive and ignore punctuation', () => {
    expect(isNegated('I have NO chest pain!', 'CHEST PAIN')).toBe(true);
  });
});

describe('detectEmergency', () => {
  it('should detect high severity emergency keywords', () => {
    const result = detectEmergency('I have severe chest pain');
    expect(result.isEmergency).toBe(true);
    expect(result.score).toBe(10);
    expect(result.matchedKeywords).toContain('chest pain');
    expect(result.overrideResponse).toBeDefined();
    expect(result.overrideResponse?.recommended_level).toBe('emergency');
  });

  it('should skip emergency if negated ("no chest pain")', () => {
    const result = detectEmergency('I have no chest pain');
    expect(result.isEmergency).toBe(false);
    expect(result.matchedKeywords).not.toContain('chest pain');
  });

  it('should skip emergency if negated ("do not have chest pain")', () => {
    const result = detectEmergency('I do not have chest pain');
    expect(result.isEmergency).toBe(false);
    expect(result.matchedKeywords).not.toContain('chest pain');
  });

  it('should detect emergency if one symptom is negated but another is present', () => {
    const result = detectEmergency('I have no chest pain, but I am difficulty breathing');
    expect(result.isEmergency).toBe(true);
    expect(result.matchedKeywords).toContain('difficulty breathing');
    expect(result.matchedKeywords).not.toContain('chest pain');
  });

  it('should accurately identify non-negated symptom while excluding negated one ("I do not have chest pain, but I have a deep wound")', () => {
    const result = detectEmergency('I do not have chest pain, but I have a deep wound');
    expect(result.isEmergency).toBe(true);
    expect(result.matchedKeywords).toContain('deep wound');
    expect(result.matchedKeywords).not.toContain('chest pain');
    expect(result.score).toBe(8);
  });

  it('should detect keywords separated by punctuation', () => {
    const result = detectEmergency('Help, I have chest pain!');
    expect(result.isEmergency).toBe(true);
    expect(result.score).toBe(10);
    expect(result.matchedKeywords).toContain('chest pain');
  });

  it('should detect moderate severity emergency keywords (score > 7)', () => {
    const result = detectEmergency('I have a deep wound');
    expect(result.isEmergency).toBe(true);
    expect(result.score).toBe(8);
    expect(result.matchedKeywords).toContain('deep wound');
  });

  it('should not flag non-emergency symptoms', () => {
    const result = detectEmergency('I have a runny nose and mild headache');
    expect(result.isEmergency).toBe(false);
    expect(result.score).toBe(0);
    expect(result.matchedKeywords).toHaveLength(0);
    expect(result.overrideResponse).toBeUndefined();
  });

  it('should take the maximum score if multiple keywords are present', () => {
    // "chest pain" is 10, "deep wound" is 8
    const result = detectEmergency('I have a deep wound and chest pain');
    expect(result.isEmergency).toBe(true);
    expect(result.score).toBe(10);
    expect(result.matchedKeywords).toContain('deep wound');
    expect(result.matchedKeywords).toContain('chest pain');
  });

  it('should be case insensitive', () => {
    const result = detectEmergency('DIFFICULTY BREATHING');
    expect(result.isEmergency).toBe(true);
    expect(result.score).toBe(10);
    expect(result.matchedKeywords).toContain('difficulty breathing');
  });

  it('should handle suicide attempt keyword', () => {
    const result = detectEmergency('There was a suicide attempt');
    expect(result.isEmergency).toBe(true);
    expect(result.score).toBe(10);
    expect(result.matchedKeywords).toContain('suicide attempt');
  });

  it('should handle "feel like dying" keyword', () => {
    const result = detectEmergency('I feel like dying');
    expect(result.isEmergency).toBe(true);
    expect(result.score).toBe(10);
    expect(result.matchedKeywords).toContain('feel like dying');
  });

  describe('fuzzy matching', () => {
    it('should detect emergency with single-word typo (unconscious)', () => {
      // unconsious (missing 'c')
      const result = detectEmergency('The patient is unconsious');
      expect(result.isEmergency).toBe(true);
      expect(result.matchedKeywords).toContain('unconscious');
    });

    it('should detect emergency with multi-word typo (chest pain)', () => {
      // chesrt pain (extra 'r')
      const result = detectEmergency('I have chesrt pain');
      expect(result.isEmergency).toBe(true);
      expect(result.matchedKeywords).toContain('chest pain');
    });

    it('should detect emergency with sliding window fuzzy match', () => {
      // "difficulty breathin" (missing 'g')
      const result = detectEmergency('Having difficulty breathin right now');
      expect(result.isEmergency).toBe(true);
      expect(result.matchedKeywords).toContain('difficulty breathing');
    });

    it('should not detect emergency for very different words', () => {
      // "chest" is 5 chars, "chess" is 5 chars, distance 1.
      // But "chess" is not an emergency.
      const result = detectEmergency('I am playing chess');
      expect(result.isEmergency).toBe(false);
      expect(result.matchedKeywords).not.toContain('chest pain');
    });

    it('should detect emergency with informal language / missing chars (seizure)', () => {
      // "seizure" -> "sezure" (distance 1)
      const result = detectEmergency('He is having a sezure');
      expect(result.isEmergency).toBe(true);
      expect(result.matchedKeywords).toContain('seizure');
    });

    it('should handle longer phrase typos (shortness of breath)', () => {
      // "shortness of breth" (missing 'a')
      const result = detectEmergency('severe shortness of breth');
      expect(result.isEmergency).toBe(true);
      expect(result.matchedKeywords).toContain('shortness of breath');
    });
  });
});
