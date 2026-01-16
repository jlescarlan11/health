describe('Gemini Service Retry Logic', () => {
  let getGeminiResponse: (prompt: string) => Promise<string>;
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockGenerateContent = jest.fn();

    // mockGenerateContent is in scope here because doMock is not hoisted
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
    const geminiModule = require('../gemini');
    getGeminiResponse = geminiModule.getGeminiResponse;
  });

  it('should succeed on first attempt', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Success response',
      },
    });

    const result = await getGeminiResponse('test prompt');
    expect(result).toBe('Success response');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  }, 10000);

  it('should retry on failure and succeed', async () => {
    // Fail twice, then succeed
    mockGenerateContent
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValue({
        response: {
          text: () => 'Success response',
        },
      });

    const start = Date.now();
    const result = await getGeminiResponse('test prompt');
    const duration = Date.now() - start;

    expect(result).toBe('Success response');
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    
    // Expect delay: 1000 + 2000 = 3000ms minimum
    expect(duration).toBeGreaterThanOrEqual(3000);
  }, 15000);

  it('should throw after max retries', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 Service Unavailable'));

    const start = Date.now();
    try {
      await getGeminiResponse('test prompt');
      throw new Error('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('The AI service is currently overloaded');
    }
    const duration = Date.now() - start;

    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    expect(duration).toBeGreaterThanOrEqual(3000);
  }, 15000);

  it('should throw generic error after max retries if not 503', async () => {
     mockGenerateContent.mockRejectedValue(new Error('Random Error'));
     
     try {
       await getGeminiResponse('test prompt');
       throw new Error('Should have thrown');
     } catch (error: any) {
       expect(error.message).toBe('Random Error');
     }
     
     expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  }, 15000);
});
