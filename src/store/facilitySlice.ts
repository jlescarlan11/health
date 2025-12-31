import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getFacilities } from '../services/facilityService';

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

interface FacilityState {
  facilities: Facility[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FacilityState = {
  facilities: [],
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

const facilitySlice = createSlice({
  name: 'facilities',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacilities.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFacilities.fulfilled, (state, action: PayloadAction<Facility[]>) => {
        state.isLoading = false;
        state.facilities = action.payload;
      })
      .addCase(fetchFacilities.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch facilities';
      });
  },
});

export default facilitySlice.reducer;
