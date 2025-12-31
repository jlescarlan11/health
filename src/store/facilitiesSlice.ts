import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getFacilities } from '../services/facilityService';

// Re-using the Facility interface from the service or defining it here if not exported
interface Facility {
  id: string;
  name: string;
  type: string;
  services: string[];
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  yakapAccredited: boolean;
  hours?: string;
  photoUrl?: string;
}

interface FacilityFilters {
  type?: string;
  services?: string[];
  yakapAccredited?: boolean;
  searchQuery?: string;
}

interface FacilitiesState {
  facilities: Facility[];
  filteredFacilities: Facility[];
  selectedFacilityId: string | null;
  filters: FacilityFilters;
  isLoading: boolean;
  error: string | null;
}

const initialState: FacilitiesState = {
  facilities: [],
  filteredFacilities: [],
  selectedFacilityId: null,
  filters: {},
  isLoading: false,
  error: null,
};

export const fetchFacilities = createAsyncThunk(
  'facilities/fetchFacilities',
  async () => {
    const data = await getFacilities();
    return data;
  }
);

const facilitiesSlice = createSlice({
  name: 'facilities',
  initialState,
  reducers: {
    selectFacility: (state, action: PayloadAction<string | null>) => {
      state.selectedFacilityId = action.payload;
    },
    setFilters: (state, action: PayloadAction<FacilityFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Apply filters logic here or in a selector/separate effect
      // For simple state management, we can re-filter here
      const { type, services, yakapAccredited, searchQuery } = state.filters;
      
      state.filteredFacilities = state.facilities.filter(facility => {
        const matchesType = !type || facility.type === type;
        const matchesYakap = yakapAccredited === undefined || facility.yakapAccredited === yakapAccredited;
        const matchesSearch = !searchQuery || 
          facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          facility.address.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Simple service match (has at least one of the filtered services)
        // Adjust logic as needed (e.g., must have ALL)
        const matchesServices = !services || services.length === 0 || 
          services.some(s => facility.services.includes(s));

        return matchesType && matchesYakap && matchesSearch && matchesServices;
      });
    },
    clearFilters: (state) => {
      state.filters = {};
      state.filteredFacilities = state.facilities;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacilities.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFacilities.fulfilled, (state, action: PayloadAction<Facility[]>) => {
        state.isLoading = false;
        state.facilities = action.payload;
        state.filteredFacilities = action.payload; // Initialize filtered list
      })
      .addCase(fetchFacilities.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch facilities';
      });
  },
});

export const { selectFacility, setFilters, clearFilters } = facilitiesSlice.actions;
export default facilitiesSlice.reducer;
