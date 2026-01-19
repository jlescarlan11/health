import { GeminiClient } from '../geminiClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mocks
jest.mock('@google/generative-ai');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { geminiApiKey: 'test-key' } },
}));
// We mock the detectors to return false so we test the AI logic specifically
jest.mock('../../services/emergencyDetector', () => ({
  detectEmergency: () => ({ isEmergency: false }),
}));
jest.mock('../../services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: () => ({ isCrisis: false }),
}));

describe('GeminiClient Fallback Strategy', () => {
  let client: GeminiClient;
  let mockSendMessage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSendMessage = jest.fn();

    // Mock the chain: getGenerativeModel -> startChat -> sendMessage
    (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: () => ({
        startChat: () => ({
          sendMessage: mockSendMessage,
        }),
      }),
    }));

    client = new GeminiClient();
  });

  const mockAIResponse = (responseObj: Record<string, unknown>) => {
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => JSON.stringify(responseObj),
      },
    });
  };

  test('should upgrade Self-Care to Health Center if readiness is low', async () => {
    mockAIResponse({
      recommended_level: 'self_care',
      triage_readiness_score: 0.5,
      ambiguity_detected: false,
      user_advice: 'Rest at home.',
      follow_up_questions: [],
      red_flags: [],
    });

    const result = await client.assessSymptoms('mild headache');
    expect(result.recommended_level).toBe('health_center');
    expect(result.user_advice).toContain('upgraded');
  });

  test('should upgrade Health Center to Hospital if ambiguity is detected', async () => {
    mockAIResponse({
      recommended_level: 'health_center',
      triage_readiness_score: 0.9,
      ambiguity_detected: true,
      user_advice: 'Go to clinic.',
      follow_up_questions: [],
      red_flags: [],
    });

    const result = await client.assessSymptoms('stomach pain');
    expect(result.recommended_level).toBe('hospital');
  });

  test('should force Emergency if red flags are present but AI recommends Hospital', async () => {
    mockAIResponse({
      recommended_level: 'hospital',
      triage_readiness_score: 0.9,
      ambiguity_detected: false,
      red_flags: ['Chest pain'],
      user_advice: 'Hospital checkup needed.',
      follow_up_questions: [],
    });

    const result = await client.assessSymptoms('chest pain');
    expect(result.recommended_level).toBe('emergency');
    expect(result.user_advice).toContain('Upgraded to Emergency');
  });

  test('should NOT upgrade if readiness is high and no ambiguity', async () => {
    mockAIResponse({
      recommended_level: 'self_care',
      triage_readiness_score: 0.95,
      ambiguity_detected: false,
      user_advice: 'Rest at home.',
      follow_up_questions: [],
      red_flags: [],
    });

    const result = await client.assessSymptoms('mild headache');
    expect(result.recommended_level).toBe('self_care');
    expect(result.user_advice).not.toContain('upgraded');
  });
});