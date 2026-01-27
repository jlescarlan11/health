import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const parseAge = (dob: string | null): number | null => {
  if (!dob) return null;
  const birthday = new Date(dob);
  if (Number.isNaN(birthday.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

const formatList = (values: string[]): string | null => {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(', ') : null;
};

const normalizeText = (value: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const buildClinicalSegments = (profile: ProfileState): string[] => {
  const segments: string[] = [];

  const age = parseAge(profile.dob);
  if (age !== null) {
    segments.push(`Age: ${age}yo`);
  }

  if (profile.bloodType) {
    segments.push(`Blood: ${profile.bloodType}`);
  }

  const conditions = formatList(profile.chronicConditions);
  if (conditions) {
    segments.push(`Conditions: ${conditions}`);
  }

  const medications = formatList(profile.currentMedications);
  if (medications) {
    segments.push(`Meds: ${medications}`);
  }

  const allergies = formatList(profile.allergies);
  if (allergies) {
    segments.push(`Allergies: ${allergies}`);
  }

  const surgicalHistory = normalizeText(profile.surgicalHistory);
  if (surgicalHistory) {
    segments.push(`Surgical: ${surgicalHistory}`);
  }

  const familyHistory = normalizeText(profile.familyHistory);
  if (familyHistory) {
    segments.push(`Family: ${familyHistory}`);
  }

  return segments;
};

export const selectClinicalContext = createSelector(
  (state: { profile: ProfileState }) => state.profile,
  (profile) => {
    const segments = buildClinicalSegments(profile);
    if (!segments.length) return null;
    return segments.map((segment) => `${segment}.`).join(' ');
  },
);
