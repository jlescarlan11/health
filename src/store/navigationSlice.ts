import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  metadata?: Record<string, unknown>; // For additional context like facility IDs
}

interface Recommendation {
  level: 'self_care' | 'health_center' | 'hospital' | 'emergency';
  facilityType?: string;
  user_advice: string;
  clinical_soap: string;
  isFallbackApplied?: boolean;
  clinicalFrictionDetails?: Record<string, unknown>;
}

interface NavigationState {
  chatHistory: Message[];
  currentSymptoms: string[];
  recommendation: Recommendation | null;
  isLoading: boolean;
  error: string | null;
  isHighRisk: boolean;
  lastRiskTimestamp: number;
}

const initialState: NavigationState = {
  chatHistory: [],
  currentSymptoms: [],
  recommendation: null,
  isLoading: false,
  error: null,
  isHighRisk: false,
  lastRiskTimestamp: 0,
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
    setHighRisk: (state, action: PayloadAction<boolean>) => {
      state.isHighRisk = action.payload;
      if (action.payload) {
        state.lastRiskTimestamp = Date.now();
      } else {
        state.lastRiskTimestamp = 0;
      }
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
  setHighRisk,
  clearSession,
} = navigationSlice.actions;
export default navigationSlice.reducer;
