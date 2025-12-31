import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OfflineState {
  isOffline: boolean;
  lastSync: number | null;
  pendingSyncs: number;
}

const initialState: OfflineState = {
  isOffline: false,
  lastSync: null,
  pendingSyncs: 0,
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
    addPendingSync: (state) => {
      state.pendingSyncs += 1;
    },
    resetSyncStatus: (state) => {
      state.pendingSyncs = 0;
    }
  },
});

export const { setOfflineStatus, syncCompleted, addPendingSync, resetSyncStatus } = offlineSlice.actions;
export default offlineSlice.reducer;