import { describe, expect, it } from 'vitest';
import {
  parseIsoDateString,
  calculateAge,
  formatAgeDescription,
  formatIsoDateWithAge,
} from '../dateUtils';

const reference = new Date(Date.UTC(2024, 1, 15));

describe('parseIsoDateString', () => {
  it('parses a well-formed ISO date string as UTC midnight', () => {
    const parsed = parseIsoDateString('1985-03-15');
    expect(parsed).toEqual(new Date(Date.UTC(1985, 2, 15)));
  });

  it('returns null for an invalid day', () => {
    expect(parseIsoDateString('2024-02-30')).toBeNull();
  });

  it('rejects non-ISO formats', () => {
    expect(parseIsoDateString('03/15/1985')).toBeNull();
  });
});

describe('calculateAge', () => {

  it('calculates years, months, and days relative to the reference date', () => {
    const dob = new Date(Date.UTC(2000, 0, 10));
    const age = calculateAge(dob, reference);
    expect(age.years).toBe(24);
    expect(age.months).toBe(1);
    expect(age.days).toBe(5);
  });
});

describe('format helpers', () => {
  it('formats months when years are zero', () => {
    const age = { years: 0, months: 6, days: 3 };
    expect(formatAgeDescription(age)).toBe('6 months');
  });

  it('appends the age description when formatting an ISO string', () => {
    const formatted = formatIsoDateWithAge('2024-02-15', reference);
    expect(formatted).toContain('(0 days)');
  });
});
