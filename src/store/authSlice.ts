import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isLoggedIn: boolean;
  user: {
    uid: string;
    email?: string | null;
    phoneNumber?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  } | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isLoggedIn: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthState['user']; token: string | null; refreshToken?: string | null }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      state.isLoggedIn = true;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<AuthState['user']>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload } as AuthState['user'];
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isLoggedIn = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setCredentials, updateUser, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
