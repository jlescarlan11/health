import { getOpenStatus } from '../facilityUtils';
import type { Facility } from '../../types';

const buildFacility = (overrides: Record<string, unknown> = {}): Facility =>
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

describe('getOpenStatus', () => {
  const RealDate = Date;
  const fixedNow = new RealDate(2026, 0, 23, 10, 0, 0);

  beforeEach(() => {
    global.Date = class extends RealDate {
      constructor(...args: ConstructorParameters<typeof RealDate>) {
        if (args.length > 0) {
          // @ts-expect-error - passthrough for Date overloads.
          return new RealDate(...args);
        }
        return fixedNow;
      }

      static now() {
        return fixedNow.getTime();
      }
    } as unknown as DateConstructor;
  });

  afterEach(() => {
    global.Date = RealDate;
  });

  it('returns Hours N/A when operatingHours is null and legacy hours missing', () => {
    const facility = buildFacility({ operatingHours: null, hours: undefined });
    expect(() => getOpenStatus(facility)).not.toThrow();
    expect(getOpenStatus(facility)).toEqual({ isOpen: false, text: 'Hours N/A', color: 'gray' });
  });

  it('falls back to legacy hours parsing when operatingHours is malformed', () => {
    const facility = buildFacility({
      operatingHours: 'not-an-object',
      hours: '24/7',
    });

    expect(getOpenStatus(facility)).toEqual({ isOpen: true, text: 'Open 24/7', color: '#379777' });
  });

  it('ignores malformed schedule entry and uses open/close fallback', () => {
    const dayOfWeek = new Date().getDay();
    const facility = buildFacility({
      operatingHours: {
        is24x7: false,
        schedule: {
          [dayOfWeek]: { open: 800, close: '17:00' },
        },
        open: '08:00',
        close: '17:00',
      },
    });

    expect(() => getOpenStatus(facility)).not.toThrow();
    expect(getOpenStatus(facility)).toEqual({ isOpen: true, text: 'Open Now', color: '#379777' });
  });

  it('preserves behavior for well-formed schedule', () => {
    const dayOfWeek = new Date().getDay();
    const facility = buildFacility({
      operatingHours: {
        is24x7: false,
        schedule: {
          [dayOfWeek]: { open: '08:00', close: '17:00' },
        },
      },
    });

    expect(getOpenStatus(facility)).toEqual({
      isOpen: true,
      text: 'Open until 5:00 PM',
      color: '#379777',
    });
  });
});
