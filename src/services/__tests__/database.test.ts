import { saveFacilitiesFull } from '../database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('database service', () => {
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

  describe('saveFacilitiesFull', () => {
    it('should throw validation error BEFORE starting transaction if id is missing', async () => {
      const invalidFacilities = [{ name: 'Test' }] as any;

      await expect(saveFacilitiesFull(invalidFacilities)).rejects.toThrow(
        'Invalid facilities dataset: missing facility.id',
      );

      // Verify transaction was NOT started
      expect(mockDb.execAsync).not.toHaveBeenCalledWith('BEGIN TRANSACTION');
    });

    it('should start transaction and save for valid facilities', async () => {
      const validFacilities = [{ id: '1', name: 'Test' }] as any;

      await saveFacilitiesFull(validFacilities);

      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle empty facilities list correctly (clear DB)', async () => {
      const emptyFacilities: any[] = [];

      await saveFacilitiesFull(emptyFacilities);

      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.execAsync).toHaveBeenCalledWith('DELETE FROM facilities');
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT');
    });
  });
});
