import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  isLoggedIn: boolean;
  user: {
    uid: string;
    email: string;
    displayName?: string;
  } | null;
}

const initialState: UserState = {
  isLoggedIn: false,
  user: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserState['user']>) => {
      state.user = action.payload;
      state.isLoggedIn = !!action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isLoggedIn = false;
    },
  },
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;
