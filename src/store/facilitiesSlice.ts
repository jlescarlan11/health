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
  total: number;
  page: number;
  hasMore: boolean;
}

const initialState: FacilitiesState = {
  facilities: [],
  filteredFacilities: [],
  selectedFacilityId: null,
  userLocation: null,
  filters: {},
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  hasMore: true,
};

export const fetchFacilities = createAsyncThunk(
  'facilities/fetchFacilities',
  async (
    params: { page: number; limit?: number; refresh?: boolean } = {
      page: 1,
      limit: 20,
      refresh: true,
    },
  ) => {
    const { page, limit = 20, refresh = false } = params;
    const offset = (page - 1) * limit;
    const data = await getFacilities({ limit, offset });
    return { data, page, refresh };
  },
);

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

        // Sort filtered facilities by distance
        state.filteredFacilities.sort(
          (a, b) => (a.distance || Infinity) - (b.distance || Infinity),
        );
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

      // Re-sort if distances are available (check first item)
      if (
        state.filteredFacilities.length > 0 &&
        state.filteredFacilities[0].distance !== undefined
      ) {
        state.filteredFacilities.sort(
          (a, b) => (a.distance || Infinity) - (b.distance || Infinity),
        );
      }
    },
    clearFilters: (state) => {
      state.filters = {};
      state.filteredFacilities = state.facilities;
      // Re-sort if distances are available
      if (
        state.filteredFacilities.length > 0 &&
        state.filteredFacilities[0].distance !== undefined
      ) {
        state.filteredFacilities.sort(
          (a, b) => (a.distance || Infinity) - (b.distance || Infinity),
        );
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacilities.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFacilities.fulfilled, (state, action) => {
        state.isLoading = false;
        const { data, page, refresh } = action.payload;

        let newFacilities: Facility[] = [];
        let total = 0;

        if (Array.isArray(data)) {
          newFacilities = data;
          total = data.length; // Fallback if total not provided
        } else if (data && typeof data === 'object') {
          newFacilities = data.facilities || [];
          total = data.total || newFacilities.length;
        }

        if (refresh) {
          state.facilities = newFacilities;
        } else {
          // Append and remove duplicates
          const existingIds = new Set(state.facilities.map((f) => f.id));
          const uniqueNewFacilities = newFacilities.filter((f) => !existingIds.has(f.id));
          state.facilities = [...state.facilities, ...uniqueNewFacilities];
        }

        state.total = total;
        state.page = page;
        state.hasMore = state.facilities.length < total;

        // Re-apply filters on the updated list
        // Note: For true server-side pagination, client-side filtering might be incomplete.
        // But assuming we are pulling 'all' data via pagination or just displaying list, this is fine for now.
        // If filters are active, we might want to trigger a server-side filtered fetch instead.
        // For now, we update the client-side filtered list with what we have.
        // Copy-pasting filter logic from setFilters to ensure consistency
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

        // Re-sort if distances are available.
        // Note: New facilities won't have distance unless we recalc.
        // Ideally updateDistances should be called after fetch if location is known.
        // For now, we leave them undefined until next updateDistances call.
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
