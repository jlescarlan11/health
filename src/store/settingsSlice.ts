import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  highContrastMode: boolean;
  notificationsEnabled: boolean;
  language: 'en' | 'fil';
  hasSeenDisclaimer: boolean;
}

const initialState: SettingsState = {
  theme: 'system',
  fontSize: 'medium',
  highContrastMode: false,
  notificationsEnabled: true,
  language: 'en',
  hasSeenDisclaimer: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<SettingsState['theme']>) => {
      state.theme = action.payload;
    },
    setFontSize: (state, action: PayloadAction<SettingsState['fontSize']>) => {
      state.fontSize = action.payload;
    },
    setHighContrastMode: (state, action: PayloadAction<boolean>) => {
      state.highContrastMode = action.payload;
    },
    toggleNotifications: (state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
    },
    setLanguage: (state, action: PayloadAction<SettingsState['language']>) => {
      state.language = action.payload;
    },
    setHasSeenDisclaimer: (state, action: PayloadAction<boolean>) => {
      state.hasSeenDisclaimer = action.payload;
    },
  },
});

export const { 
  setTheme, 
  setFontSize, 
  setHighContrastMode, 
  toggleNotifications, 
  setLanguage, 
  setHasSeenDisclaimer 
} = settingsSlice.actions;
export default settingsSlice.reducer;