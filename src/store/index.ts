import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  createMigrate,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import facilitiesReducer from './facilitiesSlice';
import navigationReducer from './navigationSlice';
import offlineReducer from './offlineSlice';
import settingsReducer from './settingsSlice';

// Re-export reducers for convenience
export { default as facilitiesReducer } from './facilitiesSlice';
export { default as navigationReducer } from './navigationSlice';
export { default as offlineReducer } from './offlineSlice';
export { default as settingsReducer } from './settingsSlice';

const rootReducer = combineReducers({
  facilities: facilitiesReducer,
  navigation: navigationReducer,
  offline: offlineReducer,
  settings: settingsReducer,
});

const migrations = {
  1: (state: any) => {
    // Surgical removal of legacy auth state if it exists
    if (state && state.auth) {
      const { auth, ...newState } = state;
      return newState;
    }
    return state;
  },
  2: (state: any) => {
    // Purge enrollment state when migrating to version 2
    if (state && state.enrollment) {
      const { enrollment, ...newState } = state;
      return newState;
    }
    return state;
  },
};

const persistConfig = {
  key: 'root',
  version: 2,
  storage: AsyncStorage,
  whitelist: ['settings', 'navigation', 'offline'],
  migrate: createMigrate(migrations, { debug: false }),
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
