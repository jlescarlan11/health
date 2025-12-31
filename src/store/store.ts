import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userReducer from './userSlice';
import facilityReducer from './facilitySlice';
import navigationReducer from './navigationSlice';
import yakapReducer from './yakapSlice';
import offlineReducer from './offlineSlice';
import settingsReducer from './settingsSlice';

const rootReducer = combineReducers({
  user: userReducer,
  facilities: facilityReducer,
  navigation: navigationReducer,
  yakap: yakapReducer,
  offline: offlineReducer,
  settings: settingsReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['user', 'settings', 'yakap'], // Persist these slices
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
