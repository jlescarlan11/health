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
  params: string | (string | { inlineData: { data: string; mimeType: string } })[] | GenerateContentRequest
): Promise<string> => {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const result = await model.generateContent(params);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      attempt++;
      const isOverloaded = error.message?.includes('503') || error.status === 503;
      const isThrottled = error.message?.includes('429') || error.status === 429;
      
      console.warn(`[Gemini Service] Attempt ${attempt} failed. Error: ${error.message}`);

      if (attempt >= MAX_RETRIES) {
        console.error('[Gemini Service] Max retries reached. Throwing error.');
        if (isOverloaded) {
           throw new Error('The AI service is currently overloaded. Please try again in a moment.');
        }
        throw error;
      }

      // Calculate delay with exponential backoff (1s, 2s, 4s...)
      const delay = BASE_DELAY * Math.pow(2, attempt - 1);
      console.log(`[Gemini Service] Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed to connect to AI service after multiple attempts.');
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
