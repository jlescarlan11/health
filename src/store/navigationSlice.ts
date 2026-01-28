import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TriageSnapshot } from '../types/triage';
import { ClinicalSlots } from '../utils/clinicalUtils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'assistant';
  timestamp: number;
  metadata?: Record<string, unknown>; // For additional context like facility IDs
}

export interface AssessmentTurnMeta {
  questionId: string;
  timestamp: number;
  intentTag: string;
}

interface Recommendation {
  level: 'self_care' | 'health_center' | 'hospital' | 'emergency';
  facilityType?: string;
  user_advice: string;
  clinical_soap: string;
  isFallbackApplied?: boolean;
  clinicalFrictionDetails?: Record<string, unknown>;
  medical_justification?: string;
}

interface NavigationState {
  chatHistory: Message[];
  currentSymptoms: string[];
  recommendation: Recommendation | null;
  isLoading: boolean;
  error: string | null;
  isHighRisk: boolean;
  lastRiskTimestamp: number;
  symptomDraft: string;
  assessmentState: {
    messages: any[];
    questions: any[];
    fullPlan: any[];
    currentQuestionIndex: number;
    answers: Record<string, string>;
    expansionCount: number;
    readiness: number;
    assessmentStage: string;
    symptomCategory: string | null;
    previousProfile: any | undefined;
    clarificationCount: number;
    suppressedKeywords: string[];
    isRecentResolved: boolean;
    resolvedKeyword: string | null;
    initialSymptom: string;
    isOfflineMode: boolean;
    currentOfflineNodeId: string | null;
    isVerifyingEmergency: boolean;
    emergencyVerificationData: any | null;
    pendingRedFlag: string | null;
    sessionBuffer: Message[];
    outOfScopeBuffer: string[];
    triageSnapshot: TriageSnapshot | null;
    currentTurnMeta?: AssessmentTurnMeta | null;
    isQueueSuspended?: boolean;
    pendingCorrection?: string | null;
    incrementalSlots: ClinicalSlots;
    isGuestMode: boolean;
  } | null;
}

const initialState: NavigationState = {
  chatHistory: [],
  currentSymptoms: [],
  recommendation: null,
  isLoading: false,
  error: null,
  isHighRisk: false,
  lastRiskTimestamp: 0,
  symptomDraft: '',
  assessmentState: null,
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
    setSymptomDraft: (state, action: PayloadAction<string>) => {
      state.symptomDraft = action.payload;
    },
    updateAssessmentState: (
      state,
      action: PayloadAction<Partial<NavigationState['assessmentState']>>,
    ) => {
      if (!state.assessmentState && action.payload) {
        state.assessmentState = action.payload as any;
      } else if (state.assessmentState && action.payload) {
        state.assessmentState = { ...state.assessmentState, ...action.payload };
      }
    },
    clearAssessmentState: (state) => {
      state.assessmentState = null;
      state.symptomDraft = '';
    },
    clearSession: (state) => {
      state.chatHistory = [];
      state.currentSymptoms = [];
      state.recommendation = null;
      state.error = null;
      state.assessmentState = null;
      state.symptomDraft = '';
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
  setSymptomDraft,
  updateAssessmentState,
  clearAssessmentState,
  clearSession,
} = navigationSlice.actions;
export default navigationSlice.reducer;
