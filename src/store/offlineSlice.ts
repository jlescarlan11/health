import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LatestAssessment {
  clinical_soap: string;
  recommendationLevel: string;
  medical_justification?: string;
  timestamp: number;
}

interface OfflineState {
  isOffline: boolean;
  lastSync: number | null;
  pendingSyncs: number;
  latestAssessment: LatestAssessment | null;
}

const initialState: OfflineState = {
  isOffline: false,
  lastSync: null,
  pendingSyncs: 0,
  latestAssessment: null,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOfflineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOffline = action.payload;
    },
    syncCompleted: (state) => {
      state.lastSync = Date.now();
      state.pendingSyncs = Math.max(0, state.pendingSyncs - 1);
    },
    setLastSync: (state, action: PayloadAction<number>) => {
      state.lastSync = action.payload;
    },
    addPendingSync: (state) => {
      state.pendingSyncs += 1;
    },
    resetSyncStatus: (state) => {
      state.pendingSyncs = 0;
    },
    saveClinicalNote: (state, action: PayloadAction<Omit<LatestAssessment, 'timestamp'>>) => {
      state.latestAssessment = {
        ...action.payload,
        timestamp: Date.now(),
      };
    },
    clearLatestAssessment: (state) => {
      state.latestAssessment = null;
    },
  },
});

export const {
  setOfflineStatus,
  syncCompleted,
  setLastSync,
  addPendingSync,
  resetSyncStatus,
  saveClinicalNote,
  clearLatestAssessment,
} = offlineSlice.actions;

// Thunk to check TTL
export const checkAssessmentTTL = () => (dispatch: any, getState: () => { offline: OfflineState }) => {
  const { latestAssessment } = getState().offline;
  if (latestAssessment) {
    const now = Date.now();
    const ttl = 24 * 60 * 60 * 1000; // 24 hours
    if (now - latestAssessment.timestamp > ttl) {
      dispatch(clearLatestAssessment());
    }
  }
};

// Selectors
export const selectLatestClinicalNote = (state: { offline: OfflineState }) => 
  state.offline.latestAssessment;

export default offlineSlice.reducer;
