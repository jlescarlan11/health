import request from 'supertest';
import app from '../src/app';
import { prismaMock } from './jest.setup';

describe('Symptom Routes', () => {
  const mockSymptom = {
    id: '1',
    name: 'Fever',
    category: 'common',
    keywords: ['hot', 'temperature'],
    red_flags: ['high fever > 40'],
    recommended_care: 'self_care',
    follow_up_questions: ['How long?'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/symptoms', () => {
    it('should return all symptoms', async () => {
      prismaMock.symptom.findMany.mockResolvedValue([mockSymptom]);

      const response = await request(app).get('/api/symptoms');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Fever');
    });
  });

  describe('GET /api/symptoms/search', () => {
    it('should search symptoms', async () => {
      prismaMock.symptom.findMany.mockResolvedValue([mockSymptom]);

      const response = await request(app).get('/api/symptoms/search?q=fever');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should return 400 if q is missing', async () => {
      const response = await request(app).get('/api/symptoms/search');
      expect(response.status).toBe(400);
    });
  });
});
