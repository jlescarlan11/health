import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getFacilities } from '../services/facilityService';
import { Facility, FacilityService } from '../types';
import { calculateDistance } from '../utils/locationUtils';
import { getOpenStatus } from '../utils/facilityUtils';

interface FacilityFilters {
  type?: string;
  services?: FacilityService[];
  yakapAccredited?: boolean;
  searchQuery?: string;
  openNow?: boolean;
}

interface FacilitiesState {
  facilities: Facility[];
  filteredFacilities: Facility[];
  selectedFacilityId: string | null;
  userLocation: { latitude: number; longitude: number } | null;
  filters: FacilityFilters;
  isLoading: boolean;
  error: string | null;
}

const initialState: FacilitiesState = {
  facilities: [],
  filteredFacilities: [],
  selectedFacilityId: null,
  userLocation: null,
  filters: {},
  isLoading: false,
  error: null,
};

export const fetchFacilities = createAsyncThunk(
  'facilities/fetchFacilities',
  async () => {
    const data = await getFacilities();
    return { data };
  },
);

// Helper for consistent sorting
const sortFacilities = (a: Facility, b: Facility) => {
  const statusA = getOpenStatus(a);
  const statusB = getOpenStatus(b);

  const getRank = (color: string) => {
    if (color === '#379777' || color === 'green') return 1;
    if (color === '#F97316' || color === 'orange') return 2;
    return 3;
  };

  const rankA = getRank(statusA.color);
  const rankB = getRank(statusB.color);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  // Secondary sort: Distance
  return (a.distance || Infinity) - (b.distance || Infinity);
};

const facilitiesSlice = createSlice({
  name: 'facilities',
  initialState,
  reducers: {
    selectFacility: (state, action: PayloadAction<string | null>) => {
      state.selectedFacilityId = action.payload;
    },
    setUserLocation: (
      state,
      action: PayloadAction<{ latitude: number; longitude: number } | null>,
    ) => {
      state.userLocation = action.payload;

      if (action.payload) {
        const { latitude, longitude } = action.payload;

        const updateDistance = (f: Facility) => {
          f.distance = calculateDistance(latitude, longitude, f.latitude, f.longitude);
        };

        state.facilities.forEach(updateDistance);
        state.filteredFacilities.forEach(updateDistance);

        // Sort filtered facilities using helper
        state.filteredFacilities.sort(sortFacilities);
      }
    },
    setFilters: (state, action: PayloadAction<FacilityFilters>) => {
      state.filters = { ...(state.filters || {}), ...action.payload };
      // Apply filters logic here or in a selector/separate effect
      // For simple state management, we can re-filter here
      const { type, services, yakapAccredited, searchQuery, openNow } = state.filters || {};

      state.filteredFacilities = state.facilities.filter((facility) => {
        const matchesType = !type || facility.type === type;
        const matchesYakap =
          yakapAccredited === undefined || facility.yakapAccredited === yakapAccredited;
        const matchesSearch =
          !searchQuery ||
          facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          facility.address.toLowerCase().includes(searchQuery.toLowerCase());

        // Simple service match (has at least one of the filtered services)
        // Adjust logic as needed (e.g., must have ALL)
        const matchesServices =
          !services ||
          services.length === 0 ||
          services.some(
            (s) =>
              facility.services.includes(s) ||
              (facility.specialized_services &&
                facility.specialized_services.includes(s as string)),
          );

        const matchesOpen = !openNow || getOpenStatus(facility).isOpen;

        return matchesType && matchesYakap && matchesSearch && matchesServices && matchesOpen;
      });

      // Always apply sorting
      state.filteredFacilities.sort(sortFacilities);
    },
    clearFilters: (state) => {
      state.filters = {};
      state.filteredFacilities = state.facilities;
      // Always apply sorting
      state.filteredFacilities.sort(sortFacilities);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacilities.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFacilities.fulfilled, (state, action) => {
        state.isLoading = false;
        const { data } = action.payload;

        let newFacilities: Facility[] = [];

        if (Array.isArray(data)) {
          newFacilities = data;
        } else if (data && typeof data === 'object') {
          newFacilities = data.facilities || [];
        }

        state.facilities = newFacilities;

        // Re-apply filters on the updated list
        const { type, services, yakapAccredited, searchQuery, openNow } = state.filters || {};
        state.filteredFacilities = state.facilities.filter((facility) => {
          const matchesType = !type || facility.type === type;
          const matchesYakap =
            yakapAccredited === undefined || facility.yakapAccredited === yakapAccredited;
          const matchesSearch =
            !searchQuery ||
            facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            facility.address.toLowerCase().includes(searchQuery.toLowerCase());

          const matchesServices =
            !services ||
            services.length === 0 ||
            services.some(
              (s) =>
                facility.services.includes(s) ||
                (facility.specialized_services &&
                  facility.specialized_services.includes(s as string)),
            );

          const matchesOpen = !openNow || getOpenStatus(facility).isOpen;

          return matchesType && matchesYakap && matchesSearch && matchesServices && matchesOpen;
        });

        // Apply sorting to the freshly fetched/filtered list
        state.filteredFacilities.sort(sortFacilities);
      })
      .addCase(fetchFacilities.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch facilities';
      });
  },
});

export const { selectFacility, setFilters, clearFilters, setUserLocation } =
  facilitiesSlice.actions;
export default facilitiesSlice.reducer;
