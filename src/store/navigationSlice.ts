import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

interface NavigationState {
  chatHistory: Message[];
  isLoading: boolean;
  error: string | null;
}

const initialState: NavigationState = {
  chatHistory: [],
  isLoading: false,
  error: null,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.chatHistory.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearChat: (state) => {
      state.chatHistory = [];
    },
  },
});

export const { addMessage, setLoading, setError, clearChat } = navigationSlice.actions;
export default navigationSlice.reducer;
