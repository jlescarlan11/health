import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './authSlice';
import facilitiesReducer from './facilitiesSlice';
import navigationReducer from './navigationSlice';
import enrollmentReducer from './enrollmentSlice';
import offlineReducer from './offlineSlice';
import settingsReducer from './settingsSlice';

// Re-export reducers for convenience
export { default as authReducer } from './authSlice';
export { default as facilitiesReducer } from './facilitiesSlice';
export { default as navigationReducer } from './navigationSlice';
export { default as enrollmentReducer } from './enrollmentSlice';
export { default as offlineReducer } from './offlineSlice';
export { default as settingsReducer } from './settingsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  facilities: facilitiesReducer,
  navigation: navigationReducer,
  enrollment: enrollmentReducer,
  offline: offlineReducer,
  settings: settingsReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'settings', 'enrollment'],
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