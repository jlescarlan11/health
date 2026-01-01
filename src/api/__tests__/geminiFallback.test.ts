import { GeminiClient } from '../geminiClient';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Mocks
jest.mock("@google/generative-ai");
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock("expo-constants", () => ({
  expoConfig: { extra: { geminiApiKey: "test-key" } }
}));
// We mock the detectors to return false so we test the AI logic specifically
jest.mock("../../services/emergencyDetector", () => ({
  detectEmergency: () => ({ isEmergency: false })
}));
jest.mock("../../services/mentalHealthDetector", () => ({
  detectMentalHealthCrisis: () => ({ isCrisis: false })
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
          sendMessage: mockSendMessage
        })
      })
    }));

    client = new GeminiClient();
  });

  const mockAIResponse = (responseObj: any) => {
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => JSON.stringify(responseObj)
      }
    });
  };

  test('should upgrade Self-Care to Health Center if confidence is low', async () => {
    mockAIResponse({
      recommended_level: "self_care",
      confidence_score: 0.5,
      ambiguity_detected: false,
      assessment_summary: "Rest at home.",
      follow_up_questions: [],
      red_flags: []
    });

    const result = await client.assessSymptoms("mild headache");
    expect(result.recommended_level).toBe("health_center");
    expect(result.assessment_summary).toContain("upgraded");
  });

  test('should upgrade Health Center to Hospital if ambiguity is detected', async () => {
    mockAIResponse({
      recommended_level: "health_center",
      confidence_score: 0.9,
      ambiguity_detected: true,
      assessment_summary: "Go to clinic.",
      follow_up_questions: [],
      red_flags: []
    });

    const result = await client.assessSymptoms("stomach pain");
    expect(result.recommended_level).toBe("hospital");
  });

  test('should force Emergency if red flags are present but AI recommends Hospital', async () => {
    mockAIResponse({
      recommended_level: "hospital",
      confidence_score: 0.9,
      ambiguity_detected: false,
      red_flags: ["Chest pain"],
      assessment_summary: "Hospital checkup needed.",
      follow_up_questions: []
    });

    const result = await client.assessSymptoms("chest pain");
    expect(result.recommended_level).toBe("emergency");
    expect(result.assessment_summary).toContain("Upgraded to Emergency");
  });

  test('should NOT upgrade if confidence is high and no ambiguity', async () => {
    mockAIResponse({
      recommended_level: "self_care",
      confidence_score: 0.95,
      ambiguity_detected: false,
      assessment_summary: "Rest at home.",
      follow_up_questions: [],
      red_flags: []
    });

    const result = await client.assessSymptoms("mild headache");
    expect(result.recommended_level).toBe("self_care");
    expect(result.assessment_summary).not.toContain("upgraded");
  });
});
