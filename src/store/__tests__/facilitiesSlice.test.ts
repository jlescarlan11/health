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

