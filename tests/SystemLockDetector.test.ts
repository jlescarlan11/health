import { SystemLockDetector } from '../src/services/base/SystemLockDetector';
import { AssessmentProfile } from '../src/types/triage';

describe('SystemLockDetector', () => {
  let detector: SystemLockDetector;

  beforeEach(() => {
    detector = new SystemLockDetector();
  });

  describe('detectSystemLock', () => {
    it('should detect cardiac keywords and return critical escalation', () => {
      const text = 'I am having some chest pain and it spreads to my left arm.';
      const result = detector.detectSystemLock(text);
      expect(result.escalationCategory).toBe('critical');
      expect(result.affectedSystems).toContain('Cardiac');
    });

    it('should detect respiratory keywords and return critical escalation', () => {
      const text = 'I am struggling to breathe and gasping for air.';
      const result = detector.detectSystemLock(text);
      expect(result.escalationCategory).toBe('critical');
      expect(result.affectedSystems).toContain('Respiratory');
    });

    it('should detect neurological keywords and return critical escalation', () => {
      const text = 'My face is drooping and I have slurred speech.';
      const result = detector.detectSystemLock(text);
      expect(result.escalationCategory).toBe('critical');
      expect(result.affectedSystems).toContain('Neurological');
    });

    it('should detect acute abdomen keywords and return complex escalation', () => {
      const text = 'I have severe stomach pain and my belly is rigid.';
      const result = detector.detectSystemLock(text);
      expect(result.escalationCategory).toBe('complex');
      expect(result.affectedSystems).toContain('Acute Abdomen');
    });

    it('should respect negation', () => {
      const text = 'I have a cough but no chest pain.';
      const result = detector.detectSystemLock(text);
      // "chest pain" is negated, so it shouldn't trigger Cardiac lock
      expect(result.affectedSystems).not.toContain('Cardiac');
      expect(result.escalationCategory).toBeNull();
    });

    it('should handle fuzzy matches', () => {
      const text = 'I have chezt pain.'; // Typo
      const result = detector.detectSystemLock(text);
      expect(result.affectedSystems).toContain('Cardiac');
      expect(result.escalationCategory).toBe('critical');
    });
  });

  describe('applySystemOverrides', () => {
    it('should upgrade simple category to critical for cardiac symptoms', () => {
      const profile: AssessmentProfile = {
        age: '45',
        duration: '1 hour',
        severity: '8/10',
        progression: 'worsening',
        red_flag_denials: null,
        summary: 'Patient reports chest pain',
        symptom_category: 'simple',
      };
      const conversation = 'USER: I have crushing chest pain.';

      const updated = SystemLockDetector.applySystemOverrides(profile, conversation);

      expect(updated.symptom_category).toBe('critical');
      expect(updated.is_complex_case).toBe(true);
      expect(updated.affected_systems).toContain('Cardiac');
    });

    it('should not downgrade category', () => {
      const profile: AssessmentProfile = {
        age: '45',
        duration: '1 hour',
        severity: '8/10',
        progression: 'worsening',
        red_flag_denials: null,
        summary: 'Critical trauma',
        symptom_category: 'critical',
      };
      const conversation = 'USER: I have severe stomach pain.'; // complex lock

      const updated = SystemLockDetector.applySystemOverrides(profile, conversation);

      expect(updated.symptom_category).toBe('critical'); // Remains critical
      expect(updated.affected_systems).toContain('Acute Abdomen');
    });
  });
});
