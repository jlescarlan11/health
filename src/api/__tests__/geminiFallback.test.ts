import { prioritizeQuestions } from '../../utils/aiUtils';
import { DEFAULT_RED_FLAG_QUESTION } from '../../constants/clinical';

const mockGenerateContent = jest.fn();
let geminiModule: typeof import('../geminiClient');
let generateAssessmentPlan: (symptom: string) => Promise<{ questions: any[]; intro?: string }>;
const createLLMResult = (
  payload = { questions: [{ id: 'q1', text: 'Test Q' }], intro: 'Test Intro' },
) => ({
  response: {
    text: jest.fn().mockReturnValue(JSON.stringify(payload)),
  },
});

// Mock dependencies
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: (...args: any[]) => mockGenerateContent(...args),
      }),
    })),
  };
});

jest.mock('../../utils/aiUtils', () => {
  const actual = jest.requireActual('../../utils/aiUtils');
  return {
    ...actual,
    prioritizeQuestions: jest.fn(),
    parseAndValidateLLMResponse: jest.fn().mockImplementation((text) => JSON.parse(text)),
  };
});

describe('Gemini Service Fallback', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    console.error = jest.fn(); // Suppress expected error logs
    console.log = jest.fn();   // Suppress expected logs
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue(createLLMResult());
    geminiModule = require('../geminiClient');
    generateAssessmentPlan = geminiModule.geminiClient.generateAssessmentPlan.bind(
      geminiModule.geminiClient,
    );
  });

  it('should inject default red flags when prioritizeQuestions throws', async () => {
    // 1. Mock prioritizeQuestions to throw
    (prioritizeQuestions as jest.Mock).mockImplementation(() => {
      throw new Error('Test Error: Prioritization Crashed');
    });

    // 2. Call function
    const result = await generateAssessmentPlan('headache');

    // 3. Verify Fallback behavior
    expect(result.questions).toBeDefined();
    // Should have 2 questions: 'q1' (recovered) + 'red_flags' (injected)
    expect(result.questions.length).toBe(2);
    
    const redFlagQ = result.questions.find(q => q.id === 'red_flags');
    expect(redFlagQ).toBeDefined();
    expect(redFlagQ).toEqual(DEFAULT_RED_FLAG_QUESTION);
    
    // Original question should be preserved
    expect(result.questions.find(q => q.id === 'q1')).toBeDefined();
  });

  it('should handle critically malformed input data gracefully', async () => {
    // 1. Mock AI to return empty questions
    mockGenerateContent.mockResolvedValue(createLLMResult({ questions: [] as any[] }));
    
    // 2. Mock prioritizeQuestions to throw (simulating a crash on bad data)
    (prioritizeQuestions as jest.Mock).mockImplementation(() => {
        throw new TypeError('Cannot read properties of null');
    });

    const result = await generateAssessmentPlan('headache');

    expect(result.questions).toBeDefined();
    // Should have 1 question: 'red_flags' (injected) since original was empty
    expect(result.questions.length).toBe(1);
    expect(result.questions[0].id).toBe('red_flags');
  });

  it('should fall back to the trauma safety golden set when Gemini fails in a trauma context', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Service unavailable'));

    const result = await generateAssessmentPlan('knee injury with bleeding wound');

    expect(result.questions).toBeDefined();
    expect(result.questions.some((q) => q.text.includes('bear weight'))).toBe(true);
    expect(result.questions.some((q) => q.text.toLowerCase().includes('active bleeding'))).toBe(true);
    expect(result.questions.some((q) => q.id === 'trauma_mechanism')).toBe(true);
    expect(result.questions.some((q) => q.id === 'general_age')).toBe(false);
  }, 15000);
});
