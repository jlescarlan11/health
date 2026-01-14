import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './jest.setup';

describe('YAKAP Routes', () => {
  const mockEnrollment = {
    id: '1',
    user_id: 'test-uid',
    phone_number: '1234567890',
    enrollment_pathway: 'egovph',
    progress_step: 0,
    completed: false,
    documents_uploaded: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

  describe('POST /api/yakap/enrollment', () => {
    it('should enroll user without authentication', async () => {
      prismaMock.userEnrollment.findUnique.mockResolvedValue(null);
      prismaMock.userEnrollment.create.mockResolvedValue(mockEnrollment);

      const response = await request(app)
        .post('/api/yakap/enrollment')
        .send({ user_id: 'test-uid', phone_number: '1234567890' });

      expect(response.status).toBe(201);
      expect(response.body.user_id).toBe('test-uid');
    });

    it('should return 409 if already enrolled', async () => {
      prismaMock.userEnrollment.findUnique.mockResolvedValue(mockEnrollment);

      const response = await request(app)
        .post('/api/yakap/enrollment')
        .send({ user_id: 'test-uid', phone_number: '1234567890' });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/yakap/enrollment/:userId', () => {
    it('should return status', async () => {
      prismaMock.userEnrollment.findUnique.mockResolvedValue(mockEnrollment);

      const response = await request(app).get('/api/yakap/enrollment/test-uid');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('1');
    });
  });
});
