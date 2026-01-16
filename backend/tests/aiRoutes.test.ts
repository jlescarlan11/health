import request from 'supertest';
import { prismaMock } from './jest.setup';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('@google/generative-ai');

describe('AI Routes', () => {
  let app: import('express').Application;
  let mockGenerateContent: jest.Mock;

  beforeAll(() => {
    mockGenerateContent = jest.fn();
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }));

    // Import app after mocking
    app = require('../src/app').default;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ai/navigate', () => {
    it('should return navigation recommendations', async () => {
      // Mock facilities fetch
      prismaMock.facility.findMany.mockResolvedValueOnce([]); // context

      // Mock AI response
      const aiResponseJSON = JSON.stringify({
        recommendation: 'Hospital',
        reasoning: 'Serious symptoms',
        recommended_facility_ids: ['1'],
      });

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => aiResponseJSON,
        },
      });

      // Mock facility fetch for recommendations
      const mockFacility = {
        id: '1',
        name: 'Test Hospital',
        type: 'hospital',
        address: '123 St',
        latitude: 0,
        longitude: 0,
        phone: '123',
        yakap_accredited: true,
        services: [],
        operating_hours: {},
        photos: [],
        barangay: null,
        specialized_services: [],
        is_24_7: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.facility.findMany.mockResolvedValueOnce([mockFacility]);

      const response = await request(app).post('/api/ai/navigate').send({
        symptoms: 'chest pain',
        severity: 'high',
      });

      expect(response.status).toBe(200);
      expect(response.body.recommendation).toBe('Hospital');
      expect(response.body.facilities).toHaveLength(1);
    });

    it('should handle missing symptoms', async () => {
      const response = await request(app).post('/api/ai/navigate').send({});
      expect(response.status).toBe(400);
    });
  });
});
