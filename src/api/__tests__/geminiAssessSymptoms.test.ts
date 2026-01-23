import { GeminiClient } from '../geminiClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AssessmentProfile, AssessmentResponse } from '../../types';
import { detectEmergency, isNegated } from '../../services/emergencyDetector';

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

jest.mock('../../services/emergencyDetector', () => ({
  detectEmergency: jest.fn(() => ({
    isEmergency: false,
    score: 5,
    matchedKeywords: [],
    affectedSystems: [],
  })),
  isNegated: jest.fn(() => ({ negated: false, hasAffirmation: false, contextWindow: '' })),
}));
jest.mock('../../services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: () => ({ isCrisis: false }),
}));

const INTERNAL_TEXT_PATTERN =
  /\[INTERNAL|\bDEBUG\b|\btriage_readiness\b|\bthreshold\b|\brule_triggered\b/i;

const expectCleanAdvice = (advice: string) => {
  expect(advice).not.toMatch(INTERNAL_TEXT_PATTERN);
};

describe('GeminiClient assessSymptoms triage adjustments', () => {
  let client: GeminiClient;
  let mockSendMessage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSendMessage = jest.fn();

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

  const baseProfile: AssessmentProfile = {
    age: null,
    duration: null,
    severity: null,
    progression: null,
    red_flag_denials: null,
    summary: '',
  };

  test('LOW_READINESS_UPGRADE scenario uses metadata and clean advice', async () => {
    mockAIResponse({
      recommended_level: 'self_care',
      red_flags: [],
      user_advice: 'Please rest, hydrate, and monitor your symptoms.',
      follow_up_questions: [],
      triage_readiness_score: 0.3,
      ambiguity_detected: false,
    });

    const result = await client.assessSymptoms('I have mild fever');

    expect(result.recommended_level).toBe('health_center');
    expectCleanAdvice(result.user_advice);
    expect(result.triage_logic?.original_level).toBe('self_care');
    expect(result.triage_logic?.final_level).toBe('health_center');
    expect(result.triage_logic?.adjustments[0].rule).toBe('READINESS_UPGRADE');
    expect(result.triage_logic?.adjustments[0].reason).toContain('triage_readiness_score');
    expect(result.user_advice).toMatchInlineSnapshot(
      '"Please rest, hydrate, and monitor your symptoms."',
    );
  });

  test('no adjustment keeps original and final levels aligned', async () => {
    mockAIResponse({
      recommended_level: 'hospital',
      red_flags: [],
      user_advice: 'Please visit a hospital for further evaluation.',
      follow_up_questions: [],
      triage_readiness_score: 0.95,
      ambiguity_detected: false,
    });

    const result: AssessmentResponse = await client.assessSymptoms(
      'Persistent abdominal pain',
      [],
      undefined,
      undefined,
    );

    expect(result.recommended_level).toBe('hospital');
    expect(result.triage_logic?.original_level).toBe('hospital');
    expect(result.triage_logic?.final_level).toBe('hospital');
    expect(result.triage_logic?.adjustments.length).toBe(0);
    expectCleanAdvice(result.user_advice);
  });

  test('multiple adjustments apply sequentially (readiness then recent-resolved floor)', async () => {
    mockAIResponse({
      recommended_level: 'self_care',
      red_flags: [],
      user_advice: 'Monitor your symptoms and rest.',
      follow_up_questions: [],
      triage_readiness_score: 0.2,
      ambiguity_detected: false,
    });

    const result = await client.assessSymptoms('Headache resolved now', [], undefined, {
      ...baseProfile,
      is_recent_resolved: true,
      resolved_keyword: 'slurred speech',
    });

    expect(result.recommended_level).toBe('hospital');
    expect(result.triage_logic?.adjustments.length).toBe(2);
    expect(result.triage_logic?.adjustments[0].rule).toBe('READINESS_UPGRADE');
    expect(result.triage_logic?.adjustments[1].rule).toBe('RECENT_RESOLVED_FLOOR');
    expectCleanAdvice(result.user_advice);
    expect(result.user_advice).toMatchInlineSnapshot(`
"Monitor your symptoms and rest.

While your symptoms have eased, the type of event you described still needs prompt evaluation to rule out time-sensitive conditions."
`);
  });

  test('regression: triage levels match pre-refactor decision logic', async () => {
    const cases = [
      {
        name: 'red flags upgrade to emergency',
        response: {
          recommended_level: 'hospital',
          red_flags: ['chest pain'],
          user_advice: 'Please seek care.',
          follow_up_questions: [],
          triage_readiness_score: 0.9,
          ambiguity_detected: false,
        },
        profile: undefined,
        expected: 'emergency',
      },
      {
        name: 'readiness upgrade to health center',
        response: {
          recommended_level: 'self_care',
          red_flags: [],
          user_advice: 'Please rest.',
          follow_up_questions: [],
          triage_readiness_score: 0.4,
          ambiguity_detected: false,
        },
        profile: undefined,
        expected: 'health_center',
      },
      {
        name: 'recent resolved forces hospital',
        response: {
          recommended_level: 'self_care',
          red_flags: [],
          user_advice: 'Please rest.',
          follow_up_questions: [],
          triage_readiness_score: 0.9,
          ambiguity_detected: false,
        },
        profile: { ...baseProfile, is_recent_resolved: true, resolved_keyword: 'chest pain' },
        expected: 'hospital',
      },
      {
        name: 'authority downgrade on high-confidence denial',
        response: {
          recommended_level: 'emergency',
          red_flags: ['chest pain'],
          user_advice: 'ER now.',
          follow_up_questions: [],
          triage_readiness_score: 0.9,
          ambiguity_detected: false,
        },
        profile: {
          ...baseProfile,
          red_flags_resolved: true,
          red_flag_denials: 'none',
          denial_confidence: 'high',
        },
        expected: 'health_center',
      },
      {
        name: 'authority retain on low-confidence denial',
        response: {
          recommended_level: 'emergency',
          red_flags: ['chest pain'],
          user_advice: 'ER now.',
          follow_up_questions: [],
          triage_readiness_score: 0.9,
          ambiguity_detected: false,
        },
        profile: {
          ...baseProfile,
          red_flags_resolved: true,
          red_flag_denials: 'none',
          denial_confidence: 'low',
        },
        expected: 'emergency',
      },
    ];

    for (const testCase of cases) {
      (detectEmergency as jest.Mock).mockReturnValue({
        isEmergency: false,
        score: 5,
        matchedKeywords: [],
        affectedSystems: [],
      });
      (isNegated as jest.Mock).mockReturnValue({ negated: false });
      mockAIResponse(testCase.response);
      const result = await client.assessSymptoms('Case', [], undefined, testCase.profile);
      expect(result.recommended_level).toBe(testCase.expected);
    }
  });

  test('user-facing text remains professional and free of internal markers', async () => {
    mockAIResponse({
      recommended_level: 'health_center',
      red_flags: [],
      user_advice: 'Please schedule a clinic visit for evaluation.',
      follow_up_questions: [],
      triage_readiness_score: 0.85,
      ambiguity_detected: false,
    });

    const result = await client.assessSymptoms('Cough and sore throat');

    expectCleanAdvice(result.user_advice);
    expect(result.user_advice).toMatchInlineSnapshot(
      '"Please schedule a clinic visit for evaluation."',
    );
  });

  test('type safety: returned value conforms to AssessmentResponse', async () => {
    mockAIResponse({
      recommended_level: 'health_center',
      red_flags: [],
      user_advice: 'Please visit a clinic for evaluation.',
      follow_up_questions: [],
      triage_readiness_score: 0.9,
      ambiguity_detected: false,
    });

    const result: AssessmentResponse = await client.assessSymptoms(
      'Cough and fever',
      [],
      undefined,
      undefined,
    );

    expect(result.recommended_level).toBe('health_center');
  });
});
