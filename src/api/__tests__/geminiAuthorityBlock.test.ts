import { GeminiClient } from '../geminiClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isNegated } from '../../services/emergencyDetector';

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

// Mock the detectors
jest.mock('../../services/emergencyDetector', () => ({
  detectEmergency: jest.fn(() => ({ isEmergency: false, score: 5, matchedKeywords: [] })),
  isNegated: jest.fn(() => ({ negated: false, hasAffirmation: false, contextWindow: '' })),
}));
jest.mock('../../services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: () => ({ isCrisis: false }),
}));

const INTERNAL_TEXT_PATTERN = /\[INTERNAL|\bDEBUG\b|\btriage_readiness\b|\bthreshold\b/i;

const expectCleanAdvice = (advice: string) => {
  expect(advice).not.toMatch(INTERNAL_TEXT_PATTERN);
};

describe('GeminiClient Authority Block', () => {
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

  test('should downgrade Emergency to Health Center if red flags are explicitly denied (prefix)', async () => {
    mockAIResponse({
      recommended_level: 'emergency',
      red_flags: ['chest pain'],
      user_advice: 'ER now.',
      follow_up_questions: [],
      triage_readiness_score: 1.0,
    });

    const profile: any = {
      red_flags_resolved: true,
      red_flag_denials: 'none',
      denial_confidence: 'high',
    };

    const result = await client.assessSymptoms('I have fever', [], undefined, profile);

    expect(result.recommended_level).toBe('health_center');
    expect(result.user_advice).toContain('professional evaluation');
    expect(result.user_advice).not.toMatch(/\bNote: Care level adjusted\b/i);
    expect(result.triage_logic?.adjustments[0].rule).toBe('AUTHORITY_DOWNGRADE');
    expect(result.triage_logic?.original_level).toBe('emergency');
    expect(result.triage_logic?.final_level).toBe('health_center');
    expectCleanAdvice(result.user_advice);
  });

  test('should downgrade Emergency to Health Center if red flags are negated (isNegated)', async () => {
    mockAIResponse({
      recommended_level: 'emergency',
      red_flags: ['chest pain'],
      user_advice: 'ER now.',
      follow_up_questions: [],
      triage_readiness_score: 1.0,
    });

    (isNegated as jest.Mock).mockReturnValue({ negated: true });

    const profile: any = {
      red_flags_resolved: true,
      red_flag_denials: 'I do not have chest pain',
      denial_confidence: 'high',
    };

    const result = await client.assessSymptoms('I have fever', [], undefined, profile);

    expect(isNegated).toHaveBeenCalledWith('i do not have chest pain', 'chest pain');
    expect(result.recommended_level).toBe('health_center');
    expect(result.user_advice).not.toMatch(/\bNote: Care level adjusted\b/i);
    expect(result.triage_logic?.adjustments[0].rule).toBe('AUTHORITY_DOWNGRADE');
    expect(result.triage_logic?.original_level).toBe('emergency');
    expect(result.triage_logic?.final_level).toBe('health_center');
    expectCleanAdvice(result.user_advice);
  });

  test('should RETAIN Emergency if denials are not validated (isNegated returns false)', async () => {
    mockAIResponse({
      recommended_level: 'emergency',
      red_flags: ['chest pain'],
      user_advice: 'ER now.',
      follow_up_questions: [],
      triage_readiness_score: 1.0,
    });

    (isNegated as jest.Mock).mockReturnValue({ negated: false });

    const profile: any = {
      red_flags_resolved: true,
      red_flag_denials: 'Maybe I have it',
      denial_confidence: 'high',
    };

    const result = await client.assessSymptoms('I have fever', [], undefined, profile);

    expect(result.recommended_level).toBe('emergency');
    expect(result.user_advice).toBe('ER now.');
    expect(result.triage_logic?.adjustments.length).toBe(0);
    expectCleanAdvice(result.user_advice);
  });

  test('should RETAIN Emergency if confidence is LOW even if denial is explicit', async () => {
    mockAIResponse({
      recommended_level: 'emergency',
      red_flags: ['chest pain'],
      user_advice: 'ER now.',
      follow_up_questions: [],
      triage_readiness_score: 1.0,
    });

    const profile: any = {
      red_flags_resolved: true,
      red_flag_denials: 'none',
      denial_confidence: 'low',
    };

    const result = await client.assessSymptoms('I have fever', [], undefined, profile);

    expect(result.recommended_level).toBe('emergency');
    expect(result.user_advice).toBe('ER now.');
    expect(result.triage_logic?.adjustments.length).toBe(0);
    expectCleanAdvice(result.user_advice);
  });

  test('should bypass Authority Block if denials do not pass strengthened validation', async () => {
    mockAIResponse({
      recommended_level: 'emergency',
      red_flags: ['chest pain'],
      user_advice: 'ER now.',
      follow_up_questions: [],
      triage_readiness_score: 1.0,
    });

    // isNegated returns false, and not an explicit prefix
    (isNegated as jest.Mock).mockReturnValue({ negated: false });

    const profile: any = {
      red_flags_resolved: true,
      red_flag_denials: 'I am not sure if it is chest pain', // doesn't start with prefix, and isNegated mocked false
      denial_confidence: 'high',
    };

    const result = await client.assessSymptoms('I have fever', [], undefined, profile);

    expect(result.recommended_level).toBe('emergency');
    expect(result.user_advice).toBe('ER now.');
    expect(result.triage_logic?.adjustments.length).toBe(0);
    expectCleanAdvice(result.user_advice);
  });
});
