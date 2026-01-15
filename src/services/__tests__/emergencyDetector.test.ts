import { detectEmergency, tokenizeSentences } from '../emergencyDetector';

describe('tokenizeSentences', () => {
  it('should split by period, comma, question mark, and exclamation point', () => {
    const text = 'Help! I have chest pain. Can you help me, please?';
    const tokens = tokenizeSentences(text);
    expect(tokens).toEqual([
      'Help',
      'I have chest pain',
      'Can you help me',
      'please',
    ]);
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

describe('detectEmergency', () => {
  it('should detect high severity emergency keywords', () => {
    const result = detectEmergency('I have severe chest pain');
    expect(result.isEmergency).toBe(true);
    expect(result.score).toBe(10);
    expect(result.matchedKeywords).toContain('chest pain');
    expect(result.overrideResponse).toBeDefined();
    expect(result.overrideResponse?.recommended_level).toBe('emergency');
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
});
