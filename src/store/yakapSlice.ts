import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface YakapState {
  enrollmentStatus: 'idle' | 'in_progress' | 'completed' | 'failed';
  currentStep: number;
  data: Record<string, any>;
}

const initialState: YakapState = {
  enrollmentStatus: 'idle',
  currentStep: 0,
  data: {},
};

const yakapSlice = createSlice({
  name: 'yakap',
  initialState,
  reducers: {
    startEnrollment: (state) => {
      state.enrollmentStatus = 'in_progress';
      state.currentStep = 1;
    },
    updateEnrollmentData: (state, action: PayloadAction<Record<string, any>>) => {
      state.data = { ...state.data, ...action.payload };
    },
    setStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    completeEnrollment: (state) => {
      state.enrollmentStatus = 'completed';
    },
    resetEnrollment: (state) => {
      state.enrollmentStatus = 'idle';
      state.currentStep = 0;
      state.data = {};
    },
  },
});

export const { startEnrollment, updateEnrollmentData, setStep, completeEnrollment, resetEnrollment } = yakapSlice.actions;
export default yakapSlice.reducer;
