import { formatProfileForAI, calculateAgeFromDob } from '../src/utils/clinicalUtils';
import type { HealthProfile } from '../src/types';

describe('formatProfileForAI', () => {
  const mockProfile: HealthProfile = {
    fullName: 'Juan Dela Cruz',
    dob: '1990-05-15',
    bloodType: 'O+',
    chronicConditions: ['Hypertension', 'Diabetes'],
    allergies: ['Peanuts', 'Penicillin'],
    currentMedications: ['Metformin', 'Amlodipine'],
    surgicalHistory: 'Appendectomy (2015)',
    familyHistory: 'Heart disease in father',
  };

  it('should format a full profile correctly', () => {
    // Mock today's date for consistent age calculation
    jest.useFakeTimers().setSystemTime(new Date('2026-01-27'));
    
    const result = formatProfileForAI(mockProfile);
    expect(result).toContain('USER HEALTH PROFILE:');
    expect(result).toContain('- Age: 35 (DOB: 1990-05-15)');
    expect(result).toContain('- Blood Type: O+');
    expect(result).toContain('- Chronic Conditions: Diabetes, Hypertension');
    expect(result).toContain('- Allergies: Peanuts, Penicillin');
    expect(result).toContain('- Medications: Amlodipine, Metformin');
    expect(result).toContain('- Surgical History: Appendectomy (2015)');
    expect(result).toContain('- Family History: Heart disease in father');

    jest.useRealTimers();
  });

  it('should omit empty or undefined fields', () => {
    const partialProfile: HealthProfile = {
      dob: '1990-05-15',
      chronicConditions: [],
      allergies: ['Pollen'],
    };

    const result = formatProfileForAI(partialProfile);
    expect(result).toContain('- Age:');
    expect(result).toContain('- Allergies: Pollen');
    expect(result).not.toContain('Blood Type');
    expect(result).not.toContain('Chronic Conditions');
    expect(result).not.toContain('Medications');
    expect(result).not.toContain('Surgical History');
    expect(result).not.toContain('Family History');
  });

  it('should return an empty string for null or empty profile', () => {
    expect(formatProfileForAI(null)).toBe('');
    expect(formatProfileForAI({})).toBe('');
  });

  it('should have deterministic ordering for list fields', () => {
    const profile: HealthProfile = {
      chronicConditions: ['Z', 'A', 'M'],
    };
    const result = formatProfileForAI(profile);
    expect(result).toContain('A, M, Z');
  });
});

describe('calculateAgeFromDob', () => {
  it('should calculate age correctly', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-27'));
    expect(calculateAgeFromDob('1990-01-27')).toBe(36);
    expect(calculateAgeFromDob('1990-01-28')).toBe(35);
    expect(calculateAgeFromDob('2000-05-20')).toBe(25);
    jest.useRealTimers();
  });

  it('should return null for invalid dates', () => {
    expect(calculateAgeFromDob('invalid')).toBeNull();
    expect(calculateAgeFromDob('')).toBeNull();
  });
});
