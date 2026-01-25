import { configureStore } from '@reduxjs/toolkit';
import offlineReducer, { saveClinicalNote, selectLatestClinicalNote } from '../offlineSlice';
import * as DB from '../../services/database';

// Mock the database service
jest.mock('../../services/database', () => ({
  saveClinicalHistory: jest.fn(),
}));

describe('offlineSlice', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        offline: offlineReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('saveClinicalNote thunk', () => {
    const samplePayload = {
      clinical_soap: 'Subjective: Headache...',
      recommended_level: 'health_center',
      medical_justification: 'Mild symptoms',
      initial_symptoms: 'Headache',
    };

    it('should save clinical note to database and update Redux state', async () => {
      (DB.saveClinicalHistory as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(saveClinicalNote(samplePayload));

      // Verify DB call
      expect(DB.saveClinicalHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          initial_symptoms: samplePayload.initial_symptoms,
          recommended_level: samplePayload.recommended_level,
          clinical_soap: samplePayload.clinical_soap,
          medical_justification: samplePayload.medical_justification,
        }),
      );

      // Verify state update
      const latest = selectLatestClinicalNote(store.getState());
      expect(latest).not.toBeNull();
      expect(latest?.clinical_soap).toBe(samplePayload.clinical_soap);
      expect(latest?.id).toBeDefined(); // Should have generated UUID
      expect(latest?.timestamp).toBeDefined();
    });

    it('should update Redux state even if database write fails', async () => {
      (DB.saveClinicalHistory as jest.Mock).mockRejectedValue(new Error('DB Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await store.dispatch(saveClinicalNote(samplePayload));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist'),
        expect.any(Error),
      );

      const latest = selectLatestClinicalNote(store.getState());
      expect(latest).not.toBeNull();
      expect(latest?.clinical_soap).toBe(samplePayload.clinical_soap);

      consoleSpy.mockRestore();
    });
  });
});
