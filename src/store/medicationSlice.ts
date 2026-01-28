import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as DB from '../services/database';
import { Medication } from '../types';
interface MedicationState {
  items: Medication[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: MedicationState = {
  items: [],
  status: 'idle',
  error: null,
};

// Helper to map DB record to Medication type
const mapRecordToMedication = (record: DB.MedicationRecord): Medication => ({
  id: record.id,
  name: record.name,
  dosage: record.dosage,
  scheduled_time: record.scheduled_time,
  is_active: Boolean(record.is_active),
  days_of_week: JSON.parse(record.days_of_week || '[]'),
});

// Helper to map Medication to DB record type
const mapMedicationToRecord = (medication: Medication): DB.MedicationRecord => ({
  id: medication.id,
  name: medication.name,
  dosage: medication.dosage,
  scheduled_time: medication.scheduled_time,
  is_active: medication.is_active ? 1 : 0,
  days_of_week: JSON.stringify(medication.days_of_week),
});

export const fetchMedications = createAsyncThunk(
  'medication/fetchMedications',
  async (_, { rejectWithValue }) => {
    try {
      const records = await DB.getMedications();
      return records.map(mapRecordToMedication);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch medications');
    }
  },
);

export const addMedication = createAsyncThunk(
  'medication/addMedication',
  async (medication: Medication, { rejectWithValue }) => {
    try {
      const record = mapMedicationToRecord(medication);
      await DB.saveMedication(record);

      return medication;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add medication');
    }
  },
);

export const deleteMedication = createAsyncThunk(
  'medication/deleteMedication',
  async (id: string, { rejectWithValue }) => {
    try {
      await DB.deleteMedication(id);

      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete medication');
    }
  },
);

const medicationSlice = createSlice({
  name: 'medication',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Medications
      .addCase(fetchMedications.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMedications.fulfilled, (state, action: PayloadAction<Medication[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchMedications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Add Medication
      .addCase(addMedication.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addMedication.fulfilled, (state, action: PayloadAction<Medication>) => {
        state.status = 'succeeded';
        // Use OR REPLACE logic: if it exists, update it; otherwise add it
        const index = state.items.findIndex((m) => m.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      .addCase(addMedication.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Delete Medication
      .addCase(deleteMedication.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteMedication.fulfilled, (state, action: PayloadAction<string>) => {
        state.status = 'succeeded';
        state.items = state.items.filter((m) => m.id !== action.payload);
      })
      .addCase(deleteMedication.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const selectAllMedications = (state: { medication: MedicationState }) =>
  state.medication.items;
export const selectMedicationById = (state: { medication: MedicationState }, id: string) =>
  state.medication.items.find((m) => m.id === id);
export const selectMedicationStatus = (state: { medication: MedicationState }) =>
  state.medication.status;
export const selectMedicationError = (state: { medication: MedicationState }) =>
  state.medication.error;

export default medicationSlice.reducer;
