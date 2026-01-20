import { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SYMPTOM_ASSESSMENT_SYSTEM_PROMPT, VALID_SERVICES } from '../constants/prompts';
import { detectEmergency, isNegated } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';
import { FacilityService, AssessmentResponse } from '../types';
import { AssessmentProfile } from '../types/triage';

// Configuration
const API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';
const MODEL_NAME = 'gemini-2.5-flash';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_VERSION = 2; // Increment when cache structure changes
const MAX_RETRIES = 3;
const RATE_LIMIT_RPM = 15;
const RATE_LIMIT_DAILY = 1500;
const STORAGE_KEY_DAILY_COUNT = 'gemini_daily_usage_count';
const STORAGE_KEY_DAILY_DATE = 'gemini_daily_usage_date';
const STORAGE_KEY_CACHE_PREFIX = 'gemini_cache_';
const STORAGE_KEY_LAST_CLEANUP = 'gemini_last_cache_cleanup';
const STORAGE_KEY_RPM_TIMESTAMPS = 'gemini_rpm_timestamps';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface CacheEntry {
  data: AssessmentResponse;
  timestamp: number;
  version: number;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private requestTimestamps: number[]; // For RPM tracking
  private cacheQueue: Promise<void>; // For non-blocking cache operations

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
    this.cacheQueue = Promise.resolve();
  }

  /**
   * Generates a cache key based on symptoms and history using hash-based approach.
   */
  private getCacheKey(symptoms: string, history: ChatMessage[] = []): string {
    const symptomsKey = symptoms.toLowerCase().trim();

    if (history.length === 0) {
      return symptomsKey;
    }

    // Hash conversation for fixed-length keys
    const historyStr = history.map((m) => `${m.role}:${m.text}`).join('|');
    const historyHash = this.simpleHash(historyStr);

    return `${symptomsKey}|h:${historyHash}`;
  }

  /**
   * Simple hash function for generating fixed-length cache keys.
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Enforces rate limiting (RPM and Daily) with persistent RPM tracking.
   */
  private async checkRateLimits(): Promise<void> {
    const now = Date.now();

    // 1. RPM Check (Persistent)
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_RPM_TIMESTAMPS);
      const timestamps = stored ? JSON.parse(stored) : [];

      // Filter and check
      this.requestTimestamps = timestamps.filter((t: number) => now - t < 60 * 1000);

      if (this.requestTimestamps.length >= RATE_LIMIT_RPM) {
        const oldest = this.requestTimestamps[0];
        const waitTime = 60 * 1000 - (now - oldest) + 500;
        console.warn(`[GeminiClient] RPM limit reached. Waiting ${waitTime}ms.`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    } catch (error) {
      console.warn('Failed to check RPM limits:', error);
      // Fallback to in-memory tracking
      this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60 * 1000);
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
      console.warn('Failed to check daily limits:', error);
    }

    // Record timestamp and persist (fire-and-forget)
    this.requestTimestamps.push(now);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_RPM_TIMESTAMPS,
        JSON.stringify(this.requestTimestamps),
      );
    } catch (e) {
      console.warn('Failed to persist RPM state:', e);
    }
  }

  /**
   * Parses and validates the JSON response with explicit null checks.
   */
  private parseResponse(text: string): AssessmentResponse {
    try {
      const json = JSON.parse(text);

      if (!json.recommended_level) {
        throw new Error('Missing recommended_level');
      }

      // Explicit field mapping with fallbacks using nullish coalescing
      const clinicalSoap =
        json.clinical_soap ??
        (json.soap_note ? JSON.stringify(json.soap_note) : null) ??
        'No clinical summary available.';

      const userAdvice =
        json.user_advice ??
        json.condition_summary ??
        "Based on your symptoms, we've analyzed your condition. Please see the recommendations below.";

      return {
        recommended_level: json.recommended_level,
        follow_up_questions: json.follow_up_questions ?? [],
        user_advice: userAdvice,
        clinical_soap: clinicalSoap,
        key_concerns: json.key_concerns ?? [],
        critical_warnings: json.critical_warnings ?? [],
        relevant_services: (json.relevant_services ?? []).filter((s: string) =>
          VALID_SERVICES.includes(s),
        ),
        red_flags: json.red_flags ?? [],
        triage_readiness_score: json.triage_readiness_score,
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
        const cacheKeys = (allKeys || []).filter((key) =>
          key.startsWith(STORAGE_KEY_CACHE_PREFIX),
        );

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
      const cacheKeys = (allKeys || []).filter((key) =>
        key.startsWith(STORAGE_KEY_CACHE_PREFIX),
      );

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
   * Calculates retry delay with jitter to prevent thundering herd.
   */
  private getRetryDelay(attempt: number): number {
    const baseDelay = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000; // 0-1000ms random jitter
    return baseDelay + jitter;
  }

  /**
   * Main assessment function.
   * @param symptoms The clinical context for the LLM (may include history/questions)
   * @param history Optional conversation history
   * @param safetyContext Optional specialized string for local safety scanning (user-only content)
   * @param profile Optional structured assessment profile for context-aware triage
   */
  public async assessSymptoms(
    symptoms: string,
    history: ChatMessage[] = [],
    safetyContext?: string,
    profile?: AssessmentProfile,
  ): Promise<AssessmentResponse> {
    // 0. Periodic Cleanup (non-blocking)
    this.performCacheCleanup().catch((e) => console.warn('Cleanup failed:', e));

    // 1. Safety Overrides (Local Logic)
    const scanInput = safetyContext || symptoms;
    const historyContext = history.length > 0 ? history.map((h) => h.text).join('\n') : undefined;

    const emergency = detectEmergency(scanInput, {
      isUserInput: true,
      historyContext: historyContext,
      profile: profile,
      questionId: 'final_safety_scan',
    });

    if (emergency.isEmergency) {
      const response: AssessmentResponse = {
        recommended_level: 'emergency',
        follow_up_questions: [],
        user_advice:
          'CRITICAL: Potential life-threatening condition detected based on your symptoms. Go to the nearest emergency room or call emergency services (911) immediately.',
        clinical_soap: `S: Patient reports ${emergency.matchedKeywords.join(', ')}. O: AI detected critical emergency keywords. A: Potential life-threatening condition. P: Immediate ED referral.`,
        key_concerns: emergency.matchedKeywords.map((k) => `Urgent: ${k}`),
        critical_warnings: ['Life-threatening condition possible', 'Do not delay care'],
        relevant_services: ['Emergency'],
        red_flags: emergency.matchedKeywords,
        triage_readiness_score: 1.0,
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
        clinical_soap: `S: Patient reports ${mhCrisis.matchedKeywords.join(', ')}. O: AI detected crisis keywords. A: Mental health crisis. P: Immediate psychiatric evaluation/intervention.`,
        key_concerns: ['Risk of self-harm or severe distress'],
        critical_warnings: ['You are not alone. Professional help is available now.'],
        relevant_services: ['Mental Health'],
        red_flags: mhCrisis.matchedKeywords,
        triage_readiness_score: 1.0,
      };

      this.logFinalResult(response, scanInput);
      return response;
    }

    // 2. Cache Check (non-blocking read)
    const cacheKey = this.getCacheKey(symptoms, history);
    const fullCacheKey = `${STORAGE_KEY_CACHE_PREFIX}${cacheKey}`;
    try {
      const cachedJson = await AsyncStorage.getItem(fullCacheKey);
      if (cachedJson) {
        const cached = JSON.parse(cachedJson) as CacheEntry;

        // Check version and TTL
        if (cached.version === CACHE_VERSION && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          console.log('[GeminiClient] Returning cached response from storage');
          this.logFinalResult(cached.data, symptoms);
          return cached.data;
        } else {
          // Remove stale or outdated cache entry
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

        // Initialize flags
        parsed.is_conservative_fallback = false;
        if (profile?.clinical_friction_detected) {
          parsed.clinical_friction_details = {
            detected: true,
            reason: profile.clinical_friction_details,
          };
        }

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
          parsed.is_conservative_fallback = true;
          currentLevelIdx = 3;
        }

        // Upgrade if Low Readiness or Ambiguity Detected
        const readinessThreshold = profile?.is_vulnerable ? 0.9 : 0.8;
        const isLowReadiness =
          parsed.triage_readiness_score !== undefined && parsed.triage_readiness_score < readinessThreshold;
        const isAmbiguous = parsed.ambiguity_detected === true;

        if ((isLowReadiness || isAmbiguous) && currentLevelIdx < 3) {
          const nextLevel = levels[currentLevelIdx + 1] as AssessmentResponse['recommended_level'];
          console.log(
            `[GeminiClient] Fallback Triggered. Upgrading ${parsed.recommended_level} to ${nextLevel}. Low Readiness: ${isLowReadiness} (Threshold: ${readinessThreshold}), Ambiguous: ${isAmbiguous}`,
          );

          parsed.recommended_level = nextLevel;
          parsed.user_advice += ` (Note: Recommendation upgraded to ${nextLevel.replace('_', ' ')} due to uncertainty. Better safe than sorry.)`;
          parsed.is_conservative_fallback = true;
        }

        // --- AUTHORITY BLOCK ---
        if (parsed.recommended_level === 'emergency' && profile?.red_flags_resolved === true) {
          const denials = (profile.red_flag_denials || '').toLowerCase();

          // 1. Check for explicit denial prefixes (safeguards)
          const explicitDenialPrefixes = [
            'no',
            'none',
            'wala',
            'hindi',
            'dae',
            'dai',
            'wara',
            'nothing',
            'bako',
          ];
          const isExplicitDenial = explicitDenialPrefixes.some(
            (prefix) =>
              denials === prefix ||
              denials.startsWith(`${prefix} `) ||
              denials.startsWith(`${prefix},`) ||
              denials.startsWith(`${prefix}.`),
          );

          // 2. Strengthened validation using isNegated for any detected red flags
          const aiRedFlags = parsed.red_flags || [];
          const areRedFlagsNegated =
            aiRedFlags.length > 0 && aiRedFlags.every((rf) => isNegated(denials, rf).negated);

          const hasValidatedDenial = isExplicitDenial || areRedFlagsNegated;

          if (hasValidatedDenial) {
            console.log(
              `[GeminiClient] Authority Block: Activated (Explicit: ${isExplicitDenial}, Negated: ${areRedFlagsNegated}). Validating confidence...`,
            );
            // Only downgrade if confidence is HIGH
            if (profile.denial_confidence === 'high') {
              const fallbackLevel = emergency.score <= 5 ? 'health_center' : 'hospital';

              console.log(
                `[GeminiClient] Authority Block: Downgrading AI Emergency recommendation to ${fallbackLevel} as red flags were denied with HIGH confidence.`,
              );

              parsed.recommended_level = fallbackLevel;

              if (fallbackLevel === 'health_center') {
                parsed.user_advice =
                  'Based on your symptoms, we recommend a professional evaluation at your local Health Center. This is appropriate for routine viral screening (like flu or dengue) when no life-threatening signs are present. (Note: Care level adjusted as no critical signs were reported).';
              } else {
                parsed.user_advice =
                  'Based on the complexity or duration of your symptoms, we recommend a medical check-up at a Hospital. While no immediate life-threatening signs were reported, professional diagnostics are advised. (Note: Care level adjusted as no critical signs were reported).';
              }

              // Add clear escalation instructions to warnings
              if (!parsed.critical_warnings.some((w) => w.includes('stiff neck'))) {
                parsed.critical_warnings.unshift(
                  'Go to the Emergency Room IMMEDIATELY if you develop: stiff neck, confusion, or difficulty breathing.',
                );
              }
            } else {
              // If confidence is LOW or MEDIUM, RETAIN Emergency but add a warning
              console.log(
                `[GeminiClient] Authority Block: RETAINING Emergency despite denial (Confidence: ${profile.denial_confidence || 'unknown'}).`,
              );
              parsed.user_advice +=
                ' (Note: Critical symptoms were not definitively ruled out. Please verify immediately.)';
              parsed.critical_warnings.unshift(
                'Please confirm you are NOT experiencing chest pain, difficulty breathing, or severe confusion.',
              );
            }
          } else {
            console.log(
              `[GeminiClient] Authority Block: Bypassed. Red flag denials ("${denials}") did not pass strengthened validation.`,
            );
          }
        }

        // Update Cache (fire-and-forget with versioning)
        this.cacheQueue = this.cacheQueue
          .then(() =>
            AsyncStorage.setItem(
              fullCacheKey,
              JSON.stringify({
                data: parsed,
                timestamp: Date.now(),
                version: CACHE_VERSION,
              } as CacheEntry),
            ),
          )
          .catch((error) => console.warn('[GeminiClient] Cache write failed:', error));

        this.logFinalResult(parsed, symptoms);
        return parsed;
      } catch (error) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GeminiClient] Request failed (Attempt ${attempt}):`, errorMessage);

        if (attempt >= MAX_RETRIES) {
          throw new Error('Unable to connect to Health Assistant. Please check your connection.');
        }

        // Exponential backoff with jitter
        const delay = this.getRetryDelay(attempt);
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
    console.log(
      `║ CONTEXT: ${`${context}${assessmentText.length > BOX_WIDTH - 12 ? '...' : ''}`.padEnd(BOX_WIDTH - 10)} ║`,
    );
    console.log(`╟${divider}╢`);

    // Care Level
    const levelLabel = recommendation.recommended_level.replace(/_/g, ' ').toUpperCase();
    console.log(`║ RECOMMENDED LEVEL: ${levelLabel.padEnd(BOX_WIDTH - 20)} ║`);

    // Readiness & Ambiguity
    const readiness =
      recommendation.triage_readiness_score !== undefined
        ? `${(recommendation.triage_readiness_score * 100).toFixed(0)}%`
        : 'N/A';
    const ambig = recommendation.ambiguity_detected ? 'YES' : 'NO';
    const stats = `READINESS: ${readiness.padEnd(10)} | AMBIGUITY: ${ambig.padEnd(8)}`;
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
      console.log(
        `║ RED FLAGS: ${redFlagsStr.substring(0, BOX_WIDTH - 13).padEnd(BOX_WIDTH - 13)} ║`,
      );
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
