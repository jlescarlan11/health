import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface EnrollmentState {
  enrollmentStatus: 'idle' | 'in_progress' | 'completed' | 'failed';
  currentStep: number;
  completedSteps: number[];
  uploadedDocuments: Record<number, string>;
  selectedPathway: 'egovph' | 'philhealth_portal' | 'clinic_walkin' | 'philhealth_office' | null;
  data: Record<string, any>;
  completionDate: string | null;
}

const initialState: EnrollmentState = {
  enrollmentStatus: 'idle',
  currentStep: 0,
  completedSteps: [],
  uploadedDocuments: {},
  selectedPathway: null,
  data: {},
  completionDate: null,
};

const enrollmentSlice = createSlice({
  name: 'enrollment',
  initialState,
  reducers: {
    startEnrollment: (state, action: PayloadAction<EnrollmentState['selectedPathway']>) => {
      state.enrollmentStatus = 'in_progress';
      state.currentStep = 0;
      state.completedSteps = [];
      state.uploadedDocuments = {};
      state.selectedPathway = action.payload;
    },
    updateEnrollmentData: (state, action: PayloadAction<Record<string, any>>) => {
      state.data = { ...state.data, ...action.payload };
    },
    setStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    toggleStepCompletion: (state, action: PayloadAction<number>) => {
      const stepIndex = action.payload;
      if (state.completedSteps.includes(stepIndex)) {
        state.completedSteps = state.completedSteps.filter(s => s !== stepIndex);
      } else {
        state.completedSteps.push(stepIndex);
      }
    },
    setUploadedDocument: (state, action: PayloadAction<{ stepIndex: number; url: string }>) => {
      state.uploadedDocuments[action.payload.stepIndex] = action.payload.url;
    },
    completeEnrollment: (state) => {
      state.enrollmentStatus = 'completed';
      state.completionDate = new Date().toISOString();
    },
    failEnrollment: (state) => {
      state.enrollmentStatus = 'failed';
    },
    resetEnrollment: (state) => {
      state.enrollmentStatus = 'idle';
      state.currentStep = 0;
      state.completedSteps = [];
      state.uploadedDocuments = {};
      state.selectedPathway = null;
      state.data = {};
      state.completionDate = null;
    },
  },
});

export const { 
  startEnrollment, 
  updateEnrollmentData, 
  setStep, 
  toggleStepCompletion,
  setUploadedDocument,
  completeEnrollment, 
  failEnrollment, 
  resetEnrollment 
} = enrollmentSlice.actions;
export default enrollmentSlice.reducer;
