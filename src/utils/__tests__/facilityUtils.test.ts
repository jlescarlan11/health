import { getOpenStatus, formatOperatingHours } from '../facilityUtils';
import type { Facility } from '../../types';

const buildFacility = (overrides: Record<string, any> = {}): Facility =>
  ({
    id: 'facility-id',
    name: 'Facility Name',
    type: 'clinic',
    services: [],
    address: 'Facility Address',
    latitude: 0,
    longitude: 0,
    yakapAccredited: false,
    ...(overrides as object),
  }) as unknown as Facility;

describe('facilityUtils', () => {
  const RealDate = Date;
  // Friday, Jan 23, 2026, 10:00 AM
  const fixedNow = new RealDate(2026, 0, 23, 10, 0, 0);

  beforeEach(() => {
    global.Date = class extends RealDate {
      constructor(...args: any[]) {
        if (args.length > 0) {
          // @ts-expect-error: RealDate constructor typing mismatch in mock
          return new RealDate(...args);
        }
        return fixedNow;
      }

      static now() {
        return fixedNow.getTime();
      }
    } as any;
  });

  afterEach(() => {
    global.Date = RealDate;
  });

  describe('getOpenStatus', () => {
    it('returns Hours N/A when operatingHours is null and legacy hours missing', () => {
      const facility = buildFacility({ operatingHours: null, hours: undefined });
      expect(getOpenStatus(facility)).toEqual({
        isOpen: false,
        text: 'Hours N/A',
        color: '#6B7280',
      });
    });

    it('falls back to legacy hours parsing when operatingHours is malformed', () => {
      const facility = buildFacility({
        operatingHours: 'not-an-object',
        hours: '24/7',
      });

      expect(getOpenStatus(facility)).toEqual({
        isOpen: true,
        text: 'Open 24/7',
        color: '#379777',
      });
    });

    it('returns Opens Tomorrow when currently closed and has schedule for tomorrow', () => {
      // 10:00 AM on Friday. Set schedule to open at 8:00 AM but closed today (Friday).
      const facility = buildFacility({
        operatingHours: {
          schedule: {
            5: null, // Closed Friday
            6: { open: '08:00', close: '12:00' }, // Opens Saturday
          },
        },
      });
      expect(getOpenStatus(facility).text).toBe('Closed - Opens Tomorrow at 8:00 AM');
    });

    it('returns Opens Monday when currently closed and next opening is after weekend', () => {
      // Friday. Next opening is Monday (1).
      const facility = buildFacility({
        operatingHours: {
          schedule: {
            5: null, // Closed Friday
            6: null, // Closed Saturday
            0: null, // Closed Sunday
            1: { open: '08:00', close: '17:00' }, // Opens Monday
          },
        },
      });
      expect(getOpenStatus(facility).text).toBe('Closed - Opens Monday at 8:00 AM');
    });

    it('returns Opens at [Time] when opening within 4 hours', () => {
      // Current time is 10:00 AM
      const facility = buildFacility({
        operatingHours: {
          schedule: {
            5: { open: '13:00', close: '17:00' }, // Opens at 1:00 PM (3 hours away)
          },
        },
      });
      expect(getOpenStatus(facility).text).toBe('Opens at 1:00 PM');
    });

    it('returns Closed - Opens at [Time] when opening more than 4 hours away', () => {
      // Current time is 10:00 AM
      const facility = buildFacility({
        operatingHours: {
          schedule: {
            5: { open: '15:00', close: '19:00' }, // Opens at 3:00 PM (5 hours away)
          },
        },
      });
      expect(getOpenStatus(facility).text).toBe('Closed - Opens at 3:00 PM');
    });
  });

  describe('formatOperatingHours', () => {
    it('groups consecutive days with same hours', () => {
      const facility = buildFacility({
        operatingHours: {
          schedule: {
            1: { open: '08:00', close: '17:00' },
            2: { open: '08:00', close: '17:00' },
            3: { open: '08:00', close: '17:00' },
            4: { open: '08:00', close: '17:00' },
            5: { open: '08:00', close: '17:00' },
            6: { open: '09:00', close: '12:00' },
            0: null,
          },
        },
      });
      const lines = formatOperatingHours(facility);
      expect(lines).toContain('Monday - Friday: 8:00 AM - 5:00 PM');
      expect(lines).toContain('Saturday: 9:00 AM - 12:00 PM');
      expect(lines).toContain('Sunday: Closed');
    });

    it('returns Open 24/7 for is_24_7', () => {
      const facility = buildFacility({ is_24_7: true });
      expect(formatOperatingHours(facility)).toEqual(['Open 24/7']);
    });
  });
});
