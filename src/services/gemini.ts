import { GoogleGenerativeAI, GenerativeModel, GenerateContentRequest } from '@google/generative-ai';
import Constants from 'expo-constants';
import {
  GENERATE_ASSESSMENT_QUESTIONS_PROMPT,
  FINAL_SLOT_EXTRACTION_PROMPT,
  REFINE_QUESTION_PROMPT,
} from '../constants/prompts';
import { AssessmentProfile, AssessmentQuestion } from '../types/triage';
import {
  calculateTriageScore,
  prioritizeQuestions,
  parseAndValidateLLMResponse,
  normalizeSlot,
} from '../utils/aiUtils';
import { applyHedgingCorrections } from '../utils/hedgingDetector';
import { DEFAULT_RED_FLAG_QUESTION } from '../constants/clinical';

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
): Promise<{ questions: AssessmentQuestion[]; intro?: string }> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = GENERATE_ASSESSMENT_QUESTIONS_PROMPT.replace(
      '{{initialSymptom}}',
      initialSymptom,
    );

    const responseText = await generateContentWithRetry(model, prompt);

    const parsed = parseAndValidateLLMResponse<{ questions: AssessmentQuestion[]; intro?: string }>(
      responseText,
    );
    const questions = parsed.questions || [];

    let prioritizedQuestions: AssessmentQuestion[];
    try {
      prioritizedQuestions = prioritizeQuestions(questions);
    } catch (prioritizationError) {
      console.error('[Gemini] Prioritization failed:', prioritizationError);
      console.log('[Gemini] Original Questions Data:', JSON.stringify(questions));
      console.log('[Gemini] Fallback: Injecting default red flags into original list.');

      // Fallback behavior:
      // 1. Recover any valid questions from the original list (filter out potential duplicates of red_flags)
      // 2. Inject the safe default red flag question
      const safeQuestions = Array.isArray(questions)
        ? questions.filter((q) => q && q.id !== 'red_flags')
        : [];

      // Inject default at index 1 (after basics) or 0 if empty
      const insertIndex = safeQuestions.length > 0 ? 1 : 0;
      safeQuestions.splice(insertIndex, 0, DEFAULT_RED_FLAG_QUESTION);

      prioritizedQuestions = safeQuestions;
    }

    return { questions: prioritizedQuestions, intro: parsed.intro };
  } catch (error) {
    console.error('[Gemini] Failed to generate assessment plan:', error);
    // Fallback questions if AI fails
    return {
      questions: [
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
      ],
    };
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

    // Normalize slots to prevent dirty nulls from polluting logic
    profile.age = normalizeSlot(profile.age);
    profile.duration = normalizeSlot(profile.duration);
    profile.severity = normalizeSlot(profile.severity);
    profile.progression = normalizeSlot(profile.progression);
    profile.red_flag_denials = normalizeSlot(profile.red_flag_denials, { allowNone: true });

    /**
     * DETERMINISTIC SAFETY FILTER:
     * We run the profile through a regex-based hedging detector. 
     * If the user said "maybe" or "not sure" about a red flag or critical slot, 
     * we reject the definitive extraction and downgrade confidence. 
     * This ensures the TriageArbiter sees the ambiguity and triggers a Force Clarification.
     */
    const correctedProfile = applyHedgingCorrections(profile);

    // Deterministically calculate the score using the corrected profile
    correctedProfile.triage_readiness_score = calculateTriageScore(correctedProfile);

    return correctedProfile;
  } catch (error) {
    console.error('[Gemini] Failed to extract profile:', error);

    // Return a fallback profile with summary using the already-built conversation text
    return {
      age: null,
      duration: null,
      severity: null,
      progression: null,
      red_flag_denials: null,
      uncertainty_accepted: false,
      summary: conversationText,
    };
  }
};

/**
 * Refines a question to naturally follow the user's last answer (Call #3)
 */
export const refineQuestion = async (questionText: string, userAnswer: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = REFINE_QUESTION_PROMPT.replace('{{questionText}}', questionText).replace(
      '{{userAnswer}}',
      userAnswer,
    );

    const responseText = await generateContentWithRetry(model, prompt);
    return responseText.trim() || questionText;
  } catch (error) {
    console.error('[Gemini] Failed to refine question:', error);
    return questionText;
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
    // Direct fallback to non-streaming request with chunked delivery
    // (React Native environment lacks full ReadableStream support for generateContentStream)
    const result = await generateContentWithRetry(model, prompt);
    // Split into smaller chunks to simulate streaming and maintain UX
    const chunkSize = 20; // Characters per chunk (smaller for smoother simulated feel)
    for (let i = 0; i < result.length; i += chunkSize) {
      yield result.slice(i, i + chunkSize);
      // specific small delay to make it feel like typing
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  } catch (error) {
    console.error('[Gemini Service] Generation failed:', error);
    throw error;
  }
};
