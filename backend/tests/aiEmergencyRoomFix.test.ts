import request from 'supertest';
import { prismaMock } from './jest.setup';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('@google/generative-ai');

describe('AI Emergency Room Normalization', () => {
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

  it('should normalize "Emergency Room" to "Emergency" and find facilities', async () => {
    // Mock AI response returning "Emergency Room"
    const aiResponseJSON = JSON.stringify({
      recommendation: 'Emergency Room',
      reasoning: 'Life-threatening symptoms',
      triage_readiness_score: 1.0,
      ambiguity_detected: false,
      relevant_services: ['Emergency'],
    });

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => aiResponseJSON,
      },
    });

    // Mock facility query results
    const mockFacility = {
      id: 'emergency-1',
      name: 'Naga City General Hospital',
      type: 'Hospital',
      address: 'Main Road',
      latitude: 0,
      longitude: 0,
      phone: '911',
      yakap_accredited: true,
      services: ['Emergency'],
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
    prismaMock.facility.findMany.mockResolvedValueOnce([mockFacility]);

    const response = await request(app).post('/api/ai/navigate').send({
      symptoms: 'severe chest pain and difficulty breathing',
      severity: 'high',
    });

    // Verify normalization
    expect(response.status).toBe(200);
    expect(response.body.recommendation).toBe('Emergency'); // Should be normalized from "Emergency Room"
    expect(response.body.facilities).toHaveLength(1);
    expect(response.body.facilities[0].name).toBe('Naga City General Hospital');

    // Verify keywords used in query
    expect(prismaMock.facility.findMany).toHaveBeenCalledTimes(1);
    const lastCall = prismaMock.facility.findMany.mock.calls[0][0];
    const where = lastCall?.where as any;

    // Check that 'Emergency' and 'Hospital' keywords were used
    const typeFilter = where.AND.find((f: any) => f.OR && f.OR[0].type);
    const keywords = typeFilter.OR.map((o: any) => o.type.contains);
    expect(keywords).toContain('Emergency');
    expect(keywords).toContain('Hospital');
  });
});
