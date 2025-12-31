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

// #region agent log
const logDebug = (location: string, message: string, data: any) => {
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location, message, data, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => {});
};
// #endregion

export const fetchFacilities = createAsyncThunk(
  'facilities/fetchFacilities',
  async () => {
    // #region agent log
    logDebug('facilitySlice.ts:32', 'fetchFacilities thunk entry', {});
    // #endregion
    try {
      const data = await getFacilities();
      // #region agent log
      logDebug('facilitySlice.ts:36', 'fetchFacilities success', { dataType: typeof data, isArray: Array.isArray(data), dataLength: data?.length || data?.facilities?.length || 0 });
      // #endregion
      return data;
    } catch (error: any) {
      // #region agent log
      logDebug('facilitySlice.ts:40', 'fetchFacilities error', { errorMessage: error?.message, errorType: typeof error });
      // #endregion
      throw error;
    }
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
