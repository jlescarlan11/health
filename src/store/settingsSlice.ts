import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  highContrastMode: boolean;
  notificationsEnabled: boolean;
  language: 'en' | 'fil';
  hasPhilHealth: boolean | null;
  specializedModes: {
    isSenior: boolean;
    isPWD: boolean;
    isChronic: boolean;
  };
}

const initialState: SettingsState = {
  theme: 'system',
  fontSize: 'medium',
  highContrastMode: false,
  notificationsEnabled: true,
  language: 'en',
  hasPhilHealth: null,
  specializedModes: {
    isSenior: false,
    isPWD: false,
    isChronic: false,
  },
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
    setHasPhilHealth: (state, action: PayloadAction<boolean | null>) => {
      state.hasPhilHealth = action.payload;
    },
    toggleSpecializedMode: (
      state,
      action: PayloadAction<keyof SettingsState['specializedModes']>,
    ) => {
      // Safety guard to ensure specializedModes exists
      if (!state.specializedModes) {
        state.specializedModes = {
          isSenior: false,
          isPWD: false,
          isChronic: false,
        };
      }
      state.specializedModes[action.payload] = !state.specializedModes[action.payload];
    },
  },
});

export const {
  setTheme,
  setFontSize,
  setHighContrastMode,
  toggleNotifications,
  setLanguage,
  setHasPhilHealth,
  toggleSpecializedMode,
} = settingsSlice.actions;
export default settingsSlice.reducer;
