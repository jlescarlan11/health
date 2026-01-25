import { configureStore } from '@reduxjs/toolkit';
import medicationReducer, {
  fetchMedications,
  addMedication,
  deleteMedication,
  selectAllMedications,
  selectMedicationStatus,
} from '../medicationSlice';
import * as DB from '../../services/database';
import { Medication } from '../../types';

// Mock the database service
jest.mock('../../services/database', () => ({
  getMedications: jest.fn(),
  saveMedication: jest.fn(),
  deleteMedication: jest.fn(),
}));

describe('medicationSlice', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        medication: medicationReducer,
      },
    });
    jest.clearAllMocks();
  });

  const sampleMedication: Medication = {
    id: '1',
    name: 'Paracetamol',
    dosage: '500mg',
    scheduled_time: '08:00',
    is_active: true,
    days_of_week: ['Monday', 'Wednesday', 'Friday'],
  };

  const sampleRecord: DB.MedicationRecord = {
    id: '1',
    name: 'Paracetamol',
    dosage: '500mg',
    scheduled_time: '08:00',
    is_active: 1,
    days_of_week: JSON.stringify(['Monday', 'Wednesday', 'Friday']),
  };

  describe('fetchMedications thunk', () => {
    it('should load medications from DB and update state', async () => {
      (DB.getMedications as jest.Mock).mockResolvedValue([sampleRecord]);

      await store.dispatch(fetchMedications());

      expect(DB.getMedications).toHaveBeenCalled();
      const medications = selectAllMedications(store.getState());
      expect(medications).toHaveLength(1);
      expect(medications[0]).toEqual(sampleMedication);
      expect(selectMedicationStatus(store.getState())).toBe('succeeded');
    });

    it('should handle errors when fetching', async () => {
      (DB.getMedications as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      await store.dispatch(fetchMedications());

      expect(selectMedicationStatus(store.getState())).toBe('failed');
      expect(store.getState().medication.error).toBe('Fetch failed');
    });
  });

  describe('addMedication thunk', () => {
    it('should save medication to DB and update state', async () => {
      (DB.saveMedication as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(addMedication(sampleMedication));

      expect(DB.saveMedication).toHaveBeenCalledWith(sampleRecord);
      const medications = selectAllMedications(store.getState());
      expect(medications).toContainEqual(sampleMedication);
    });

    it('should update existing medication in state', async () => {
      // Pre-populate state
      (DB.getMedications as jest.Mock).mockResolvedValue([sampleRecord]);
      await store.dispatch(fetchMedications());

      const updatedMedication = { ...sampleMedication, name: 'Updated Name' };
      const updatedRecord = { ...sampleRecord, name: 'Updated Name' };
      (DB.saveMedication as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(addMedication(updatedMedication));

      expect(DB.saveMedication).toHaveBeenCalledWith(updatedRecord);
      const medications = selectAllMedications(store.getState());
      expect(medications).toHaveLength(1);
      expect(medications[0].name).toBe('Updated Name');
    });
  });

  describe('deleteMedication thunk', () => {
    it('should delete from DB and remove from state', async () => {
      // Pre-populate state
      (DB.getMedications as jest.Mock).mockResolvedValue([sampleRecord]);
      await store.dispatch(fetchMedications());

      (DB.deleteMedication as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(deleteMedication('1'));

      expect(DB.deleteMedication).toHaveBeenCalledWith('1');
      const medications = selectAllMedications(store.getState());
      expect(medications).toHaveLength(0);
    });
  });
});
