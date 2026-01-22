import { calculateTriageScore, checkCriticalSystemKeywords } from '../src/utils/aiUtils';

describe('System-Based Lock (SBL) Comprehensive Test Suite', () => {
  describe('Acceptance Criteria 1 & 4: Exact Matches & Synonyms', () => {
    test('Exact match "chest pain" forces critical', () => {
      expect(checkCriticalSystemKeywords('I have chest pain')).toBe('critical');
    });

    test('Exact match "difficulty breathing" forces critical', () => {
      expect(checkCriticalSystemKeywords('I have difficulty breathing')).toBe('critical');
    });

    test('Synonym "cant breathe" forces critical', () => {
      expect(checkCriticalSystemKeywords('Help I cant breathe')).toBe('critical');
    });

    test('Synonym "shortness of breath" forces critical', () => {
      expect(checkCriticalSystemKeywords('experiencing shortness of breath')).toBe('critical');
    });
  });

  describe('Acceptance Criteria 2: Case Variations', () => {
    test('Uppercase "CHEST PAIN" is detected', () => {
      expect(checkCriticalSystemKeywords('CHEST PAIN')).toBe('critical');
    });

    test('Mixed case "Chest Pain" is detected', () => {
      expect(checkCriticalSystemKeywords('Chest Pain')).toBe('critical');
    });
  });

  describe('Acceptance Criteria 3: Partial Phrase Matches (Filler Words)', () => {
    test('Match with filler and order variation: "pain in my chest" matches "chest pain"', () => {
      expect(checkCriticalSystemKeywords('I have pain in my chest')).toBe('critical');
    });

    test('Match with filler: "squeezing in my chest" matches "squeezing chest"', () => {
      // This SHOULD work as order is preserved.
      expect(checkCriticalSystemKeywords('I feel squeezing in my chest')).toBe('critical');
    });
  });

  describe('Acceptance Criteria 5: Highest Severity Priority', () => {
    test('Cardiac (critical) wins over Abdomen (complex)', () => {
      expect(checkCriticalSystemKeywords('chest pain and stomach pain')).toBe('critical');
    });

    test('Respiratory (critical) wins over Abdomen (complex)', () => {
      expect(checkCriticalSystemKeywords('difficulty breathing and rigid abdomen')).toBe('critical');
    });
  });

  describe('Acceptance Criteria 6: Non-triggering Similar Phrases', () => {
    test('"chest cold" does not activate lock', () => {
      expect(checkCriticalSystemKeywords('I have a chest cold')).toBe(null);
    });

    test('"mild headache" does not activate lock (regular headache is not a lock trigger)', () => {
      expect(checkCriticalSystemKeywords('I have a mild headache')).toBe(null);
    });

    test('"stomach upset" does not activate lock', () => {
      expect(checkCriticalSystemKeywords('my stomach is upset')).toBe(null);
    });
  });

  describe('Acceptance Criteria 7: Interaction with T1.1 Consensus Check', () => {
    test('"mild 2/10 chest pain" still forces critical category despite low-risk waiver qualifying text', () => {
      const slots = {
        age: null, // Would be waived
        duration: '1 day',
        severity: 'mild 2/10', // Qualifies for T1.1 waiver
        progression: null, // Would be waived
        red_flags_resolved: true,
        symptom_category: 'simple' as const,
        symptom_text: 'I have mild 2/10 chest pain',
      };

      const { score, escalated_category } = calculateTriageScore(slots);

      // Category MUST be critical
      expect(escalated_category).toBe('critical');
      // Score might be 1.0 because of the waiver, but the category change is what matters for Arbiter.
      expect(score).toBe(1.0);
    });
  });

  describe('Acceptance Criteria 8: Boundary Cases', () => {
    test('"chest tightness 1/10" is categorized as critical', () => {
      expect(checkCriticalSystemKeywords('chest tightness 1/10')).toBe('critical');
    });

    test('"head injury unconscious" is categorized as critical', () => {
      expect(checkCriticalSystemKeywords('head injury unconscious')).toBe('critical');
    });
  });

  describe('Acceptance Criteria 9: Regression (Non-critical Symptoms)', () => {
    test('"itchy eyes" remains simple', () => {
      const { escalated_category } = calculateTriageScore({
        age: '30',
        duration: '1 day',
        severity: 'mild',
        progression: 'stable',
        red_flags_resolved: true,
        symptom_category: 'simple',
        symptom_text: 'my eyes are itchy',
      });
      expect(escalated_category).toBe('simple');
    });

    test('"fever" remains simple/original category', () => {
      const { escalated_category } = calculateTriageScore({
        age: '30',
        duration: '1 day',
        severity: 'moderate',
        progression: 'stable',
        red_flags_resolved: true,
        symptom_category: 'simple',
        symptom_text: 'I have a high fever',
      });
      expect(escalated_category).toBe('simple');
    });
  });
});
