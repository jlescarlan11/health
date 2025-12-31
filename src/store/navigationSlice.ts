import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  metadata?: any; // For additional context like facility IDs
}

interface Recommendation {
  level: 'self-care' | 'health-center' | 'hospital' | 'emergency';
  facilityType?: string;
  reasoning: string;
  actions: string[];
}

interface NavigationState {
  chatHistory: Message[];
  currentSymptoms: string[];
  recommendation: Recommendation | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: NavigationState = {
  chatHistory: [],
  currentSymptoms: [],
  recommendation: null,
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
    setSymptoms: (state, action: PayloadAction<string[]>) => {
      state.currentSymptoms = action.payload;
    },
    setRecommendation: (state, action: PayloadAction<Recommendation | null>) => {
      state.recommendation = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearSession: (state) => {
      state.chatHistory = [];
      state.currentSymptoms = [];
      state.recommendation = null;
      state.error = null;
    },
  },
});

export const { 
  addMessage, 
  setSymptoms, 
  setRecommendation, 
  setLoading, 
  setError, 
  clearSession 
} = navigationSlice.actions;
export default navigationSlice.reducer;