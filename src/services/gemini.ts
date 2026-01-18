import { GoogleGenerativeAI, GenerativeModel, GenerateContentRequest } from '@google/generative-ai';
import Constants from 'expo-constants';
import {
  GENERATE_ASSESSMENT_QUESTIONS_PROMPT,
  FINAL_SLOT_EXTRACTION_PROMPT,
} from '../constants/prompts';
import { AssessmentProfile, AssessmentQuestion } from '../types/triage';
import {
  calculateTriageScore,
  prioritizeQuestions,
  parseAndValidateLLMResponse,
} from '../utils/aiUtils';

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
export const generateAssessmentPlan = async (
  initialSymptom: string,
): Promise<AssessmentQuestion[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = GENERATE_ASSESSMENT_QUESTIONS_PROMPT.replace(
      '{{initialSymptom}}',
      initialSymptom,
    );

    const responseText = await generateContentWithRetry(model, prompt);

    const parsed = parseAndValidateLLMResponse<{ questions: AssessmentQuestion[] }>(responseText);
    const questions = parsed.questions || [];

    return prioritizeQuestions(questions);
  } catch (error) {
    console.error('[Gemini] Failed to generate assessment plan:', error);
    // Fallback questions if AI fails
    return [
      {
        id: 'basics',
        text: 'Could you please tell me your age and how long you have had these symptoms?',
      },
      {
        id: 'severity',
        text: 'On a scale of 1 to 10, how severe is it, and is it getting better or worse?',
      },
      {
        id: 'red_flags',
        text: 'To be safe, are you experiencing any difficulty breathing, chest pain, or severe bleeding?',
      },
    ];
  }
};

/**
 * Extracts the final slots from the conversation (Call #2)
 */
export const extractClinicalProfile = async (
  history: { role: 'assistant' | 'user'; text: string }[],
): Promise<AssessmentProfile> => {
  // Build conversation text once and reuse
  const conversationText = history
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`)
    .join('\n');

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = FINAL_SLOT_EXTRACTION_PROMPT.replace(
      '{{conversationHistory}}',
      conversationText,
    );

    const responseText = await generateContentWithRetry(model, prompt);

    // Direct parse since responseMimeType is already "application/json"
    const profile = JSON.parse(responseText) as AssessmentProfile;

    // Deterministically calculate the score
    profile.triage_readiness_score = calculateTriageScore(profile);

    return profile;
  } catch (error) {
    console.error('[Gemini] Failed to extract profile:', error);

    // Return a fallback profile with summary using the already-built conversation text
    return {
      age: null,
      duration: null,
      severity: null,
      progression: null,
      red_flag_denials: null,
      summary: conversationText,
      triage_readiness_score: 0.0, // Default to 0 on failure
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

/**
 * Streams the AI response chunk by chunk (Async Generator)
 * Useful for real-time UI updates.
 */
export const streamGeminiResponse = async function* (
  prompt: string | (string | { inlineData: { data: string; mimeType: string } })[],
): AsyncGenerator<string, void, unknown> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    // Attempt to stream
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText;
      }
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.warn(
      '[Gemini Service] Streaming failed, attempting fallback to unary generation. Error:',
      err.message || error,
    );

    // Fallback to non-streaming request with chunked delivery
    try {
      const result = await generateContentWithRetry(model, prompt);
      // Split into smaller chunks to simulate streaming and maintain UX
      const chunkSize = 50; // Characters per chunk
      for (let i = 0; i < result.length; i += chunkSize) {
        yield result.slice(i, i + chunkSize);
      }
    } catch (fallbackError) {
      console.error('[Gemini Service] Fallback generation also failed:', fallbackError);
      throw fallbackError;
    }
  }
};
