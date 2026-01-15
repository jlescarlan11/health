import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

const API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export const getGeminiResponse = async (prompt: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
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
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType,
        },
      },
      'Transcribe this audio. Return only the transcription text.',
    ]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini Audio Transcription Error:', error);
    throw error;
  }
};
