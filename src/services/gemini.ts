import { GoogleGenerativeAI, GenerativeModel, GenerateContentRequest } from '@google/generative-ai';
import Constants from 'expo-constants';
import { GENERATE_ASSESSMENT_QUESTIONS_PROMPT, FINAL_SLOT_EXTRACTION_PROMPT } from '../constants/prompts';
import { AssessmentProfile, AssessmentQuestion } from '../types/triage';

const API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

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

      const delay = BASE_DELAY * Math.pow(2, attempt - 1);
      console.log(`[Gemini Service] Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed to connect to AI service after multiple attempts.');
};

/**
 * Generates the fixed set of assessment questions (Call #1)
 */
export const generateAssessmentPlan = async (initialSymptom: string): Promise<AssessmentQuestion[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = GENERATE_ASSESSMENT_QUESTIONS_PROMPT.replace('{{initialSymptom}}', initialSymptom);

    const responseText = await generateContentWithRetry(model, prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error('Invalid JSON from AI');
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.questions || [];
  } catch (error) {
    console.error('[Gemini] Failed to generate assessment plan:', error);
    // Fallback questions if AI fails
    return [
      { id: 'basics', text: 'Could you please tell me your age and how long you have had these symptoms?' },
      { id: 'severity', text: 'On a scale of 1 to 10, how severe is it, and is it getting better or worse?' },
      { id: 'red_flags', text: 'To be safe, are you experiencing any difficulty breathing, chest pain, or severe bleeding?' }
    ];
  }
};

/**
 * Extracts the final slots from the conversation (Call #2)
 */
export const extractClinicalProfile = async (
  history: { role: 'assistant' | 'user', text: string }[]
): Promise<AssessmentProfile> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: "application/json" } });
    
    const conversationText = history
      .map(msg => `${msg.role.toUpperCase()}: ${msg.text}`)
      .join('\n');

    const prompt = FINAL_SLOT_EXTRACTION_PROMPT.replace('{{conversationHistory}}', conversationText);

    const responseText = await generateContentWithRetry(model, prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error('Invalid JSON from AI');
    
    return JSON.parse(jsonMatch[0]) as AssessmentProfile;
  } catch (error) {
    console.error('[Gemini] Failed to extract profile:', error);
    
    // Return a fallback profile with summary concatenated from history
    return {
      age: null,
      duration: null,
      severity: null,
      progression: null,
      red_flag_denials: null,
      summary: history.map(msg => `${msg.role.toUpperCase()}: ${msg.text}`).join('\n')
    };
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