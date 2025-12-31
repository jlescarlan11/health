import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface EnrollmentState {
  enrollmentStatus: 'idle' | 'in_progress' | 'completed' | 'failed';
  currentStep: number;
  selectedPathway: 'indigent' | 'senior' | 'pwd' | 'standard' | null;
  data: Record<string, any>;
  completionDate: string | null;
}

const initialState: EnrollmentState = {
  enrollmentStatus: 'idle',
  currentStep: 0,
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
      state.currentStep = 1;
      state.selectedPathway = action.payload;
    },
    updateEnrollmentData: (state, action: PayloadAction<Record<string, any>>) => {
      state.data = { ...state.data, ...action.payload };
    },
    setStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
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
  completeEnrollment, 
  failEnrollment, 
  resetEnrollment 
} = enrollmentSlice.actions;
export default enrollmentSlice.reducer;
