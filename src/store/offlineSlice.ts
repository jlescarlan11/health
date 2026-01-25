import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import * as DB from '../services/database';

export interface LatestAssessment {
  id: string;
  clinical_soap: string;
  recommended_level: string;
  medical_justification?: string;
  initial_symptoms: string;
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

// Simple UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Persistence Thunk
export const saveClinicalNote = createAsyncThunk(
  'offline/saveClinicalNote',
  async (
    payload: Omit<LatestAssessment, 'id' | 'timestamp'>,
    { dispatch },
  ): Promise<LatestAssessment> => {
    const record: LatestAssessment = {
      ...payload,
      id: generateUUID(),
      timestamp: Date.now(),
    };

    try {
      // Persist to SQLite
      await DB.saveClinicalHistory({
        id: record.id,
        timestamp: record.timestamp,
        initial_symptoms: record.initial_symptoms,
        recommended_level: record.recommended_level,
        clinical_soap: record.clinical_soap,
        medical_justification: record.medical_justification || '',
      });

      // Update Redux state via reducer
      dispatch(updateLatestAssessment(record));
      return record;
    } catch (error) {
      console.error('Failed to persist clinical history to database:', error);
      // Still update Redux so UI shows the result, even if DB write failed
      dispatch(updateLatestAssessment(record));
      return record;
    }
  },
);

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
    updateLatestAssessment: (state, action: PayloadAction<LatestAssessment>) => {
      state.latestAssessment = action.payload;
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
  updateLatestAssessment,
  clearLatestAssessment,
} = offlineSlice.actions;

// Selectors
export const selectLatestClinicalNote = (state: { offline: OfflineState }) =>
  state.offline.latestAssessment;

export default offlineSlice.reducer;
