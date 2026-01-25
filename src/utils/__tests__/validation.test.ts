import { normalizeFacilitiesApiResponse, normalizeMedication } from '../validation';

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

describe('normalizeMedication', () => {
  it('validates and normalizes valid medication data', () => {
    const input = {
      id: 'med-123',
      name: 'Paracetamol',
      dosage: '500mg',
      scheduled_time: '08:00',
      is_active: true,
      days_of_week: ['Monday', 'Wednesday'],
    };

    const result = normalizeMedication(input);
    expect(result).toEqual({
      id: 'med-123',
      name: 'Paracetamol',
      dosage: '500mg',
      scheduled_time: '08:00',
      is_active: true,
      days_of_week: ['Monday', 'Wednesday'],
    });
  });

  it('handles optional fields and scalar coercion', () => {
    const input = {
      id: 123, // should coerce to string '123'
      name: '  Aspirin  ', // should trim
      is_active: 'false', // should coerce to boolean false
      scheduled_time: ' 9:30 ', // should normalize to 09:30
    };

    const result = normalizeMedication(input);
    expect(result).toEqual({
      id: '123',
      name: 'Aspirin',
      dosage: '',
      scheduled_time: '09:30',
      is_active: false,
      days_of_week: [],
    });
  });

  it('returns null for missing required fields (id, name)', () => {
    expect(normalizeMedication({ name: 'No ID' })).toBeNull();
    expect(normalizeMedication({ id: 'No Name' })).toBeNull();
  });
});
