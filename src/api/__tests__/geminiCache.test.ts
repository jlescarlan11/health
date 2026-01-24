import AsyncStorage from '@react-native-async-storage/async-storage';
import { GeminiClient } from '../geminiClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

const expoConstantsMock = {
  expoConfig: { extra: { geminiApiKey: 'test-key', forceEmergencyLocalFallback: false } },
};

jest.mock('expo-constants', () => expoConstantsMock);
jest.mock('@google/generative-ai');
jest.mock('../../services/emergencyDetector', () => ({
  detectEmergency: jest.fn(() => ({
    isEmergency: false,
    score: 0,
    matchedKeywords: [],
    affectedSystems: [],
  })),
  isNegated: jest.fn(() => ({ negated: false, hasAffirmation: false, contextWindow: '' })),
}));
jest.mock('../../services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: () => ({ isCrisis: false }),
}));

describe('GeminiClient caching behavior', () => {
  let client: GeminiClient;
  let mockSendMessage: jest.Mock;
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMessage = jest.fn();
    mockGenerateContent = jest.fn();

    const mockModel = {
      startChat: () => ({
        sendMessage: mockSendMessage,
      }),
      generateContent: mockGenerateContent,
    };

    (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue(mockModel),
    }));

    client = new GeminiClient();
  });

  it('caches clinical profile extractions for identical history inputs', async () => {
    await AsyncStorage.clear();

    const profilePayload = {
      triage_readiness_score: 0.85,
      symptom_category: 'simple',
      severity: 'moderate',
      duration: '2 days',
    };

    mockGenerateContent.mockResolvedValue({
      response: Promise.resolve({
        text: () => JSON.stringify(profilePayload),
      }),
    });

    const history = [{ role: 'user', text: 'Chest pain, radiating to the arm' }];

    const firstProfile = await client.extractClinicalProfile(history);
    await (client as any).profileCacheQueue;
    const secondProfile = await client.extractClinicalProfile(history);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(secondProfile.triage_readiness_score).toBe(firstProfile.triage_readiness_score);
  });

  it('reuses cached assessSymptoms results when only distance details change', async () => {
    await AsyncStorage.clear();

    const aiResponse = {
      recommended_level: 'hospital',
      user_advice: 'Please proceed to the nearest hospital.',
      follow_up_questions: [],
      red_flags: [],
      relevant_services: ['Emergency'],
      triage_readiness_score: 0.92,
      ambiguity_detected: false,
    };

    mockSendMessage.mockResolvedValue({
      response: {
        text: () => JSON.stringify(aiResponse),
      },
    });

    const stableKey = 'stable-case-key';
    const firstResult = await client.assessSymptoms(
      'Severe chest pain 5km from home',
      [],
      undefined,
      undefined,
      stableKey,
    );

    await (client as any).cacheQueue;

    const secondResult = await client.assessSymptoms(
      'Severe chest pain 10km from home',
      [],
      undefined,
      undefined,
      stableKey,
    );

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(secondResult.recommended_level).toBe(firstResult.recommended_level);
  });
});
