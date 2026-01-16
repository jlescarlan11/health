import { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SYMPTOM_ASSESSMENT_SYSTEM_PROMPT, VALID_SERVICES } from '../constants/prompts';
import { detectEmergency } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';
import { FacilityService } from '../types';

// Configuration
const API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';
const MODEL_NAME = 'gemini-2.5-flash'; // As requested
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;
const RATE_LIMIT_RPM = 15;
const RATE_LIMIT_DAILY = 1500;
const STORAGE_KEY_DAILY_COUNT = 'gemini_daily_usage_count';
const STORAGE_KEY_DAILY_DATE = 'gemini_daily_usage_date';
const STORAGE_KEY_CACHE_PREFIX = 'gemini_cache_';
const STORAGE_KEY_LAST_CLEANUP = 'gemini_last_cache_cleanup';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AssessmentResponse {
  recommended_level: 'self_care' | 'health_center' | 'hospital' | 'emergency';
  follow_up_questions: string[];
  user_advice: string;
  clinical_soap: string;
  key_concerns: string[];
  critical_warnings: string[];
  relevant_services: FacilityService[];
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
        user_advice:
          json.user_advice ||
          json.condition_summary || // Fallback for old cache or transitional responses
          "Based on your symptoms, we've analyzed your condition. Please see the recommendations below.",
        clinical_soap:
          json.clinical_soap ||
          (json.soap_note ? JSON.stringify(json.soap_note) : '') ||
          'No clinical summary available.',
        key_concerns: json.key_concerns || [],
        critical_warnings: json.critical_warnings || [],
        relevant_services: (json.relevant_services || []).filter((s: string) =>
          VALID_SERVICES.includes(s),
        ),
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
   * Periodically clears all cached assessments to maintain medical relevance.
   * Runs if more than 24 hours have passed since the last bulk cleanup.
   */
  private async performCacheCleanup(): Promise<void> {
    try {
      const now = Date.now();
      const lastCleanup = await AsyncStorage.getItem(STORAGE_KEY_LAST_CLEANUP);
      const lastCleanupTime = lastCleanup ? parseInt(lastCleanup, 10) : 0;

      if (now - lastCleanupTime > 24 * 60 * 60 * 1000) {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter((key) => key.startsWith(STORAGE_KEY_CACHE_PREFIX));

        if (cacheKeys.length > 0) {
          await AsyncStorage.multiRemove(cacheKeys);
          console.log(
            `[GeminiClient] Automatically cleared ${cacheKeys.length} stale cache entries.`,
          );
        }

        await AsyncStorage.setItem(STORAGE_KEY_LAST_CLEANUP, now.toString());
      }
    } catch (error) {
      console.warn('[GeminiClient] Periodic cache cleanup failed:', error);
    }
  }

  /**
   * Manually clears all cached assessments from storage.
   * Useful for debugging or when a user wants to reset their assessment history.
   */
  public async clearCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) => key.startsWith(STORAGE_KEY_CACHE_PREFIX));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`[GeminiClient] Manually cleared ${cacheKeys.length} cache entries.`);
      }
    } catch (error) {
      console.error('[GeminiClient] Failed to clear assessment cache:', error);
      throw new Error('Failed to clear assessment cache.');
    }
  }

  /**
   * Main assessment function.
   * @param symptoms The clinical context for the LLM (may include history/questions)
   * @param history Optional conversation history
   * @param safetyContext Optional specialized string for local safety scanning (user-only content)
   */
  public async assessSymptoms(
    symptoms: string,
    history: ChatMessage[] = [],
    safetyContext?: string,
  ): Promise<AssessmentResponse> {
    // 0. Periodic Cleanup
    await this.performCacheCleanup();

    // 1. Safety Overrides (Local Logic)
    // Use safetyContext if provided (more accurate user-only content), 
    // otherwise fallback to full symptoms string.
    const scanInput = safetyContext || symptoms;
    const emergency = detectEmergency(scanInput);
    
    if (emergency.isEmergency) {
      const response: AssessmentResponse = {
        recommended_level: 'emergency',
        follow_up_questions: [],
        user_advice:
          'CRITICAL: Potential life-threatening condition detected based on your symptoms. Go to the nearest emergency room or call emergency services (911) immediately.',
        clinical_soap:
          `S: Patient reports ${emergency.matchedKeywords.join(', ')}. O: AI detected critical emergency keywords. A: Potential life-threatening condition. P: Immediate ED referral.`,
        key_concerns: emergency.matchedKeywords.map((k) => `Urgent: ${k}`),
        critical_warnings: ['Life-threatening condition possible', 'Do not delay care'],
        relevant_services: ['Emergency'],
        red_flags: emergency.matchedKeywords,
        confidence_score: 1.0,
      };

      this.logFinalResult(response, scanInput);
      return response;
    }

    const mhCrisis = detectMentalHealthCrisis(scanInput);
    if (mhCrisis.isCrisis) {
      const response: AssessmentResponse = {
        recommended_level: 'emergency',
        follow_up_questions: [],
        user_advice:
          'Your symptoms indicate a mental health crisis. You are not alone. Please reach out to a crisis hotline or go to the nearest hospital immediately.',
        clinical_soap:
          `S: Patient reports ${mhCrisis.matchedKeywords.join(', ')}. O: AI detected crisis keywords. A: Mental health crisis. P: Immediate psychiatric evaluation/intervention.`,
        key_concerns: ['Risk of self-harm or severe distress'],
        critical_warnings: ['You are not alone. Professional help is available now.'],
        relevant_services: ['Mental Health'],
        red_flags: mhCrisis.matchedKeywords,
        confidence_score: 1.0,
      };

      this.logFinalResult(response, scanInput);
      return response;
    }

    // 2. Cache Check
    const cacheKey = this.getCacheKey(symptoms, history);
    const fullCacheKey = `${STORAGE_KEY_CACHE_PREFIX}${cacheKey}`;
    try {
      const cachedJson = await AsyncStorage.getItem(fullCacheKey);
      if (cachedJson) {
        const cached = JSON.parse(cachedJson) as CacheEntry;
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          console.log('[GeminiClient] Returning cached response from storage');
          // Ensure cached data has new fields if we want to be safe, or just return it and let parseResponse fallback handle it?
          // parseResponse handles structure, but here we return directly.
          // If cached data is OLD structure, it might lack user_advice.
          // Safe to re-parse or map it?
          // Let's assume cache might be old. We should map it if needed.
          // But 'cached.data' is already typed as AssessmentResponse.
          // If strict runtime check, we might want to migrate it.
          // For now, let's just return it. The parseResponse fallback handles "condition_summary" -> "user_advice" mapping if we used it,
          // but here we are using the stored object directly.
          // If the stored object has 'condition_summary' but no 'user_advice', and we type cast it, it will be missing at runtime.
          // Let's do a quick migration here.
          const data: any = cached.data;
          if (!data.user_advice && data.condition_summary) {
             data.user_advice = data.condition_summary + ' ' + (data.recommended_action || '');
          }
          if (!data.clinical_soap && data.soap_note) {
             data.clinical_soap = JSON.stringify(data.soap_note);
          }

          this.logFinalResult(data as AssessmentResponse, symptoms);
          return data as AssessmentResponse;
        } else {
          await AsyncStorage.removeItem(fullCacheKey);
        }
      }
    } catch (error) {
      console.warn('[GeminiClient] Cache read failed:', error);
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
          parsed.user_advice += ' (Upgraded to Emergency due to detected red flags).';
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
          parsed.user_advice += ` (Note: Recommendation upgraded to ${nextLevel.replace('_', ' ')} due to uncertainty. Better safe than sorry.)`;
        }
        // -----------------------------------

        // Update Cache
        try {
          await AsyncStorage.setItem(
            fullCacheKey,
            JSON.stringify({
              data: parsed,
              timestamp: Date.now(),
            }),
          );
        } catch (error) {
          console.warn('[GeminiClient] Cache write failed:', error);
        }

        this.logFinalResult(parsed, symptoms);
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

  /**
   * Logs a formatted summary of the assessment and recommendation to the console.
   */
  private logFinalResult(recommendation: AssessmentResponse, assessmentText: string) {
    const BOX_WIDTH = 60;
    const divider = '─'.repeat(BOX_WIDTH);
    
    console.log(`\n╔${'═'.repeat(BOX_WIDTH)}╗`);
    console.log(`║${'FINAL ASSESSMENT & RECOMMENDATION'.padStart(47).padEnd(BOX_WIDTH)}║`);
    console.log(`╠${'═'.repeat(BOX_WIDTH)}╣`);
    
    // Assessment Context (Shortened)
    const context = assessmentText.replace(/\n/g, ' ').substring(0, BOX_WIDTH - 12);
    console.log(`║ CONTEXT: ${(`${context}${assessmentText.length > BOX_WIDTH - 12 ? '...' : ''}`).padEnd(BOX_WIDTH - 10)} ║`);
    console.log(`╟${divider}╢`);
    
    // Care Level
    const levelLabel = recommendation.recommended_level.replace(/_/g, ' ').toUpperCase();
    console.log(`║ RECOMMENDED LEVEL: ${levelLabel.padEnd(BOX_WIDTH - 20)} ║`);
    
    // Confidence & Ambiguity
    const conf = recommendation.confidence_score !== undefined 
      ? `${(recommendation.confidence_score * 100).toFixed(0)}%` 
      : 'N/A';
    const ambig = recommendation.ambiguity_detected ? 'YES' : 'NO';
    const stats = `CONFIDENCE: ${conf.padEnd(8)} | AMBIGUITY: ${ambig.padEnd(8)}`;
    console.log(`║ ${stats.padEnd(BOX_WIDTH - 2)} ║`);
    
    console.log(`╟${divider}╢`);
    
    // Advice (Simple wrapping for 2 lines)
    const advice = recommendation.user_advice.replace(/\n/g, ' ');
    const line1 = advice.substring(0, BOX_WIDTH - 10);
    console.log(`║ ADVICE: ${line1.padEnd(BOX_WIDTH - 10)} ║`);
    if (advice.length > BOX_WIDTH - 10) {
        const line2 = advice.substring(BOX_WIDTH - 10, (BOX_WIDTH - 10) * 2);
        console.log(`║         ${line2.padEnd(BOX_WIDTH - 10)} ║`);
    }

    // Red Flags
    if (recommendation.red_flags && recommendation.red_flags.length > 0) {
      console.log(`╟${divider}╢`);
      const redFlagsStr = recommendation.red_flags.join(', ');
      console.log(`║ RED FLAGS: ${redFlagsStr.substring(0, BOX_WIDTH - 13).padEnd(BOX_WIDTH - 13)} ║`);
    }

    // SOAP Summary
    if (recommendation.clinical_soap) {
      console.log(`╟${divider}╢`);
      const soap = recommendation.clinical_soap.replace(/\n/g, ' ').substring(0, BOX_WIDTH - 17);
      console.log(`║ CLINICAL SOAP: ${soap.padEnd(BOX_WIDTH - 17)} ║`);
    }

    console.log(`╚${'═'.repeat(BOX_WIDTH)}╝\n`);
  }
}

export const geminiClient = new GeminiClient();
