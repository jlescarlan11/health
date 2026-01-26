import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ProfileState {
  fullName: string | null;
  dob: string | null;
  bloodType: string | null;
  philHealthId: string | null;
  chronicConditions: string[];
  allergies: string[];
  currentMedications: string[];
  surgicalHistory: string | null;
  familyHistory: string | null;
}

const initialState: ProfileState = {
  fullName: null,
  dob: null,
  bloodType: null,
  philHealthId: null,
  chronicConditions: [],
  allergies: [],
  currentMedications: [],
  surgicalHistory: null,
  familyHistory: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    updateProfile: (state, action: PayloadAction<Partial<ProfileState>>) => {
      Object.assign(state, action.payload);
    },
    clearProfile: (state) => {
      state.fullName = null;
      state.dob = null;
      state.bloodType = null;
      state.philHealthId = null;
      state.chronicConditions = [];
      state.allergies = [];
      state.currentMedications = [];
      state.surgicalHistory = null;
      state.familyHistory = null;
    },
  },
});

export const { updateProfile, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
