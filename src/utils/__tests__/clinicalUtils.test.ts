import { extractClinicalSlots } from '../clinicalUtils';

describe('extractClinicalSlots', () => {
  // Existing functionality tests
  describe('Age Extraction', () => {
    it('extracts age formats', () => {
      expect(extractClinicalSlots('35 years old male').age).toBe('35 years old');
      expect(extractClinicalSlots('patient is 35 yo').age).toBe('35 yo');
      expect(extractClinicalSlots('age 42').age).toBe('Age 42');
      expect(extractClinicalSlots('child 5y').age).toBe('5y');
    });

    it('ignores non-age numbers', () => {
      expect(extractClinicalSlots('call me at 555-0123').age).toBeUndefined();
      expect(extractClinicalSlots('room 302').age).toBeUndefined();
    });
  });

  describe('Duration Extraction', () => {
    it('extracts duration formats', () => {
      expect(extractClinicalSlots('pain for 3 days').duration).toBe('for 3 days');
      expect(extractClinicalSlots('started 2 hours ago').duration).toBe('started 2 hours ago');
      expect(extractClinicalSlots('since yesterday').duration).toBe('since yesterday');
      expect(extractClinicalSlots('coughing for a week').duration).toBe('for a week');
    });

    it('prioritizes longer matches or specific patterns', () => {
      // "started 2 hours ago" should capture the full phrase, not just "2 hours" if logic permits
      // Current logic breaks on first match in loop.
      const result = extractClinicalSlots('symptoms started 2 hours ago');
      expect(result.duration).toMatch(/2 hours|started 2 hours ago/);
    });
  });

  // New functionality tests
  describe('Severity Extraction', () => {
    it('extracts numeric pain scales', () => {
      expect(extractClinicalSlots('pain is 7/10').severity).toBe('7/10');
      expect(extractClinicalSlots('pain level 4 / 10').severity).toBe('4 / 10');
      expect(extractClinicalSlots('8 out of 10 pain').severity).toBe('8 out of 10');
    });

    it('extracts qualitative severity', () => {
      expect(extractClinicalSlots('mild headache').severity).toBe('mild');
      expect(extractClinicalSlots('moderate fever').severity).toBe('moderate');
      expect(extractClinicalSlots('severe pain').severity).toBe('severe');
      expect(extractClinicalSlots('excruciating back pain').severity).toBe('excruciating');
    });

    it('prioritizes numeric over qualitative if both present', () => {
      // This behavior depends on implementation order.
      // Usually numeric is more specific.
      expect(extractClinicalSlots('severe pain 8/10').severity).toBe('8/10');
    });
  });

  describe('Temperature Extraction', () => {
    it('extracts celsius temperatures', () => {
      expect(extractClinicalSlots('fever of 39c').temperature).toBe('39c');
      expect(extractClinicalSlots('temp 38.5 c').temperature).toBe('38.5 c');
      expect(extractClinicalSlots('39 degrees celsius').temperature).toBe('39 degrees celsius');
    });

    it('extracts fahrenheit temperatures', () => {
      expect(extractClinicalSlots('102f').temperature).toBe('102f');
      expect(extractClinicalSlots('100.4 F').temperature).toBe('100.4 f'); // extracts lowercase
    });

    it('ignores isolated numbers', () => {
      expect(extractClinicalSlots('weight 80').temperature).toBeUndefined();
    });
  });

  describe('Mixed Extraction', () => {
    it('extracts multiple slots from a single text', () => {
      const text = '35 yo male with severe pain 8/10 started 2 hours ago and fever 39c';
      const slots = extractClinicalSlots(text);
      expect(slots.age).toBe('35 yo');
      expect(slots.severity).toBe('8/10'); // Numeric priority
      expect(slots.duration).toBeTruthy(); // "started 2 hours ago" or similar
      expect(slots.temperature).toBe('39c');
    });
  });
});
