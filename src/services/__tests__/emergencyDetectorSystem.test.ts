import { detectEmergency } from '../emergencyDetector';

describe('EmergencyDetector - System Logic', () => {
  it('should detect Cardiac system', () => {
    const result = detectEmergency('chest pain', { isUserInput: true });
    expect(result.affectedSystems).toContain('Cardiac');
    expect(result.isEmergency).toBe(true);
  });

  it('should detect Respiratory system', () => {
    const result = detectEmergency('difficulty breathing', { isUserInput: true });
    expect(result.affectedSystems).toContain('Respiratory');
    expect(result.isEmergency).toBe(true);
  });

  it('should apply Cardiac + Respiratory multiplier (+3)', () => {
    // palpitations (6) + hapos (6) = 6 (max) -> but combined +3 = 9 -> Emergency
    // Wait, let's verify individual scores.
    // palpitations: 6 (Cardiac)
    // hapos: 6 (Respiratory)
    // Base max score: 6.
    // Modifier: +3.
    // Final: 9.
    const result = detectEmergency('I have palpitations and hapos', { isUserInput: true });
    expect(result.affectedSystems).toContain('Cardiac');
    expect(result.affectedSystems).toContain('Respiratory');
    expect(result.score).toBeGreaterThanOrEqual(9);
    expect(result.isEmergency).toBe(true);
  });

  it('should apply Neuro + Trauma multiplier (Force 10)', () => {
    // dizziness (5) + broken bone (8)
    // Base max score: 8.
    // Multiplier: Force 10.
    const result = detectEmergency('I felt dizziness then got a broken bone', { isUserInput: true });
    expect(result.affectedSystems).toContain('Neurological');
    expect(result.affectedSystems).toContain('Trauma');
    expect(result.score).toBe(10);
    expect(result.isEmergency).toBe(true);
  });

  it('should handle palpitations (new keyword)', () => {
    const result = detectEmergency('palpitations', { isUserInput: true });
    expect(result.matchedKeywords).toContain('palpitations');
    expect(result.affectedSystems).toContain('Cardiac');
    expect(result.score).toBe(6); // As defined
    expect(result.isEmergency).toBe(false); // 6 is < 8
  });

  it('should handle multiple systems correctly', () => {
    const result = detectEmergency('chest pain and severe bleeding', { isUserInput: true });
    // Chest pain (10 - Cardiac), Severe bleeding (10 - Trauma)
    expect(result.affectedSystems).toContain('Cardiac');
    expect(result.affectedSystems).toContain('Trauma');
    expect(result.score).toBe(10);
  });
});
