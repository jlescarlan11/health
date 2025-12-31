import { configureStore } from '@reduxjs/toolkit';
import navigationReducer from './navigationSlice';
import facilityReducer from './facilitySlice';

export const store = configureStore({
  reducer: {
    navigation: navigationReducer,
    facilities: facilityReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
