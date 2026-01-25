import facilitiesReducer, { fetchFacilities, setFilters } from '../facilitiesSlice';
import type { Facility } from '../../types';

const buildFacility = (overrides: Partial<Facility>): Facility => ({
  id: 'facility-id',
  name: 'Facility Name',
  type: 'health_center',
  services: [],
  address: 'Facility Address',
  latitude: 0,
  longitude: 0,
  yakapAccredited: false,
  is_24_7: true,
  distance: 1,
  ...overrides,
});

describe('facilitiesSlice searchQuery matching', () => {
  const facilities: Facility[] = [
    buildFacility({
      id: 'peds',
      name: 'Alpha Health Center',
      address: '123 Main St',
      services: ['Pediatrics'],
      distance: 1,
    }),
    buildFacility({
      id: 'adult',
      name: 'Bravo Clinic',
      address: '456 Side St',
      services: ['General Medicine'],
      distance: 2,
    }),
    buildFacility({
      id: 'emergency',
      name: 'Charlie Clinic',
      address: '789 Other St',
      services: ['Emergency'],
      distance: 3,
    }),
  ];

  const reduceWithSearchQuery = (searchQuery: string) => {
    let state = facilitiesReducer(undefined, { type: '@@INIT' });
    state = facilitiesReducer(state, setFilters({ searchQuery }));
    state = facilitiesReducer(
      state,
      fetchFacilities.fulfilled({ data: facilities }, 'request-id', undefined),
    );
    return state;
  };

  it('matches facilities by name', () => {
    const state = reduceWithSearchQuery('alpha');
    expect(state.filteredFacilities.map((f) => f.id)).toEqual(['peds']);
  });

  it('matches facilities by address', () => {
    const state = reduceWithSearchQuery('main st');
    expect(state.filteredFacilities.map((f) => f.id)).toEqual(['peds']);
  });

  it('matches facilities by services via alias resolution (baby -> Pediatrics)', () => {
    const state = reduceWithSearchQuery('baby');
    expect(state.filteredFacilities.map((f) => f.id)).toEqual(['peds']);
  });

  it('does not apply overly-broad emergency alias matching', () => {
    const state = reduceWithSearchQuery('service');
    expect(state.filteredFacilities.map((f) => f.id)).toEqual([]);
  });
});

describe('facilitiesSlice quietNow filtering', () => {
  const buildFacilityWithBusyness = (
    id: string,
    score: number,
    status: 'quiet' | 'moderate' | 'busy',
  ): Facility =>
    buildFacility({
      id,
      busyness: { score, status },
    });

  const facilities: Facility[] = [
    buildFacilityWithBusyness('quiet', 0.2, 'quiet'),
    buildFacilityWithBusyness('moderate', 0.5, 'moderate'),
    buildFacilityWithBusyness('busy', 0.8, 'busy'),
  ];

  it('filters for quiet facilities when quietNow is true', () => {
    let state = facilitiesReducer(undefined, { type: '@@INIT' });
    state = facilitiesReducer(
      state,
      fetchFacilities.fulfilled({ data: facilities }, 'request-id', undefined),
    );
    state = facilitiesReducer(state, setFilters({ quietNow: true }));
    expect(state.filteredFacilities.map((f) => f.id)).toEqual(['quiet']);
  });

  it('includes all facilities when quietNow is false', () => {
    let state = facilitiesReducer(undefined, { type: '@@INIT' });
    state = facilitiesReducer(
      state,
      fetchFacilities.fulfilled({ data: facilities }, 'request-id', undefined),
    );
    state = facilitiesReducer(state, setFilters({ quietNow: false }));
    expect(state.filteredFacilities.length).toBe(3);
  });
});

describe('facilitiesSlice telemedicine filtering', () => {
  const buildFacilityWithContacts = (id: string, contacts: any[]): Facility =>
    buildFacility({
      id,
      contacts,
    });

  const facilities: Facility[] = [
    buildFacilityWithContacts('only-phone', [{ platform: 'phone', phoneNumber: '123' }]),
    buildFacilityWithContacts('messenger', [{ platform: 'messenger', phoneNumber: '456' }]),
    buildFacilityWithContacts('viber', [{ platform: 'viber', phoneNumber: '789' }]),
    buildFacilityWithContacts('mixed', [
      { platform: 'phone', phoneNumber: '111' },
      { platform: 'messenger', phoneNumber: '222' },
    ]),
    buildFacilityWithContacts('no-contacts', []),
    buildFacilityWithContacts('undefined-contacts', undefined as any),
  ];

  it('filters for facilities with non-phone contacts when telemedicine is true', () => {
    let state = facilitiesReducer(undefined, { type: '@@INIT' });
    state = facilitiesReducer(
      state,
      fetchFacilities.fulfilled({ data: facilities }, 'request-id', undefined),
    );
    state = facilitiesReducer(state, setFilters({ telemedicine: true }));
    const resultIds = state.filteredFacilities.map((f) => f.id).sort();
    expect(resultIds).toEqual(['messenger', 'mixed', 'viber']);
  });

  it('includes all facilities when telemedicine is false', () => {
    let state = facilitiesReducer(undefined, { type: '@@INIT' });
    state = facilitiesReducer(
      state,
      fetchFacilities.fulfilled({ data: facilities }, 'request-id', undefined),
    );
    state = facilitiesReducer(state, setFilters({ telemedicine: false }));
    expect(state.filteredFacilities.length).toBe(6);
  });
});
