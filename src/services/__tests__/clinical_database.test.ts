import { saveClinicalHistory, getClinicalHistory, getHistoryById, initDatabase } from '../database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('clinical history database service', () => {
  const mockDb = {
    execAsync: jest.fn(),
    getAllAsync: jest.fn(),
    prepareAsync: jest.fn(),
    getFirstAsync: jest.fn(),
  };

  const mockStatement = {
    executeAsync: jest.fn(),
    finalizeAsync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
    mockDb.prepareAsync.mockResolvedValue(mockStatement);
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.execAsync.mockResolvedValue(undefined);
    mockStatement.executeAsync.mockResolvedValue(undefined);
    mockStatement.finalizeAsync.mockResolvedValue(undefined);
  });

  const sampleRecord = {
    id: 'test-123',
    timestamp: Date.now(),
    initial_symptoms: 'Heachache and fever',
    recommended_level: 'health_center',
    clinical_soap: 'Subjective: Headache...',
    medical_justification: 'Symptoms suggest mild viral infection',
  };

  it('should initialize database with clinical_history table', async () => {
    await initDatabase();

    // Check if CREATE TABLE for clinical_history was called
    const execCalls = mockDb.execAsync.mock.calls.map((call) => call[0]);
    expect(
      execCalls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS clinical_history')),
    ).toBe(true);

    // Check if migration was called
    expect(mockDb.getAllAsync).toHaveBeenCalledWith('PRAGMA table_info(clinical_history)');
  });

  describe('saveClinicalHistory', () => {
    it('should save a clinical history record successfully', async () => {
      await saveClinicalHistory(sampleRecord);

      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.prepareAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO clinical_history'),
      );
      expect(mockStatement.executeAsync).toHaveBeenCalledWith({
        $id: sampleRecord.id,
        $timestamp: sampleRecord.timestamp,
        $initial_symptoms: sampleRecord.initial_symptoms,
        $recommended_level: sampleRecord.recommended_level,
        $clinical_soap: sampleRecord.clinical_soap,
        $medical_justification: sampleRecord.medical_justification,
      });
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error', async () => {
      mockStatement.executeAsync.mockRejectedValue(new Error('DB Error'));

      await expect(saveClinicalHistory(sampleRecord)).rejects.toThrow('DB Error');

      expect(mockDb.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getClinicalHistory', () => {
    it('should retrieve clinical history records ordered by timestamp desc', async () => {
      mockDb.getAllAsync.mockResolvedValue([sampleRecord]);

      const results = await getClinicalHistory();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM clinical_history ORDER BY timestamp DESC'),
      );
      expect(results).toEqual([sampleRecord]);
    });
  });

  describe('getHistoryById', () => {
    it('should retrieve a single record by id', async () => {
      mockDb.getFirstAsync.mockResolvedValue(sampleRecord);

      const result = await getHistoryById('test-123');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM clinical_history WHERE id = ?'),
        ['test-123'],
      );
      expect(result).toEqual(sampleRecord);
    });

    it('should return null if record not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await getHistoryById('non-existent');

      expect(result).toBeNull();
    });
  });
});
