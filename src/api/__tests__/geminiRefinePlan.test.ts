import { AssessmentProfile } from '../../types/triage';

describe('GeminiClient.refineAssessmentPlan', () => {
  let mockGenerateContent: jest.Mock;
  let geminiModule: typeof import('../geminiClient');
  let refineAssessmentPlan: (currentProfile: AssessmentProfile, remainingCount: number) => Promise<any[]>;

  beforeEach(() => {
    jest.resetModules();
    mockGenerateContent = jest.fn();

    // Mock AsyncStorage
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      getAllKeys: jest.fn(() => Promise.resolve([])),
      multiGet: jest.fn(() => Promise.resolve([])),
      multiRemove: jest.fn(),
    }));

    // Mock GoogleGenerativeAI
    jest.doMock('@google/generative-ai', () => {
      return {
        GoogleGenerativeAI: jest.fn(() => ({
          getGenerativeModel: jest.fn(() => ({
            generateContent: mockGenerateContent,
          })),
        })),
      };
    });

    // Re-require the module under test so it picks up the new mock
    geminiModule = require('../geminiClient');
    refineAssessmentPlan = geminiModule.geminiClient.refineAssessmentPlan.bind(
      geminiModule.geminiClient,
    );
  });

  const mockProfile: AssessmentProfile = {
    age: '30',
    duration: '2 days',
    severity: 'moderate',
    progression: null,
    red_flag_denials: null,
    summary: 'Headache',
    triage_readiness_score: 0.5,
    symptom_category: 'complex',
  };

  it('should successfully refine the plan', async () => {
    const mockResponse = {
      questions: [
        {
          id: 'refined_1',
          text: 'Refined Question 1',
          type: 'text',
          tier: 2,
          is_red_flag: false,
        },
        {
          id: 'refined_2',
          text: 'Refined Question 2',
          type: 'single-select',
          tier: 3,
          is_red_flag: false,
        },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockResponse),
      },
    });

    const questions = await refineAssessmentPlan(mockProfile, 2);

    expect(questions).toHaveLength(2);
    expect(questions[0].id).toBe('refined_1');
    expect(questions[1].id).toBe('refined_2');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should handle JSON parsing errors gracefully', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Invalid JSON',
      },
    });

    const questions = await refineAssessmentPlan(mockProfile, 2);

    expect(questions).toEqual([]);
  });

  it('should handle API errors gracefully', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Error'));

    const questions = await refineAssessmentPlan(mockProfile, 2);

    expect(questions).toEqual([]);
  });
});