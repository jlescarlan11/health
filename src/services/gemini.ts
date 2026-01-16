import { GoogleGenerativeAI, GenerativeModel, GenerateContentRequest } from '@google/generative-ai';
import Constants from 'expo-constants';

const API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

/**
 * Helper to execute Gemini generation with exponential backoff retry logic.
 */
const generateContentWithRetry = async (
  model: GenerativeModel,
  params:
    | string
    | (string | { inlineData: { data: string; mimeType: string } })[]
    | GenerateContentRequest,
): Promise<string> => {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const result = await model.generateContent(params);
      const response = await result.response;
      return response.text();
    } catch (error: unknown) {
      attempt++;
      const err = error as { message?: string; status?: number };
      const isOverloaded = err.message?.includes('503') || err.status === 503;

      console.warn(`[Gemini Service] Attempt ${attempt} failed. Error: ${err.message}`);

      if (attempt >= MAX_RETRIES) {
        console.error('[Gemini Service] Max retries reached. Throwing error.');
        if (isOverloaded) {
          throw new Error('The AI service is currently overloaded. Please try again in a moment.');
        }
        throw err;
      }

      // Calculate delay with exponential backoff (1s, 2s, 4s...)
      const delay = BASE_DELAY * Math.pow(2, attempt - 1);
      console.log(`[Gemini Service] Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed to connect to AI service after multiple attempts.');
};

export interface ClarifyingQuestion {
  id: 'age' | 'duration' | 'severity' | 'progression' | 'red_flag_denials';
  text: string;
  type: 'choice' | 'text';
  options?: string[];
}

export interface ClarifyingQuestionsResponse {
  questions: ClarifyingQuestion[];
}

/**
 * Robustly parses and validates clarifying questions from AI response.
 */
export const parseClarifyingQuestions = (text: string): ClarifyingQuestionsResponse => {
  try {
    // 1. Extract JSON block using regex
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 2. Validate top-level structure
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid response structure: "questions" array missing');
    }

    // 3. Validate and sanitize each question
    const validatedQuestions: ClarifyingQuestion[] = parsed.questions
      .map((q: any) => {
        // Required fields
        if (!q.id || !q.text || !q.type) {
          console.warn('[Gemini Parser] Skipping malformed question:', q);
          return null;
        }

        // Validate ID enum
        const validIds = ['age', 'duration', 'severity', 'progression', 'red_flag_denials'];
        if (!validIds.includes(q.id)) {
          console.warn('[Gemini Parser] Invalid question ID:', q.id);
          return null;
        }

        // Validate type
        if (q.type !== 'choice' && q.type !== 'text') {
          console.warn('[Gemini Parser] Invalid question type:', q.type);
          return null;
        }

        // Validate options for choice type
        if (q.type === 'choice' && (!q.options || !Array.isArray(q.options) || q.options.length === 0)) {
          console.warn('[Gemini Parser] Choice question missing options:', q.id);
          return null;
        }

        return {
          id: q.id as ClarifyingQuestion['id'],
          text: String(q.text),
          type: q.type as ClarifyingQuestion['type'],
          options: q.options ? q.options.map(String) : undefined,
        };
      })
      .filter((q: ClarifyingQuestion | null): q is ClarifyingQuestion => q !== null);

    if (validatedQuestions.length === 0) {
      throw new Error('No valid clarifying questions could be parsed');
    }

    return { questions: validatedQuestions };
  } catch (error) {
    console.error('[Gemini Parser] Parsing Error:', error);
    throw new Error('Failed to process health assessment questions. Please try again.');
  }
};

export const getGeminiResponse = async (prompt: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    return await generateContentWithRetry(model, prompt);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};

/**
 * Transcribes audio data using Gemini 2.5 Flash.
 * @param base64Audio Base64 encoded audio data
 * @param mimeType MIME type of the audio (e.g., 'audio/wav', 'audio/m4a')
 */
export const audioToText = async (base64Audio: string, mimeType: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = [
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType,
        },
      },
      'Transcribe this audio. Return only the transcription text.',
    ];
    return await generateContentWithRetry(model, prompt);
  } catch (error) {
    console.error('Gemini Audio Transcription Error:', error);
    throw error;
  }
};
