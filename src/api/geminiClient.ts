import { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SYMPTOM_ASSESSMENT_SYSTEM_PROMPT } from '../constants/prompts';
import { detectEmergency } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';

// Configuration
const API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';
const MODEL_NAME = 'gemini-2.5-flash'; // As requested
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RETRIES = 3;
const RATE_LIMIT_RPM = 15;
const RATE_LIMIT_DAILY = 1500;
const STORAGE_KEY_DAILY_COUNT = 'gemini_daily_usage_count';
const STORAGE_KEY_DAILY_DATE = 'gemini_daily_usage_date';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AssessmentResponse {
  recommended_level: 'self_care' | 'health_center' | 'hospital' | 'emergency';
  follow_up_questions: string[];
  assessment_summary?: string;
  condition_summary: string;
  recommended_action: string;
  key_concerns: string[];
  critical_warnings: string[];
  relevant_services: string[];
  red_flags: string[];
  confidence_score?: number;
  ambiguity_detected?: boolean;
}

interface CacheEntry {
  data: AssessmentResponse;
  timestamp: number;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private cache: Map<string, CacheEntry>;
  private requestTimestamps: number[]; // For RPM tracking

  constructor() {
    if (!API_KEY) {
      console.warn('Gemini API Key is missing. Check your .env or app.json configuration.');
    }
    this.genAI = new GoogleGenerativeAI(API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' },
    });
    this.cache = new Map();
    this.requestTimestamps = [];
  }

  /**
   * Generates a cache key based on symptoms and history.
   */
  private getCacheKey(symptoms: string, history: ChatMessage[] = []): string {
    const historyStr = history.map((m) => `${m.role}:${m.text}`).join('|');
    return `${symptoms.toLowerCase().trim()}|${historyStr}`;
  }

  /**
   * Enforces rate limiting (RPM and Daily).
   */
  private async checkRateLimits(): Promise<void> {
    const now = Date.now();

    // 1. RPM Check (In-memory)
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60 * 1000);
    if (this.requestTimestamps.length >= RATE_LIMIT_RPM) {
      const oldest = this.requestTimestamps[0];
      const waitTime = 60 * 1000 - (now - oldest) + 500;
      console.warn(`[GeminiClient] RPM limit reached. Waiting ${waitTime}ms.`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // 2. Daily Limit Check (Persistent)
    try {
      const todayStr = new Date().toDateString();
      const storedDate = await AsyncStorage.getItem(STORAGE_KEY_DAILY_DATE);
      let count = 0;

      if (storedDate === todayStr) {
        const storedCount = await AsyncStorage.getItem(STORAGE_KEY_DAILY_COUNT);
        count = storedCount ? parseInt(storedCount, 10) : 0;
      } else {
        // Reset for new day
        await AsyncStorage.setItem(STORAGE_KEY_DAILY_DATE, todayStr);
      }

      if (count >= RATE_LIMIT_DAILY) {
        throw new Error('Daily AI request limit reached. Please try again tomorrow.');
      }

      // Increment and save
      await AsyncStorage.setItem(STORAGE_KEY_DAILY_COUNT, (count + 1).toString());
    } catch (error) {
      // If AsyncStorage fails, we log but allow proceeding (or block if critical)
      // Here we assume it's better to fail safe if we can't read limits?
      // Actually, if storage fails, maybe we shouldn't block the user.
      console.warn('Failed to check daily limits:', error);
    }

    this.requestTimestamps.push(Date.now());
  }

  /**
   * Parses and validates the JSON response.
   */
  private parseResponse(text: string): AssessmentResponse {
    try {
      const json = JSON.parse(text);
      // Basic validation
      if (!json.recommended_level) {
        throw new Error('Missing recommended_level');
      }
      return {
        recommended_level: json.recommended_level,
        follow_up_questions: json.follow_up_questions || [],
        condition_summary:
          json.condition_summary ||
          json.assessment_summary ||
          "Based on your symptoms, we've analyzed your condition.",
        recommended_action:
          json.recommended_action || 'Please follow the recommended level of care.',
        key_concerns: json.key_concerns || [],
        critical_warnings: json.critical_warnings || [],
        relevant_services: json.relevant_services || [],
        red_flags: json.red_flags || [],
        confidence_score: json.confidence_score,
        ambiguity_detected: json.ambiguity_detected,
      };
    } catch (error) {
      console.error('JSON Parse Error:', error);
      throw new Error('Invalid response format from AI.');
    }
  }

  /**
   * Main assessment function.
   */
  public async assessSymptoms(
    symptoms: string,
    history: ChatMessage[] = [],
  ): Promise<AssessmentResponse> {
    // 1. Safety Overrides (Local Logic)
    // Only check overrides on the latest user input (symptoms),
    // unless we want to check the whole context. Usually checking the latest input is sufficient for immediate triggers.
    const emergency = detectEmergency(symptoms);
    if (emergency.isEmergency) {
      return {
        recommended_level: 'emergency',
        follow_up_questions: [],
        condition_summary: 'Critical symptoms detected that require immediate medical attention.',
        recommended_action:
          'Go to the nearest emergency room or call emergency services (911) immediately.',
        key_concerns: emergency.matchedKeywords.map((k) => `Urgent: ${k}`),
        critical_warnings: ['Life-threatening condition possible'],
        relevant_services: ['Emergency Care', 'Trauma Support'],
        red_flags: emergency.matchedKeywords,
        confidence_score: 1.0,
      };
    }

    const mhCrisis = detectMentalHealthCrisis(symptoms);
    if (mhCrisis.isCrisis) {
      return {
        recommended_level: 'emergency',
        follow_up_questions: [],
        condition_summary: 'Your symptoms indicate a mental health crisis.',
        recommended_action:
          'Please reach out to a crisis hotline or go to the nearest hospital immediately.',
        key_concerns: ['Risk of self-harm or severe distress'],
        critical_warnings: ['You are not alone. Professional help is available now.'],
        relevant_services: ['Mental Health Support', 'Crisis Intervention'],
        red_flags: mhCrisis.matchedKeywords,
        confidence_score: 1.0,
      };
    }

    // 2. Cache Check
    const cacheKey = this.getCacheKey(symptoms, history);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log('[GeminiClient] Returning cached response');
      return cached.data;
    } else if (cached) {
      this.cache.delete(cacheKey);
    }

    // 3. API Call with Retry
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        await this.checkRateLimits();

        // Construct Chat History for Gemini
        // We use the 'system' instruction via generation config or just prepend it.
        // GoogleGenerativeAI supports systemInstruction in model config, but let's be explicit in the chat start.

        const chat = this.model.startChat({
          history: [
            {
              role: 'user',
              parts: [{ text: SYMPTOM_ASSESSMENT_SYSTEM_PROMPT }],
            },
            {
              role: 'model',
              parts: [
                { text: 'Understood. I am ready to triage symptoms for Naga City residents.' },
              ],
            },
            ...history.map(
              (msg) =>
                ({
                  role: msg.role === 'user' ? 'user' : 'model',
                  parts: [{ text: msg.text }],
                }) as Content,
            ),
          ],
        });

        console.log(`[GeminiClient] Sending request (Attempt ${attempt + 1})...`);

        const result = await chat.sendMessage(symptoms);
        const responseText = result.response.text();

        const parsed = this.parseResponse(responseText);

        // --- Conservative Fallback Logic ---
        const levels = ['self_care', 'health_center', 'hospital', 'emergency'];
        let currentLevelIdx = levels.indexOf(parsed.recommended_level);

        // Force Emergency if Red Flags exist (AI might have missed setting the level)
        if (
          parsed.red_flags &&
          parsed.red_flags.length > 0 &&
          parsed.recommended_level !== 'emergency'
        ) {
          console.log(
            '[GeminiClient] Red flags detected but not Emergency. Upgrading to Emergency.',
          );
          parsed.recommended_level = 'emergency';
          parsed.recommended_action += ' (Upgraded to Emergency due to detected red flags).';
          currentLevelIdx = 3;
        }

        // Upgrade if Low Confidence or Ambiguity Detected
        const isLowConfidence =
          parsed.confidence_score !== undefined && parsed.confidence_score < 0.8;
        const isAmbiguous = parsed.ambiguity_detected === true;

        if ((isLowConfidence || isAmbiguous) && currentLevelIdx < 3) {
          const nextLevel = levels[currentLevelIdx + 1] as AssessmentResponse['recommended_level'];
          console.log(
            `[GeminiClient] Fallback Triggered. Upgrading ${parsed.recommended_level} to ${nextLevel}. Low Conf: ${isLowConfidence}, Ambiguous: ${isAmbiguous}`,
          );

          parsed.recommended_level = nextLevel;
          parsed.recommended_action += ` (Note: Recommendation upgraded to ${nextLevel.replace('_', ' ')} due to uncertainty. Better safe than sorry.)`;
        }
        // -----------------------------------

        // Update Cache
        this.cache.set(cacheKey, {
          data: parsed,
          timestamp: Date.now(),
        });

        return parsed;
      } catch (error) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GeminiClient] Request failed (Attempt ${attempt}):`, errorMessage);

        if (attempt >= MAX_RETRIES) {
          throw new Error('Unable to connect to Health Assistant. Please check your connection.');
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Unexpected error in Gemini client.');
  }
}

export const geminiClient = new GeminiClient();
