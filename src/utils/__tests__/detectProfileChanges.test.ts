import { detectProfileChanges } from '../clinicalUtils';
import { AssessmentProfile } from '../../types/triage';

describe('detectProfileChanges', () => {
  const baseProfile: AssessmentProfile = {
    age: null,
    duration: null,
    severity: null,
    progression: null,
    red_flag_denials: null,
    summary: '',
  };

  it('returns null if prev profile is undefined', () => {
    const next = { ...baseProfile, age: '25' };
    expect(detectProfileChanges(undefined, next)).toBeNull();
  });

  it('returns null if no meaningful changes', () => {
    const prev = { ...baseProfile, age: '25', duration: '2 days' };
    const next = { ...baseProfile, age: '25', duration: '2 days' };
    expect(detectProfileChanges(prev, next)).toBeNull();
  });

  it('ignores superficial formatting differences', () => {
    const prev = { ...baseProfile, duration: '2 days' };
    const next = { ...baseProfile, duration: '  2 Days  ' };
    expect(detectProfileChanges(prev, next)).toBeNull();
  });

  it('detects change in duration', () => {
    const prev = { ...baseProfile, duration: '2 days' };
    const next = { ...baseProfile, duration: '1 week' };
    const result = detectProfileChanges(prev, next);
    expect(result).toEqual({
      field: 'duration',
      oldValue: '2 days',
      newValue: '1 week',
    });
  });

  it('detects change in severity', () => {
    const prev = { ...baseProfile, severity: 'mild' };
    const next = { ...baseProfile, severity: 'severe' };
    const result = detectProfileChanges(prev, next);
    expect(result).toEqual({
      field: 'severity',
      oldValue: 'mild',
      newValue: 'severe',
    });
  });

  it('detects change in age', () => {
    const prev = { ...baseProfile, age: '25' };
    const next = { ...baseProfile, age: '26' };
    const result = detectProfileChanges(prev, next);
    expect(result).toEqual({
      field: 'age',
      oldValue: '25',
      newValue: '26',
    });
  });

  it('prioritizes first detected change based on check order (age, duration, severity)', () => {
    const prev = { ...baseProfile, age: '25', duration: '2 days' };
    const next = { ...baseProfile, age: '26', duration: '1 week' };
    const result = detectProfileChanges(prev, next);
    expect(result?.field).toBe('age');
  });

  it('ignores additions (null -> value) as they are not corrections', () => {
      const prev = { ...baseProfile, age: null };
      const next = { ...baseProfile, age: '25' };
      expect(detectProfileChanges(prev, next)).toBeNull();
  });
});
