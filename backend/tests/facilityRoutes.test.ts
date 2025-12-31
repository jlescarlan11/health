import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './jest.setup';

describe('Facility Routes', () => {
  const mockFacility = {
    id: '1',
    name: 'Test Facility',
    type: 'hospital',
    address: '123 Test St',
    latitude: 12.34,
    longitude: 56.78,
    phone: '123-456-7890',
    yakap_accredited: true,
    services: ['Checkup'],
    operating_hours: { open: '8:00', close: '17:00' },
    photos: ['url1'],
    barangay: 'Test Barangay',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/facilities', () => {
    it('should return a list of facilities', async () => {
      prismaMock.facility.findMany.mockResolvedValue([mockFacility]);
      prismaMock.facility.count.mockResolvedValue(1);

      const response = await request(app).get('/api/facilities');

      expect(response.status).toBe(200);
      expect(response.body.facilities).toHaveLength(1);
      expect(response.body.facilities[0].name).toBe('Test Facility');
      expect(prismaMock.facility.findMany).toHaveBeenCalledTimes(1);
    });

    it('should filter by type', async () => {
      prismaMock.facility.findMany.mockResolvedValue([mockFacility]);
      prismaMock.facility.count.mockResolvedValue(1);

      const response = await request(app).get('/api/facilities?type=hospital');

      expect(response.status).toBe(200);
      expect(prismaMock.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: 'hospital' } })
      );
    });
  });

  describe('GET /api/facilities/:id', () => {
    it('should return a facility by id', async () => {
      prismaMock.facility.findUnique.mockResolvedValue(mockFacility);

      const response = await request(app).get('/api/facilities/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('1');
    });

    it('should return 404 if not found', async () => {
      prismaMock.facility.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/facilities/999');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/facilities/nearby', () => {
      it('should return nearby facilities', async () => {
          // Mock raw query response
          prismaMock.$queryRaw.mockResolvedValue([mockFacility]);

          const response = await request(app).get('/api/facilities/nearby?lat=12.34&lng=56.78');

          expect(response.status).toBe(200);
          expect(response.body).toHaveLength(1);
          expect(prismaMock.$queryRaw).toHaveBeenCalled();
      });

      it('should validate params', async () => {
          const response = await request(app).get('/api/facilities/nearby');
          expect(response.status).toBe(400);
      });
  });
});
