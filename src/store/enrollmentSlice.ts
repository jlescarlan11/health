import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface EnrollmentState {
  currentStep: number;
  selectedPathway: 'egovph' | 'philhealth_portal' | 'clinic_walkin' | 'philhealth_office' | null;
}

const initialState: EnrollmentState = {
  currentStep: 0,
  selectedPathway: null,
};

const enrollmentSlice = createSlice({
  name: 'enrollment',
  initialState,
  reducers: {
    startEnrollment: (state, action: PayloadAction<EnrollmentState['selectedPathway']>) => {
      state.currentStep = 0;
      state.selectedPathway = action.payload;
    },
    setStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    resetEnrollment: (state) => {
      state.currentStep = 0;
      state.selectedPathway = null;
    },
  },
});

export const { 
  startEnrollment, 
  setStep, 
  resetEnrollment 
} = enrollmentSlice.actions;
export default enrollmentSlice.reducer;