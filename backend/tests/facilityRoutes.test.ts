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
    yakap_accredited: true,
    services: ['Checkup'],
    operating_hours: { description: 'Mon-Fri: 8am-5pm' },
    photos: ['url1'],
    barangay: 'Test Barangay',
    specialized_services: [],
    is_24_7: false,
    capacity: 50,
    live_metrics: {},
    busy_patterns: {},
    contacts: [
      { phoneNumber: '123-456-7890', platform: 'phone', role: 'Reception', contactName: null },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/facilities', () => {
    it('should return a list of facilities with frontend structure', async () => {
      prismaMock.facility.findMany.mockResolvedValue([mockFacility]);

      const response = await request(app).get('/api/facilities');

      expect(response.status).toBe(200);
      expect(response.body.facilities).toHaveLength(1);
      expect(response.body.facilities[0].name).toBe('Test Facility');
      // Check transformed fields
      expect(response.body.facilities[0].yakapAccredited).toBe(true);
      expect(response.body.facilities[0].hours).toBe('Mon-Fri: 8am-5pm');
      expect(response.body.facilities[0].photoUrl).toBe('url1');

      expect(prismaMock.facility.findMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
      expect(prismaMock.facility.count).not.toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      prismaMock.facility.findMany.mockResolvedValue([mockFacility]);

      const response = await request(app).get('/api/facilities?type=hospital');

      expect(response.status).toBe(200);
      expect(prismaMock.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: 'hospital' } }),
      );
    });

    it('should paginate when limit is provided', async () => {
      prismaMock.facility.findMany.mockResolvedValue([mockFacility]);
      prismaMock.facility.count.mockResolvedValue(1);

      const response = await request(app).get('/api/facilities?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(10);
      expect(response.body.offset).toBe(0);
      expect(response.body.total).toBe(1);
      expect(prismaMock.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
        }),
      );
      expect(prismaMock.facility.count).toHaveBeenCalledTimes(1);
    });

    it('should fetch all when limit is -1 (ignores offset)', async () => {
      prismaMock.facility.findMany.mockResolvedValue([mockFacility]);

      const response = await request(app).get('/api/facilities?limit=-1&offset=10');

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(1);
      expect(response.body.offset).toBe(0);
      expect(response.body.total).toBe(1);
      expect(prismaMock.facility.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ take: expect.anything() }),
      );
      expect(prismaMock.facility.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ skip: expect.anything() }),
      );
      expect(prismaMock.facility.count).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/facilities/:id', () => {
    it('should return a facility by id with frontend structure', async () => {
      prismaMock.facility.findUnique.mockResolvedValue(mockFacility);

      const response = await request(app).get('/api/facilities/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('1');
      expect(response.body.yakapAccredited).toBe(true);
      expect(response.body.hours).toBe('Mon-Fri: 8am-5pm');
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
      prismaMock.$queryRaw.mockResolvedValue([{ id: '1', distance: 1.5 }]);
      prismaMock.facility.findMany.mockResolvedValue([mockFacility]);

      const response = await request(app).get('/api/facilities/nearby?lat=12.34&lng=56.78');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].yakapAccredited).toBe(true);
      expect(response.body[0].distance).toBe(1.5);
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(prismaMock.facility.findMany).toHaveBeenCalled();
    });

    it('should validate params', async () => {
      const response = await request(app).get('/api/facilities/nearby');
      expect(response.status).toBe(400);
    });
  });
});
