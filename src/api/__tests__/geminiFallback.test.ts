import { generateAssessmentPlan } from '../../services/gemini';
import { prioritizeQuestions } from '../../utils/aiUtils';
import { DEFAULT_RED_FLAG_QUESTION } from '../../constants/clinical';

let mockGenerateContent: jest.Mock;
const createLLMResult = (
  payload = { questions: [{ id: 'q1', text: 'Test Q' }], intro: 'Test Intro' },
) => ({
  response: {
    text: jest.fn().mockReturnValue(JSON.stringify(payload)),
  },
});

// Mock dependencies
jest.mock('@google/generative-ai', () => {
  mockGenerateContent = jest.fn();
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
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
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Suppress expected error logs
    console.log = jest.fn();   // Suppress expected logs
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue(createLLMResult());
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
    // Mock parse to return something that causes issues if accessed directly (though our safe code handles it)
    const { parseAndValidateLLMResponse } = require('../../utils/aiUtils');
    parseAndValidateLLMResponse.mockReturnValue({ questions: null }); // Parsing returns null questions

    (prioritizeQuestions as jest.Mock).mockImplementation(() => {
        throw new TypeError('Cannot read properties of null');
    });

    const result = await generateAssessmentPlan('headache');

    expect(result.questions).toBeDefined();
    // Should have 1 question: 'red_flags' (injected) since original was null/empty
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
  });
});
