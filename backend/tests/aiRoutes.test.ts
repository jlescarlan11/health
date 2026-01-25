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
      // Mock AI response
      const aiResponseJSON = JSON.stringify({
        recommendation: 'Hospital',
        reasoning: 'Serious symptoms',
        triage_readiness_score: 0.95,
        ambiguity_detected: false,
        relevant_services: ['Emergency'],
        facility_type_constraints: ['Hospital'],
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => aiResponseJSON,
        },
      });

      // Mock facility query results for deterministic selection
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
        capacity: 50,
        live_metrics: {},
        busy_patterns: {},
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
      expect(prismaMock.facility.findMany).toHaveBeenCalledTimes(1);

      const lastCall = prismaMock.facility.findMany.mock.calls[0][0];
      const { where, take, orderBy } = lastCall as any;
      expect(take).toBe(3);
      expect(orderBy).toEqual({ name: 'asc' });
      expect(where).toHaveProperty('AND');
      expect(where.AND).toHaveLength(2);
    });

    it('still returns facilities after facility-list prompt injection was removed', async () => {
      const minimalResponse = JSON.stringify({
        recommendation: 'Health Center',
        reasoning: 'Manageable at the local clinic',
        triage_readiness_score: 0.65,
        ambiguity_detected: false,
        relevant_services: [],
      });

      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => minimalResponse,
        },
      });

      const facilityA = {
        id: '2',
        name: 'Neighborhood Health Unit',
        type: 'Health Center',
        address: '456 Health St',
        latitude: 13.6,
        longitude: 123.19,
        phone: '555',
        yakap_accredited: false,
        services: ['Primary Care'],
        operating_hours: {},
        photos: [],
        barangay: null,
        specialized_services: [],
        is_24_7: false,
        capacity: 50,
        live_metrics: {},
        busy_patterns: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const facilityB = {
        id: '3',
        name: 'Downtown Hospital',
        type: 'Hospital',
        address: '789 Care Ave',
        latitude: 13.61,
        longitude: 123.18,
        phone: '556',
        yakap_accredited: true,
        services: ['Emergency', 'Consultation'],
        operating_hours: {},
        photos: [],
        barangay: null,
        specialized_services: [],
        is_24_7: true,
        capacity: 50,
        live_metrics: {},
        busy_patterns: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.facility.findMany.mockResolvedValueOnce([facilityA, facilityB]);

      const response = await request(app).post('/api/ai/navigate').send({
        symptoms: 'mild headache and blurred vision',
        severity: 'moderate',
      });

      expect(response.status).toBe(200);
      expect(response.body.facilities).toHaveLength(2);
      expect(prismaMock.facility.findMany).toHaveBeenCalledTimes(1);
      expect(response.body.facilities[0].name).toBe('Neighborhood Health Unit');
    });

    it('should handle missing symptoms', async () => {
      const response = await request(app).post('/api/ai/navigate').send({});
      expect(response.status).toBe(400);
    });
  });
});
