import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ProfileState {
  fullName: string | null;
  username: string | null;
  phoneNumber: string | null;
  dob: string | null;
  sex: string | null;
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
  username: null,
  phoneNumber: null,
  dob: null,
  sex: null,
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
    setFullName: (state, action: PayloadAction<string | null>) => {
      state.fullName = action.payload;
    },
    setUsername: (state, action: PayloadAction<string | null>) => {
      state.username = action.payload;
    },
    setPhoneNumber: (state, action: PayloadAction<string | null>) => {
      state.phoneNumber = action.payload;
    },
    setDob: (state, action: PayloadAction<string | null>) => {
      state.dob = action.payload;
    },
    setSex: (state, action: PayloadAction<string | null>) => {
      state.sex = action.payload;
    },
    setBloodType: (state, action: PayloadAction<string | null>) => {
      state.bloodType = action.payload;
    },
    setPhilHealthId: (state, action: PayloadAction<string | null>) => {
      state.philHealthId = action.payload;
    },
    setChronicConditions: (state, action: PayloadAction<string[]>) => {
      state.chronicConditions = action.payload;
    },
    setAllergies: (state, action: PayloadAction<string[]>) => {
      state.allergies = action.payload;
    },
    setCurrentMedications: (state, action: PayloadAction<string[]>) => {
      state.currentMedications = action.payload;
    },
    setSurgicalHistory: (state, action: PayloadAction<string | null>) => {
      state.surgicalHistory = action.payload;
    },
    setFamilyHistory: (state, action: PayloadAction<string | null>) => {
      state.familyHistory = action.payload;
    },
    clearProfile: (state) => {
      state.fullName = null;
      state.username = null;
      state.phoneNumber = null;
      state.dob = null;
      state.sex = null;
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

export const {
  updateProfile,
  setFullName,
  setUsername,
  setPhoneNumber,
  setDob,
  setSex,
  setBloodType,
  setPhilHealthId,
  setChronicConditions,
  setAllergies,
  setCurrentMedications,
  setSurgicalHistory,
  setFamilyHistory,
  clearProfile,
} = profileSlice.actions;
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
  if (age !== null) segments.push(`Age: ${age}`);

  const sex = normalizeText(profile.sex);
  if (sex) segments.push(`Sex: ${sex}`);

  const blood = normalizeText(profile.bloodType);
  if (blood) segments.push(`Blood: ${blood}`);

  const cond = formatList(profile.chronicConditions);
  if (cond) segments.push(`Cond: ${cond}`);

  const meds = formatList(profile.currentMedications);
  if (meds) segments.push(`Meds: ${meds}`);

  const allergies = formatList(profile.allergies);
  if (allergies) segments.push(`Allergies: ${allergies}`);

  const surg = normalizeText(profile.surgicalHistory);
  if (surg) segments.push(`Surg: ${surg}`);

  const fam = normalizeText(profile.familyHistory);
  if (fam) segments.push(`FamHx: ${fam}`);

  return segments;
};

export const selectClinicalContext = createSelector(
  (state: { profile: ProfileState }) => state.profile,
  (profile) => {
    const segments = buildClinicalSegments(profile);
    if (!segments.length) return null;
    return segments.join('. ');
  },
);

export const selectFullName = (state: { profile: ProfileState }) => state.profile.fullName;
