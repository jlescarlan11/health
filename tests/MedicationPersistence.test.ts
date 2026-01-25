import { describe, expect, it, beforeAll, afterEach, jest } from '@jest/globals';

// 1. Define a shared mock storage that survives module resets
const mockStorage = {
  medications: new Map<string, any>(),
};

// 2. Create the mock implementation
const mockSQLite = {
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async (sql: string) => {
      // Handle table creation if needed, but we mostly care about data
      return;
    }),
    getAllAsync: jest.fn(async (sql: string) => {
      if (sql.includes('FROM medications')) {
        return Array.from(mockStorage.medications.values()).map((m) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          scheduled_time: m.scheduled_time,
          is_active: m.is_active,
          days_of_week: m.days_of_week,
        }));
      }
      return [];
    }),
    prepareAsync: jest.fn(async (sql: string) => ({
      executeAsync: jest.fn(async (params: any) => {
        if (sql.includes('INTO medications')) {
          // Extract params. The keys are like $id, $name, etc.
          // We need to normalize them to our storage format
          const id = params.$id;
          if (id) {
            mockStorage.medications.set(id, {
              id: params.$id,
              name: params.$name,
              dosage: params.$dosage,
              scheduled_time: params.$scheduled_time,
              is_active: params.$is_active,
              days_of_week: params.$days_of_week,
            });
          }
        }
        return {};
      }),
      finalizeAsync: jest.fn(async () => {}),
    })),
    runAsync: jest.fn(async (sql: string, params: any[]) => {
      if (sql.includes('DELETE FROM medications')) {
        const id = params[0]; // DELETE FROM medications WHERE id = ?
        mockStorage.medications.delete(id);
      }
      return { changes: 1 };
    }),
    transactionAsync: jest.fn(async (callback) => {
      // Just execute the callback directly for simplicity in this test
      // We aren't testing atomicity strictly, just persistence
      // The real code expects an object with execute/executeAsync
      /* 
           Wait, the real code uses db.execAsync('BEGIN TRANSACTION') manually.
           It doesn't use db.transactionAsync.
           So we don't strictly need this unless we change implementation.
        */
    }),
    closeAsync: jest.fn(async () => {}),
  })),
};

// 3. Mock the library
jest.mock('expo-sqlite', () => mockSQLite);

describe('Medication Persistence (Cold Start Simulation)', () => {
  beforeAll(() => {
    // Ensure storage is clear
    mockStorage.medications.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('persists medication schedules across app restarts', async () => {
    // --- PHASE 1: Initial Launch & Save ---

    // Dynamically import the service to ensure we get a fresh instance if we were loop testing
    // (Though for the first run, import is fine. We will re-require later).
    let databaseService = require('../src/services/database');

    const medication1 = {
      id: 'med_1',
      name: 'Aspirin',
      dosage: '100mg',
      scheduled_time: '08:00',
      is_active: 1,
      days_of_week: JSON.stringify(['Mon', 'Tue']),
    };

    const medication2 = {
      id: 'med_2',
      name: 'Vitamin C',
      dosage: '500mg',
      scheduled_time: '09:00',
      is_active: 0,
      days_of_week: JSON.stringify(['Sat', 'Sun']),
    };

    console.log('Saving medications to database...');
    await databaseService.saveMedication(medication1);
    await databaseService.saveMedication(medication2);

    // Verify they are in "disk" (our mock storage)
    expect(mockStorage.medications.size).toBe(2);
    expect(mockStorage.medications.get('med_1')).toEqual(
      expect.objectContaining({ name: 'Aspirin' }),
    );

    // --- PHASE 2: Simulate Cold Start ---

    console.log('Simulating App Cold Start (Resetting Modules)...');
    jest.resetModules(); // This clears the cache of required modules

    // We must re-mock expo-sqlite because resetModules might clear the mock registry
    // depending on configuration, but usually global mocks need to be maintained.
    // However, the module closure variables (like `db` in database.ts) are definitely gone.
    jest.mock('expo-sqlite', () => mockSQLite);

    // Re-import the service. This triggers a fresh execution of the module.
    // The `db` variable inside will be null/undefined again.
    databaseService = require('../src/services/database');

    // --- PHASE 3: Verification ---

    console.log('Retrieving medications after restart...');
    const retrievedMedications = await databaseService.getMedications();

    // Verification Logic
    expect(retrievedMedications).toHaveLength(2);

    // Sort to ensure order doesn't flake the test
    const sortedMeds = retrievedMedications.sort((a: any, b: any) => a.id.localeCompare(b.id));

    // Verify Medication 1
    expect(sortedMeds[0]).toEqual({
      id: 'med_1',
      name: 'Aspirin',
      dosage: '100mg',
      scheduled_time: '08:00',
      is_active: 1,
      days_of_week: JSON.stringify(['Mon', 'Tue']), // Note: implementation stores/returns stringified JSON for this column?
      // Let's check the implementation. Yes, map says: days_of_week: medication.days_of_week
      // And the interface says string.
      // Wait, the getMedications implementation maps generic fields but doesn't JSON.parse days_of_week?
      // Let's check the getMedications in database.ts again.
    });

    // Verify Medication 2
    expect(sortedMeds[1]).toEqual({
      id: 'med_2',
      name: 'Vitamin C',
      dosage: '500mg',
      scheduled_time: '09:00',
      is_active: 0,
      days_of_week: JSON.stringify(['Sat', 'Sun']),
    });

    console.log('Verification Successful: Data persisted and restored correctly.');
  });
});
