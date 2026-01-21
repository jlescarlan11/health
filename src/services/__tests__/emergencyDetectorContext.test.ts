import { detectEmergency } from '../emergencyDetector';
import { AssessmentProfile } from '../../types/triage';

describe('detectEmergency - Context Aware', () => {
  it('should de-escalate high fever when viral indicators are present', () => {
    const profile: AssessmentProfile = {
      age: '21 years old',
      duration: 'yesterday',
      severity: 'High (39.0-39.9°C)',
      progression: 'Getting worse',
      red_flag_denials: 'None of the above',
      summary: 'Patient has high fever and a cough.',
      red_flags_resolved: true,
    };

    const text = 'I have a high fever and a cough.';
    const result = detectEmergency(text, { profile });

    expect(result.matchedKeywords).toContain('high fever');
    expect(result.isEmergency).toBe(false);
    // Base 5 - 2 (Viral) = 3
    expect(result.score).toBe(3);
    expect(result.debugLog.reasoning).toContain('Viral indicators detected (-2)');
  });

  it('should not trigger emergency for high fever with short duration and no red flags', () => {
    const profile: AssessmentProfile = {
      age: '21 years old',
      duration: 'yesterday',
      severity: 'High (39.0-39.9°C)',
      progression: 'Stable',
      red_flag_denials: 'None of the above',
      summary: 'Patient has high fever.',
      red_flags_resolved: true,
    };

    const text = 'Patient has a high fever but no critical signs.';
    const result = detectEmergency(text, { profile });

    expect(result.matchedKeywords).toContain('high fever');
    expect(result.isEmergency).toBe(false);
    expect(result.score).toBe(5); // Just the base score
  });

  it('should slightly upgrade high fever with long duration but stay non-emergency', () => {
    const profile: AssessmentProfile = {
      age: '21 years old',
      duration: '1 week',
      severity: 'High (39.0-39.9°C)',
      progression: 'Stable',
      red_flag_denials: 'None of the above',
      summary: 'Patient has persistent high fever.',
      red_flags_resolved: true,
    };

    const text = 'I have had a high fever for a week.';
    const result = detectEmergency(text, { profile });

    expect(result.matchedKeywords).toContain('high fever');
    expect(result.isEmergency).toBe(false);
    // Base 5 + 1 (Chronic) = 6
    expect(result.score).toBe(6);
    expect(result.debugLog.reasoning).toContain('Chronic duration');
  });

  it('should trigger emergency for high fever + stiff neck (multiplier/adder)', () => {
    const profile: AssessmentProfile = {
      age: '21 years old',
      duration: 'yesterday',
      severity: 'High',
      progression: 'Worsening',
      red_flag_denials: 'Stiff neck',
      summary: 'Patient has high fever and stiff neck.',
      red_flags_resolved: true,
    };

    const text = 'I have a high fever and a stiff neck.';
    const result = detectEmergency(text, { profile });

    // Base 'stiff neck' is 8.
    // Adder for 'stiff neck' is 4.
    // Max(8, 5) + 4 = 12 -> Capped at 10.
    expect(result.isEmergency).toBe(true);
    expect(result.score).toBe(10);
    expect(result.debugLog.reasoning).toContain('Danger indicator (+4): stiff neck');
  });

  it('should trigger emergency for absolute emergency keywords regardless of modifiers', () => {
    const profile: AssessmentProfile = {
      age: '65 years old',
      duration: '10 minutes',
      severity: 'Severe',
      progression: 'Acute',
      red_flag_denials: 'None',
      summary: 'Chest pain and cough.',
      red_flags_resolved: true,
    };

    const text = 'I am having severe chest pain and a cough.';
    const result = detectEmergency(text, { profile });

    expect(result.isEmergency).toBe(true);
    expect(result.score).toBe(10); // Cough de-escalation should NOT affect absolute emergencies
    expect(result.matchedKeywords).toContain('chest pain');
  });

  it('should ignore AI-generated summary content in the emergency detection', () => {
    const profile: AssessmentProfile = {
      age: '21 years old',
      duration: 'yesterday',
      severity: 'High',
      progression: 'Worsening',
      red_flag_denials: 'None',
      summary: 'The patient is experiencing a high fever.',
      red_flags_resolved: true,
    };

    // Simulate the string that caused the issue: system labels + summary
    const text = `Initial Symptom: Fever. Summary: The patient is experiencing a high fever.`;

    const result = detectEmergency(text, { profile });

    // Sanitization should have removed the summary block
    expect(result.matchedKeywords).not.toContain('high fever');
    expect(result.isEmergency).toBe(false);
  });

  it('should block emergency level even if high score is reached, if red flags are explicitly denied', () => {
    const result = detectEmergency('I have a deep wound', {
      isUserInput: true,
      profile: {
        red_flags_resolved: true,
        red_flag_denials: 'No, I do not have any other symptoms', // Explicit denial
        symptom_category: 'complex',
      },
    });

    expect(result.isEmergency).toBe(false);
    expect(result.score).toBe(7); // Capped
    expect(result.debugLog.reasoning).toContain('Authority block');
  });
});
