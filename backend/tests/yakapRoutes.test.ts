import request from 'supertest';
import app from '../src/app';

describe('YAKAP Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/yakap/info', () => {
    it('should return info', async () => {
      const response = await request(app).get('/api/yakap/info');
      expect(response.status).toBe(200);
      expect(response.body.program_name).toBeDefined();
    });
  });
});