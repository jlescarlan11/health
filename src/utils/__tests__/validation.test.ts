import { normalizeFacilitiesApiResponse } from '../validation';

describe('normalizeFacilitiesApiResponse', () => {
  it('normalizes schedule arrays and coerces scalar types', () => {
    const input = [
      {
        id: '1',
        name: 'Facility A',
        type: 'clinic',
        services: ['Emergency', 123],
        address: 'Somewhere',
        latitude: '14.1234',
        longitude: 121.9876,
        yakapAccredited: 1,
        is_24_7: false,
        operatingHours: {
          is24x7: false,
          schedule: [
            { open: '8:0', close: '17:00' },
            null,
            { open: '08:00', close: '17:00' },
            { open: '08:00', close: '17:00' },
            { open: '08:00', close: '17:00' },
            { open: '08:00', close: '17:00' },
            { open: '08:00', close: '17:00' },
          ],
        },
      },
    ];

    const normalized = normalizeFacilitiesApiResponse(input);
    expect(Array.isArray(normalized.data)).toBe(true);
    expect(normalized.facilities).toHaveLength(1);
    expect(normalized.rejectedCount).toBe(0);

    const facility = normalized.facilities[0];
    expect(facility.latitude).toBeCloseTo(14.1234);
    expect(facility.yakapAccredited).toBe(true);
    expect(facility.operatingHours?.schedule?.[0]).toEqual({ open: '08:00', close: '17:00' });
  });

  it('omits malformed schedule and avoids throwing', () => {
    const input = [
      {
        id: '1',
        name: 'Facility A',
        type: 'clinic',
        services: [],
        address: 'Somewhere',
        latitude: 10,
        longitude: 20,
        yakapAccredited: false,
        operatingHours: {
          is24x7: false,
          schedule: 'not-an-object-or-array',
          open: 800,
          close: null,
        },
      },
    ];

    const normalized = normalizeFacilitiesApiResponse(input);
    expect(normalized.facilities).toHaveLength(1);
    expect(normalized.facilities[0].operatingHours?.schedule).toBeUndefined();
  });

  it('drops records missing required fields', () => {
    const input = [
      { id: 'ok', name: 'OK', latitude: 1, longitude: 2 },
      { id: '', name: 'Missing Id', latitude: 1, longitude: 2 },
      { id: 'bad-coords', name: 'Bad', latitude: 'x', longitude: 2 },
    ];

    const normalized = normalizeFacilitiesApiResponse(input);
    expect(normalized.facilities).toHaveLength(1);
    expect(normalized.rejectedCount).toBe(2);
  });
});

