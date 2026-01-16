import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SavedClinicalNote {
  id: string;
  timestamp: number;
  soapNote: SOAPNote;
  recommendationLevel: string;
}

interface OfflineState {
  isOffline: boolean;
  lastSync: number | null;
  pendingSyncs: number;
  savedNotes: SavedClinicalNote[];
}

const initialState: OfflineState = {
  isOffline: false,
  lastSync: null,
  pendingSyncs: 0,
  savedNotes: [],
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
    saveClinicalNote: (state, action: PayloadAction<Omit<SavedClinicalNote, 'id' | 'timestamp'>>) => {
      const newNote: SavedClinicalNote = {
        ...action.payload,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
      };
      // Keep only the last 10 notes to save space
      state.savedNotes = [newNote, ...state.savedNotes].slice(0, 10);
    },
    clearSavedNotes: (state) => {
      state.savedNotes = [];
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
  clearSavedNotes,
} = offlineSlice.actions;

// Selectors
export const selectLatestClinicalNote = (state: { offline: OfflineState }) => 
  state.offline.savedNotes.length > 0 ? state.offline.savedNotes[0] : null;

export const selectAllClinicalNotes = (state: { offline: OfflineState }) => 
  state.offline.savedNotes;

export default offlineSlice.reducer;
