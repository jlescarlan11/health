import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './jest.setup';

describe('Emergency Contact Routes', () => {
  const mockContact = {
    id: '1',
    name: 'Emergency Hotline',
    category: 'hotline',
    phone: '911',
    available24x7: true,
    description: 'Emergency',
    createdAt: new Date(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/emergency-contacts', () => {
    it('should return all contacts', async () => {
      prismaMock.emergencyContact.findMany.mockResolvedValue([mockContact]);

      const response = await request(app).get('/api/emergency-contacts');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('GET /api/emergency-contacts/by-category/:category', () => {
    it('should filter by category', async () => {
      prismaMock.emergencyContact.findMany.mockResolvedValue([mockContact]);

      const response = await request(app).get('/api/emergency-contacts/by-category/hotline');

      expect(response.status).toBe(200);
      expect(prismaMock.emergencyContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { category: 'hotline' } }),
      );
    });
  });
});
