import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  GenerateContentRequest,
} from '@google/generative-ai';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SYMPTOM_ASSESSMENT_SYSTEM_PROMPT,
  VALID_SERVICES,
  GENERATE_ASSESSMENT_QUESTIONS_PROMPT,
  FINAL_SLOT_EXTRACTION_PROMPT,
  REFINE_QUESTION_PROMPT,
  REFINE_PLAN_PROMPT,
  IMMEDIATE_FOLLOW_UP_PROMPT,
  BRIDGE_PROMPT,
} from '../constants/prompts';
import { DEFAULT_RED_FLAG_QUESTION } from '../constants/clinical';
import { detectEmergency, isNegated } from '../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../services/mentalHealthDetector';
import { applyHedgingCorrections } from '../utils/hedgingDetector';
import {
  calculateTriageScore,
  prioritizeQuestions,
  parseAndValidateLLMResponse,
  normalizeSlot,
} from '../utils/aiUtils';
import { isMaternalContext, isTraumaContext } from '../utils/clinicalUtils';
import { AssessmentResponse } from '../types';
import {
  AssessmentProfile,
  AssessmentQuestion,
  TriageAdjustmentRule,
  TriageLogic,
  TriageCareLevel,
} from '../types/triage';

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

const slotHistoryWindowSetting = Number(Constants.expoConfig?.extra?.slotExtractionHistoryWindow);
const DEFAULT_USER_HISTORY_WINDOW =
  Number.isFinite(slotHistoryWindowSetting) && slotHistoryWindowSetting > 0
    ? slotHistoryWindowSetting
    : 8;

const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000;
const PROFILE_CACHE_PREFIX = 'clinical_profile_cache_';
const PROFILE_CACHE_VERSION = 1;

const PLAN_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PLAN_CACHE_PREFIX = 'assessment_plan_cache_';
const PLAN_CACHE_VERSION = 1;

const normalizeCacheInput = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().toLowerCase();

const getAssessmentPlanCacheKey = (symptom: string, patientContext?: string): string => {
  const base = normalizeCacheInput(symptom || '');
  if (!patientContext || !patientContext.trim()) return `${PLAN_CACHE_PREFIX}${base}`;
  return `${PLAN_CACHE_PREFIX}${base}|ctx:${simpleHash(normalizeCacheInput(patientContext))}`;
};

const simpleHash = (value: string): string => {
  let hash = 0;
  if (!value || value.length === 0) {
    return '0';
  }
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

const getHistoryHash = (text: string): string => simpleHash(normalizeCacheInput(text || ''));
const getProfileCacheKey = (historyHash: string): string =>
  `${PROFILE_CACHE_PREFIX}${historyHash}|v${PROFILE_CACHE_VERSION}`;

interface ClinicalProfileCacheEntry {
  data: AssessmentProfile;
  timestamp: number;
  version: number;
}

interface AssessmentPlanCacheEntry {
  data: { questions: AssessmentQuestion[]; intro?: string };
  timestamp: number;
  version: number;
}

type SafetyFallbackContext = 'maternal' | 'trauma' | 'general';

const MATERNAL_SAFETY_GOLDEN_SET: AssessmentQuestion[] = [
  {
    id: 'maternal_gestation',
    text: 'How many weeks pregnant are you or how long has it been since delivery?',
  },
  {
    id: 'maternal_bleeding',
    text: 'Are you experiencing vaginal bleeding? If so, how heavy is it and has it changed recently?',
  },
  {
    id: 'maternal_fetal',
    text: 'If you are pregnant, have you noticed any change in fetal movement in the past day?',
  },
  {
    id: 'maternal_pain',
    text: 'Where is the pain located, and how would you describe its severity?',
  },
  {
    id: 'maternal_history',
    text: 'Do you have a history of pregnancy complications like preeclampsia, preterm labor, or placenta issues?',
  },
  DEFAULT_RED_FLAG_QUESTION,
];

const TRAUMA_SAFETY_GOLDEN_SET: AssessmentQuestion[] = [
  {
    id: 'trauma_mobility',
    text: 'Can you bear weight or move the injured limb without it giving way?',
  },
  {
    id: 'trauma_bleeding',
    text: 'Is there active bleeding, pooling blood, or an exposed bone near the wound?',
  },
  {
    id: 'trauma_pain',
    text: 'On a scale of 1 to 10, how intense is the pain and does it feel sharp, dull, or throbbing?',
  },
  {
    id: 'trauma_mechanism',
    text: 'What happened to cause the injury (e.g., fall, hit, blow, accident)?',
  },
  {
    id: 'trauma_timing',
    text: 'When did the injury occur or when did you first notice symptoms?',
  },
  DEFAULT_RED_FLAG_QUESTION,
];

const GENERAL_SAFETY_GOLDEN_SET: AssessmentQuestion[] = [
  {
    id: 'general_duration',
    text: 'How long have you been dealing with this chief complaint?',
  },
  {
    id: 'general_severity',
    text: 'On a scale of 1 to 10, how severe would you rate the symptoms right now?',
  },
  {
    id: 'general_age',
    text: 'What is your current age?',
  },
  {
    id: 'general_history',
    text: 'Do you have any significant medical history, chronic conditions, or recent hospital visits?',
  },
  {
    id: 'general_medications',
    text: 'Are you currently taking any prescribed or over-the-counter medications?',
  },
  DEFAULT_RED_FLAG_QUESTION,
];

const SAFETY_GOLDEN_SET_BY_CONTEXT: Record<SafetyFallbackContext, AssessmentQuestion[]> = {
  maternal: MATERNAL_SAFETY_GOLDEN_SET,
  trauma: TRAUMA_SAFETY_GOLDEN_SET,
  general: GENERAL_SAFETY_GOLDEN_SET,
};

const detectSafetyFallbackContext = (text: string): SafetyFallbackContext => {
  const normalized = text?.trim() || '';

  if (isMaternalContext(normalized)) return 'maternal';
  if (isTraumaContext(normalized)) return 'trauma';
  return 'general';
};

class NonRetryableError extends Error {
  public readonly isRetryable = false;

  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

// Canonical triage adjustment metadata for auditing and analytics.
const TRIAGE_ADJUSTMENT_RULES: Record<
  TriageAdjustmentRule,
  { condition: string; location: string }
> = {
  SYSTEM_BASED_LOCK_CARDIAC: {
    condition: 'System keyword detected in cardiac domain',
    location: 'src/services/emergencyDetector.ts',
  },
  SYSTEM_BASED_LOCK_RESPIRATORY: {
    condition: 'System keyword detected in respiratory domain',
    location: 'src/services/emergencyDetector.ts',
  },
  SYSTEM_BASED_LOCK_NEUROLOGICAL: {
    condition: 'System keyword detected in neurological domain',
    location: 'src/services/emergencyDetector.ts',
  },
  SYSTEM_BASED_LOCK_TRAUMA: {
    condition: 'System keyword detected in trauma domain',
    location: 'src/services/emergencyDetector.ts',
  },
  SYSTEM_BASED_LOCK_ABDOMEN: {
    condition: 'System keyword detected in acute abdomen domain',
    location: 'src/services/emergencyDetector.ts',
  },
  CONSENSUS_CHECK: {
    condition: 'Cross-model or rule consensus required',
    location: 'src/api/geminiClient.ts',
  },
  AGE_ESCALATION: {
    condition: 'Age-related escalation applied',
    location: 'src/api/geminiClient.ts',
  },
  READINESS_UPGRADE: {
    condition: 'Low readiness score or ambiguity detected',
    location: 'src/api/geminiClient.ts (Conservative Fallback)',
  },
  RED_FLAG_UPGRADE: {
    condition: 'Red flags present without emergency level',
    location: 'src/api/geminiClient.ts (Conservative Fallback)',
  },
  RECENT_RESOLVED_FLOOR: {
    condition: 'High-risk symptom recently resolved',
    location: 'src/api/geminiClient.ts (Recent Resolved Floor)',
  },
  AUTHORITY_DOWNGRADE: {
    condition: 'High-confidence denial of red flags',
    location: 'src/api/geminiClient.ts (Authority Block)',
  },
  MENTAL_HEALTH_OVERRIDE: {
    condition: 'Mental health crisis keywords detected',
    location: 'src/api/geminiClient.ts (Safety Overrides)',
  },
  OFFLINE_FALLBACK: {
    condition: 'Offline or local fallback used',
    location: 'src/api/geminiClient.ts',
  },
  MANUAL_OVERRIDE: {
    condition: 'Manual override applied',
    location: 'src/api/geminiClient.ts',
  },
};

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
  private profileCacheQueue: Promise<void>;
  private inFlightProfileExtractions: Map<string, Promise<AssessmentProfile>>;

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
    this.profileCacheQueue = Promise.resolve();
    this.inFlightProfileExtractions = new Map<string, Promise<AssessmentProfile>>();
  }

  /**
   * Normalizes strings used for cache keys to avoid volatility from whitespace or casing.
   */
  private normalizeCacheKeyInput(value: string): string {
    return value.replace(/\s+/g, ' ').toLowerCase().trim();
  }

  /**
   * Generates a cache key based on symptoms, history, and an optional override input.
   */
  private getCacheKey(
    symptoms: string,
    history: ChatMessage[] = [],
    cacheKeyInput?: string,
    patientContext?: string,
  ): string {
    const overrideSource = cacheKeyInput?.trim() ? cacheKeyInput : symptoms;
    const symptomsKey = this.normalizeCacheKeyInput(overrideSource);
    let key = symptomsKey;

    if (history.length > 0) {
      // Hash conversation for fixed-length keys
      const historyStr = history.map((m) => `${m.role}:${m.text}`).join('|');
      const historyHash = this.simpleHash(historyStr);
      key = `${key}|h:${historyHash}`;
    }

    if (patientContext && patientContext.trim()) {
      const contextHash = this.simpleHash(this.normalizeCacheKeyInput(patientContext));
      key = `${key}|ctx:${contextHash}`;
    }

    return key;
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
   * Prepends patient context to a prompt if provided.
   */
  private applyPatientContext(prompt: string, patientContext?: string): string {
    if (!patientContext || !patientContext.trim()) {
      return prompt;
    }
    return `${patientContext.trim()}\n\n---\n\n${prompt}`;
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
        throw new NonRetryableError('Daily AI request limit reached. Please try again tomorrow.');
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

      const normalizeLevel = (level: string): TriageCareLevel =>
        (level as string).replace('-', '_') as TriageCareLevel;

      // Explicit field mapping with fallbacks using nullish coalescing
      const clinicalSoap =
        json.clinical_soap ??
        (json.soap_note ? JSON.stringify(json.soap_note) : null) ??
        'No clinical summary available.';

      const userAdvice =
        json.user_advice ??
        json.condition_summary ??
        "Based on your symptoms, we've analyzed your condition. Please see the recommendations below.";

      const normalizedLevel = normalizeLevel(json.recommended_level);

      return {
        recommended_level: normalizedLevel,
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
        medical_justification: json.medical_justification,
        triage_logic: {
          original_level: normalizedLevel,
          final_level: normalizedLevel,
          adjustments: [],
        },
      };
    } catch (error) {
      console.error('JSON Parse Error:', error);
      throw new NonRetryableError('Invalid response format from AI.');
    }
  }

  /**
   * Periodically clears cache entries that are expired or no longer match the current version.
   * Runs if more than 24 hours have passed since the last cleanup trigger.
   */
  private async performCacheCleanup(): Promise<void> {
    try {
      const now = Date.now();
      const lastCleanup = await AsyncStorage.getItem(STORAGE_KEY_LAST_CLEANUP);
      const lastCleanupTime = lastCleanup ? parseInt(lastCleanup, 10) : 0;

      if (now - lastCleanupTime > 24 * 60 * 60 * 1000) {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = (allKeys || []).filter((key) => key.startsWith(STORAGE_KEY_CACHE_PREFIX));

        if (cacheKeys.length > 0) {
          const keyPairs = await AsyncStorage.multiGet(cacheKeys);
          const keysToRemove: string[] = [];

          keyPairs.forEach(([key, cachedJson]) => {
            if (!cachedJson) {
              keysToRemove.push(key);
              return;
            }

            try {
              const cached = JSON.parse(cachedJson) as CacheEntry;
              const age = now - (typeof cached.timestamp === 'number' ? cached.timestamp : 0);

              if (cached.version !== CACHE_VERSION || age >= CACHE_TTL_MS) {
                keysToRemove.push(key);
              }
            } catch (parseError) {
              keysToRemove.push(key);
              console.warn(
                '[GeminiClient] Failed to parse cache entry during cleanup:',
                parseError,
              );
            }
          });

          if (keysToRemove.length > 0) {
            await AsyncStorage.multiRemove(keysToRemove);
            console.log(
              `[GeminiClient] Removed ${keysToRemove.length} expired or version-mismatched cache entries.`,
            );
          }
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
      const cacheKeys = (allKeys || []).filter((key) => key.startsWith(STORAGE_KEY_CACHE_PREFIX));

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
   * Shared helper for one-off content generation requests.
   * Applies the centralized rate limit + retry policy.
   */
  private async generateContentWithRetry(
    params:
      | string
      | (string | { inlineData: { data: string; mimeType: string } })[]
      | GenerateContentRequest,
    generationConfig?: { responseMimeType?: string },
  ): Promise<string> {
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        await this.checkRateLimits();

        const model = this.genAI.getGenerativeModel({
          model: MODEL_NAME,
          ...(generationConfig ? { generationConfig } : {}),
        });

        const result = await model.generateContent(params);
        const response = await result.response;
        return response.text();
      } catch (error) {
        const errMessage = (error as Error).message || 'Unknown error';

        if (!this.isTransientFailure(error)) {
          console.error('[GeminiClient] Non-retryable generation error:', errMessage);
          throw error;
        }

        attempt += 1;
        console.warn(`[GeminiClient] Generation attempt ${attempt} failed:`, errMessage);

        if (attempt >= MAX_RETRIES) {
          if (errMessage.includes('503')) {
            throw new Error(
              'The AI service is currently overloaded. Please try again in a moment.',
            );
          }
          throw error;
        }

        const delay = this.getRetryDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to connect to AI service after multiple attempts.');
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
   * Produces the initial assessment plan (Call #1) with caching.
   */
  public async generateAssessmentPlan(
    initialSymptom: string,
    patientContext?: string,
  ): Promise<{ questions: AssessmentQuestion[]; intro?: string }> {
    const cacheKey = getAssessmentPlanCacheKey(initialSymptom, patientContext);

    try {
      const cachedJson = await AsyncStorage.getItem(cacheKey);
      if (cachedJson) {
        const cached = JSON.parse(cachedJson) as AssessmentPlanCacheEntry;
        if (
          cached.version === PLAN_CACHE_VERSION &&
          Date.now() - cached.timestamp < PLAN_CACHE_TTL_MS
        ) {
          console.log('[GeminiClient] Returning cached assessment plan');
          return cached.data;
        }

        await AsyncStorage.removeItem(cacheKey);
      }
    } catch (cacheReadError) {
      console.warn('[GeminiClient] Assessment plan cache read failed:', cacheReadError);
    }

    try {
      let prompt = GENERATE_ASSESSMENT_QUESTIONS_PROMPT.replace(
        '{{initialSymptom}}',
        initialSymptom,
      );
      prompt = this.applyPatientContext(prompt, patientContext);

      const responseText = await this.generateContentWithRetry(prompt);

      const parsed = parseAndValidateLLMResponse<{
        questions: AssessmentQuestion[];
        intro?: string;
      }>(responseText);
      const questions = parsed.questions || [];

      let prioritizedQuestions: AssessmentQuestion[];
      try {
        prioritizedQuestions = prioritizeQuestions(questions);
      } catch (prioritizationError) {
        console.error('[GeminiClient] Prioritization failed:', prioritizationError);
        console.log('[GeminiClient] Original Questions Data:', JSON.stringify(questions));
        console.log('[GeminiClient] Fallback: Injecting default red flags into original list.');

        const safeQuestions = Array.isArray(questions)
          ? questions.filter((q) => q && q.id !== 'red_flags')
          : [];
        const insertIndex = safeQuestions.length > 0 ? 1 : 0;
        safeQuestions.splice(insertIndex, 0, DEFAULT_RED_FLAG_QUESTION);

        prioritizedQuestions = safeQuestions;
      }

      const plan = {
        questions: prioritizedQuestions,
        intro: parsed.intro,
      };

      AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: plan,
          timestamp: Date.now(),
          version: PLAN_CACHE_VERSION,
        } as AssessmentPlanCacheEntry),
      ).catch((cacheWriteError) =>
        console.warn('[GeminiClient] Assessment plan cache write failed:', cacheWriteError),
      );

      return plan;
    } catch (error) {
      console.error('[GeminiClient] Failed to generate assessment plan:', error);
      const fallbackContext = detectSafetyFallbackContext(initialSymptom);
      return {
        questions: SAFETY_GOLDEN_SET_BY_CONTEXT[fallbackContext],
      };
    }
  }

  /**
   * Refines the assessment plan by generating focused follow-up questions based on the current profile.
   * This is a lightweight call to replace the tail of the plan when the context changes.
   */
  public async refineAssessmentPlan(
    currentProfile: AssessmentProfile,
    remainingCount: number,
  ): Promise<AssessmentQuestion[]> {
    try {
      // Format the profile for the prompt
      const profileContext = JSON.stringify(currentProfile, null, 2);

      const prompt = REFINE_PLAN_PROMPT.replace('{{currentProfile}}', profileContext).replace(
        '{{remainingCount}}',
        remainingCount.toString(),
      );

      const responseText = await this.generateContentWithRetry(prompt, {
        responseMimeType: 'application/json',
      });

      const parsed = parseAndValidateLLMResponse<{ questions: AssessmentQuestion[] }>(responseText);

      // Basic validation/normalization
      const questions = parsed.questions || [];

      // Ensure we don't return more than requested
      return questions.slice(0, remainingCount);
    } catch (error) {
      console.error('[GeminiClient] Failed to refine assessment plan:', error);
      // Fallback: Return empty array so the caller keeps the existing plan or handles it gracefully
      return [];
    }
  }

  /**
   * Generates a single, targeted follow-up question for immediate drill-down.
   */
  public async generateImmediateFollowUp(
    profile: AssessmentProfile,
    context: string,
  ): Promise<AssessmentQuestion> {
    try {
      const prompt = IMMEDIATE_FOLLOW_UP_PROMPT.replace(
        '{{profile}}',
        JSON.stringify(profile, null, 2),
      ).replace('{{context}}', context);

      const responseText = await this.generateContentWithRetry(prompt, {
        responseMimeType: 'application/json',
      });

      const parsed = parseAndValidateLLMResponse<{ question: AssessmentQuestion }>(responseText);

      // Default fallback if parsing fails or returns empty
      if (!parsed.question || !parsed.question.text) {
        throw new Error('Invalid drill-down question generated');
      }

      return parsed.question;
    } catch (error) {
      console.error('[GeminiClient] Failed to generate immediate follow-up:', error);
      // Fallback question
      return {
        id: `fallback-${Date.now()}`,
        text: 'Could you tell me more about that specific symptom?',
        type: 'text',
        tier: 3,
        is_red_flag: false,
      };
    }
  }

  public async generateBridgeMessage(args: {
    conversationHistory: string;
    nextQuestion: string;
    primarySymptom?: string;
    severityLevel?: number;
    symptomCategory?: string;
  }): Promise<string> {
    const prompt = BRIDGE_PROMPT
      .replace('{{conversationHistory}}', args.conversationHistory || 'No recent user replies.')
      .replace('{{nextQuestion}}', args.nextQuestion)
      .replace('{{primarySymptom}}', args.primarySymptom || 'the symptoms you reported earlier')
      .replace('{{symptomCategory}}', args.symptomCategory || 'unknown')
      .replace(
        '{{severityLevel}}',
        args.severityLevel !== undefined ? args.severityLevel.toFixed(0) : 'unknown',
      );

    const responseText = await this.generateContentWithRetry(prompt);
    return responseText.trim();
  }

  /**
   * Extracts the final clinical profile (Call #2) with caching and de-duplication.
   */
  public async extractClinicalProfile(
    history: { role: 'assistant' | 'user'; text: string }[],
    options?: {
      userHistoryWindow?: number;
    },
  ): Promise<AssessmentProfile> {
    const requestedWindow = options?.userHistoryWindow ?? DEFAULT_USER_HISTORY_WINDOW;
    const historyWindow = Math.max(0, Math.floor(requestedWindow));

    const userMessages = history.filter((msg) => msg.role === 'user');
    const limitedMessages = historyWindow > 0 ? userMessages.slice(-historyWindow) : userMessages;

    const conversationText = limitedMessages.map((msg) => `USER: ${msg.text}`).join('\n');
    const historyHash = getHistoryHash(conversationText);
    const versionedHistoryKey = `${historyHash}|v${PROFILE_CACHE_VERSION}`;
    const cacheKey = getProfileCacheKey(historyHash);

    try {
      const cachedJson = await AsyncStorage.getItem(cacheKey);
      if (cachedJson) {
        const cached = JSON.parse(cachedJson) as ClinicalProfileCacheEntry;
        if (
          cached.version === PROFILE_CACHE_VERSION &&
          Date.now() - cached.timestamp < PROFILE_CACHE_TTL_MS
        ) {
          console.log('[GeminiClient] Returning cached clinical profile');
          return cached.data;
        }
        await AsyncStorage.removeItem(cacheKey);
      }
    } catch (cacheReadError) {
      console.warn('[GeminiClient] Clinical profile cache read failed:', cacheReadError);
    }

    const inflight = this.inFlightProfileExtractions.get(versionedHistoryKey);
    if (inflight) {
      return inflight;
    }

    const persistProfileToCache = (profile: AssessmentProfile) => {
      this.profileCacheQueue = this.profileCacheQueue
        .then(() =>
          AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: profile,
              timestamp: Date.now(),
              version: PROFILE_CACHE_VERSION,
            } as ClinicalProfileCacheEntry),
          ),
        )
        .catch((error) =>
          console.warn('[GeminiClient] Clinical profile cache write failed:', error),
        );
    };

    const requestPromise = (async () => {
      try {
        const prompt = FINAL_SLOT_EXTRACTION_PROMPT.replace(
          '{{conversationHistory}}',
          conversationText,
        );

        const responseText = await this.generateContentWithRetry(prompt, {
          responseMimeType: 'application/json',
        });

        const profile = JSON.parse(responseText) as AssessmentProfile;

        profile.age = normalizeSlot(profile.age);
        profile.duration = normalizeSlot(profile.duration);
        profile.severity = normalizeSlot(profile.severity);
        profile.progression = normalizeSlot(profile.progression);
        profile.red_flag_denials = normalizeSlot(profile.red_flag_denials, { allowNone: true });

        const correctedProfile = applyHedgingCorrections(profile);

        const { score, escalated_category } = calculateTriageScore({
          ...correctedProfile,
          symptom_text: conversationText,
        });

        correctedProfile.triage_readiness_score = score;
        correctedProfile.symptom_category = escalated_category;

        if (escalated_category === 'complex' || escalated_category === 'critical') {
          correctedProfile.is_complex_case = true;
        }

        persistProfileToCache(correctedProfile);
        return correctedProfile;
      } catch (error) {
        console.error('[GeminiClient] Failed to extract profile:', error);

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
    })();

    this.inFlightProfileExtractions.set(versionedHistoryKey, requestPromise);
    requestPromise.finally(() => {
      this.inFlightProfileExtractions.delete(versionedHistoryKey);
    });

    return requestPromise;
  }

  /**
   * Simplified unary response generator for ad-hoc prompts (e.g., friction resolution).
   */
  public async getGeminiResponse(prompt: string): Promise<string> {
    try {
      const responseText = await this.generateContentWithRetry(prompt);
      return responseText.trim();
    } catch (error) {
      console.error('[GeminiClient] getGeminiResponse failed:', error);
      throw error;
    }
  }

  /**
   * Streams AI output similarly to the legacy approach while still respecting rate limits.
   */
  public async *streamGeminiResponse(
    prompt: string | (string | { inlineData: { data: string; mimeType: string } })[],
    options?: {
      generationConfig?: { responseMimeType: string };
      chunkSize?: number;
    },
  ): AsyncGenerator<string, void, unknown> {
    try {
      const responseText = await this.generateContentWithRetry(prompt, options?.generationConfig);
      const chunkSize = options?.chunkSize ?? 20;

      for (let i = 0; i < responseText.length; i += chunkSize) {
        yield responseText.slice(i, i + chunkSize);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } catch (error) {
      console.error('[GeminiClient] streamGeminiResponse failed:', error);
      throw error;
    }
  }

  /**
   * Refines follow-up questions while leveraging centralized retry handling.
   */
  public async refineQuestion(questionText: string, userAnswer: string): Promise<string> {
    try {
      const prompt = REFINE_QUESTION_PROMPT.replace('{{questionText}}', questionText).replace(
        '{{userAnswer}}',
        userAnswer,
      );

      const responseText = await this.generateContentWithRetry(prompt);
      return responseText.trim() || questionText;
    } catch (error) {
      console.error('[GeminiClient] Failed to refine question:', error);
      return questionText;
    }
  }

  /**
   * Initializes triage logic metadata with a stable original level.
   */
  private createTriageLogic(original: TriageCareLevel): TriageLogic {
    return {
      original_level: original,
      final_level: original,
      adjustments: [],
    };
  }

  private isEmergencyLocalOnlyToggleEnabled(): boolean {
    return Constants.expoConfig?.extra?.forceEmergencyLocalFallback === true;
  }

  /**
   * Appends a triage adjustment entry and updates the final level.
   */
  private appendTriageAdjustment(
    logic: TriageLogic,
    from: TriageCareLevel,
    to: TriageCareLevel,
    rule: TriageAdjustmentRule,
    reason: string,
  ): TriageLogic {
    // Keep a single catalog of rules for auditing and troubleshooting.
    if (!TRIAGE_ADJUSTMENT_RULES[rule]) {
      console.warn(`[GeminiClient] Unknown triage rule used: ${rule}`);
    }
    return {
      original_level: logic.original_level,
      final_level: to,
      adjustments: [
        ...logic.adjustments,
        {
          from,
          to,
          rule,
          reason,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  /**
   * Only transient failures (5xx, network glitches, timeouts) can be retried.
   * Any deterministic parse/schema error should surface immediately.
   */
  private isTransientFailure(error: unknown): boolean {
    if (error instanceof NonRetryableError) {
      return false;
    }

    const status = (error as { status?: number }).status;
    if (typeof status === 'number' && status >= 500 && status < 600) {
      return true;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const transientMarkers = ['timeout', 'network', 'connection reset', 'unavailable'];
      if (transientMarkers.some((marker) => message.includes(marker))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Main assessment function.
   * @param symptoms The clinical context for the LLM (may include history/questions)
   * @param history Optional conversation history
   * @param safetyContext Optional specialized string for local safety scanning (user-only content)
   * @param profile Optional structured assessment profile for context-aware triage
   * @param cacheKeyInput Optional string to override the primary symptom in the cache key
   * @param patientContext Optional human-readable health profile preamble
   */
  public async assessSymptoms(
    symptoms: string,
    history: ChatMessage[] = [],
    safetyContext?: string,
    profile?: AssessmentProfile,
    cacheKeyInput?: string,
    patientContext?: string,
  ): Promise<AssessmentResponse> {
    // 0. Periodic Cleanup (non-blocking)
    this.performCacheCleanup().catch((e) => console.warn('Cleanup failed:', e));

    /**
     * Refines a triage response from the LLM based on clinical context and safety rules.
     */

    // 1. Safety Overrides (Local Logic)
    const scanInput = safetyContext || symptoms;
    const historyContext = history.length > 0 ? history.map((h) => h.text).join('\n') : undefined;

    const emergency = detectEmergency(scanInput, {
      isUserInput: true,
      historyContext: historyContext,
      profile: profile,
      questionId: 'final_safety_scan',
    });

    let emergencyFallback: AssessmentResponse | null = null;

    if (emergency.isEmergency && !profile?.is_recent_resolved) {
      console.log(
        `[GeminiClient] Emergency detected locally (${emergency.matchedKeywords.join(', ')}). Preparing fallback and attempting AI enrichment.`,
      );

      let advice =
        'CRITICAL: Potential life-threatening condition detected based on your symptoms. Go to the nearest emergency room or call emergency services immediately.';

      if (emergency.affectedSystems.includes('Trauma')) {
        advice =
          'CRITICAL: Severe injury detected. Please go to the nearest emergency room immediately for urgent trauma care.';
      } else if (
        emergency.affectedSystems.includes('Cardiac') ||
        emergency.affectedSystems.includes('Respiratory')
      ) {
        advice =
          'CRITICAL: Potential life-threatening cardiovascular or respiratory distress detected. Seek emergency medical care immediately.';
      } else if (emergency.affectedSystems.includes('Neurological')) {
        advice =
          'CRITICAL: Potential neurological emergency detected. Please go to the nearest emergency room immediately.';
      }

      emergencyFallback = {
        recommended_level: 'emergency',
        follow_up_questions: [],
        user_advice: advice,
        clinical_soap: `S: Patient reports ${emergency.matchedKeywords.join(', ')}. O: AI detected critical emergency keywords (${emergency.affectedSystems.join(', ')}). A: Potential life-threatening condition. P: Immediate ED referral.`,
        key_concerns: emergency.matchedKeywords.map((k) => `Urgent: ${k}`),
        critical_warnings: ['Life-threatening condition possible', 'Do not delay care'],
        relevant_services: ['Emergency'],
        red_flags: emergency.matchedKeywords,
        triage_readiness_score: 1.0,
        medical_justification: emergency.medical_justification,
        triage_logic: this.appendTriageAdjustment(
          this.createTriageLogic('emergency'),
          'emergency',
          'emergency',
          emergency.affectedSystems.includes('Cardiac')
            ? 'SYSTEM_BASED_LOCK_CARDIAC'
            : 'RED_FLAG_UPGRADE',
          emergency.medical_justification || 'Emergency override triggered by keyword detector.',
        ),
      };

      // We DO NOT return here anymore. We try to get a better explanation from Gemini.
    }

    const mhCrisis = detectMentalHealthCrisis(scanInput);
    if (mhCrisis.isCrisis) {
      // Mental Health crisis remains an immediate exit for safety and simplicity
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
        medical_justification: mhCrisis.medical_justification,
        triage_logic: this.appendTriageAdjustment(
          this.createTriageLogic('emergency'),
          'emergency',
          'emergency',
          'MENTAL_HEALTH_OVERRIDE',
          mhCrisis.medical_justification || 'Mental health crisis detected',
        ),
      };

      this.logFinalResult(response, scanInput);
      return response;
    }

    if (this.isEmergencyLocalOnlyToggleEnabled() && emergencyFallback) {
      console.warn(
        '[GeminiClient] Emergency local-only toggle enabled; returning local emergency fallback without calling Gemini.',
      );
      this.logFinalResult(emergencyFallback, symptoms);
      return emergencyFallback;
    }

    // 2. Cache Check (non-blocking read)
    const cacheKey = this.getCacheKey(symptoms, history, cacheKeyInput, patientContext);
    const fullCacheKey = `${STORAGE_KEY_CACHE_PREFIX}${cacheKey}`;

    // Skip cache if we have a pending emergency fallback to force fresh verification
    if (!emergencyFallback) {
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
    }

    // 3. API Call with Retry
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        await this.checkRateLimits();

        // Inject critical context if local emergency was detected
        let systemPrompt = emergencyFallback
          ? `${SYMPTOM_ASSESSMENT_SYSTEM_PROMPT}\n\nCRITICAL SAFETY OVERRIDE: The system has detected EMERGENCY KEYWORDS (${emergency.matchedKeywords.join(', ')}). You MUST output "recommended_level": "emergency". Your goal is to explain WHY this is an emergency to the user in a calm, authoritative way.`
          : SYMPTOM_ASSESSMENT_SYSTEM_PROMPT;

        systemPrompt = this.applyPatientContext(systemPrompt, patientContext);

        // Construct Chat History for Gemini
        const chat = this.model.startChat({
          history: [
            {
              role: 'user',
              parts: [{ text: systemPrompt }],
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

        // --- ENFORCE EMERGENCY FALLBACK IF APPLICABLE ---
        if (emergencyFallback) {
          console.log('[GeminiClient] Applying Emergency System Lock to AI Response.');
          parsed.recommended_level = 'emergency';
          parsed.triage_logic = emergencyFallback.triage_logic; // Preserve the system lock reason

          // Ensure red flags are merged
          parsed.red_flags = Array.from(
            new Set([...(parsed.red_flags || []), ...emergencyFallback.red_flags]),
          );

          // Ensure readiness score reflects urgency
          parsed.triage_readiness_score = 1.0;

          // Fallback services if AI missed them
          if (!parsed.relevant_services || parsed.relevant_services.length === 0) {
            parsed.relevant_services = ['Emergency'];
          }
        }

        // --- Conservative Fallback Logic ---
        const levels: TriageCareLevel[] = ['self_care', 'health_center', 'hospital', 'emergency'];
        let currentLevelIdx = levels.indexOf(parsed.recommended_level as TriageCareLevel);
        const originalLevel = parsed.recommended_level as TriageCareLevel;
        parsed.triage_logic = this.createTriageLogic(originalLevel);

        // Initialize flags
        parsed.is_conservative_fallback = false;
        if (profile?.clinical_friction_detected) {
          parsed.clinical_friction_details = {
            detected: true,
            reason: profile.clinical_friction_details,
          };
        }

        // Safety rationale: red flags require emergency escalation if the AI under-triaged.
        // The upgrade is tracked in triage_logic metadata instead of user-facing notes.
        if (
          parsed.red_flags &&
          parsed.red_flags.length > 0 &&
          parsed.recommended_level !== 'emergency'
        ) {
          console.log(
            '[GeminiClient] Red flags detected but not Emergency. Upgrading to Emergency.',
          );
          const fromLevel = parsed.recommended_level as TriageCareLevel;
          parsed.recommended_level = 'emergency';
          parsed.is_conservative_fallback = true;
          currentLevelIdx = 3;
          parsed.triage_logic = this.appendTriageAdjustment(
            parsed.triage_logic,
            fromLevel,
            'emergency',
            'RED_FLAG_UPGRADE',
            'Detected red flags without emergency level; upgraded to emergency.',
          );
        }

        // Safety rationale: low readiness/ambiguity increases uncertainty, so we step up care.
        // The rationale and thresholds are tracked in triage_logic metadata only.
        const readinessThreshold = profile?.is_vulnerable ? 0.9 : 0.8;
        const isLowReadiness =
          parsed.triage_readiness_score !== undefined &&
          parsed.triage_readiness_score < readinessThreshold;
        const isAmbiguous = parsed.ambiguity_detected === true;

        if ((isLowReadiness || isAmbiguous) && currentLevelIdx < 3) {
          const nextLevel = levels[currentLevelIdx + 1] as AssessmentResponse['recommended_level'];
          console.log(
            `[GeminiClient] Fallback Triggered. Upgrading ${parsed.recommended_level} to ${nextLevel}. Low Readiness: ${isLowReadiness} (Threshold: ${readinessThreshold}), Ambiguous: ${isAmbiguous}`,
          );

          const fromLevel = parsed.recommended_level as TriageCareLevel;
          parsed.recommended_level = nextLevel;
          parsed.is_conservative_fallback = true;
          parsed.triage_logic = this.appendTriageAdjustment(
            parsed.triage_logic,
            fromLevel,
            nextLevel as TriageCareLevel,
            'READINESS_UPGRADE',
            `triage_readiness_score ${parsed.triage_readiness_score ?? 'N/A'} or ambiguity triggered conservative upgrade.`,
          );
          currentLevelIdx = levels.indexOf(parsed.recommended_level as TriageCareLevel);
        }

        // --- CONSERVATIVE TRIAGE: TRANSIENT SYMPTOM LOGIC (RECENTLY RESOLVED) ---
        /**
         * CLINICAL RATIONALE:
         * For symptoms involving high-risk keywords (Chest Pain, Slurred Speech, etc.) that have
         * since resolved, we apply a "Hospital Floor" safety protocol.
         *
         * 1. Downgrade from Emergency (911): If symptoms are currently gone, an ambulance
         *    is likely not required for transport, but the patient STILL needs immediate
         *    ER evaluation to rule out TIA, unstable angina, or other intermittent crises.
         * 2. Upgrade from Primary Care: Even if the AI suggests "Self-Care" because symptoms
         *    are absent now, the history of a high-risk event mandates professional diagnostics.
         */
        if (profile?.is_recent_resolved) {
          console.log(
            `[GeminiClient] RECENT_RESOLVED logic applied. Previous level: ${parsed.recommended_level}`,
          );

          // Force level to 'hospital' regardless of AI's suggestion for resolved high-risk symptoms.
          // This maps to "Seek emergency care within 1-2 hours" or "Visit urgent care today".
          const fromLevel = parsed.recommended_level as TriageCareLevel;
          parsed.recommended_level = 'hospital';
          parsed.is_conservative_fallback = true;
          currentLevelIdx = 2; // Index for 'hospital'
          // Track the safety adjustment in metadata instead of user-facing advice.
          parsed.triage_logic = this.appendTriageAdjustment(
            parsed.triage_logic,
            fromLevel,
            'hospital',
            'RECENT_RESOLVED_FLOOR',
            `Recent resolved symptom (${profile.resolved_keyword || 'unknown'}) requires hospital evaluation.`,
          );

          const temporalNote =
            '\n\nWhile your symptoms have eased, the type of event you described still needs prompt evaluation to rule out time-sensitive conditions.';

          if (!parsed.user_advice.includes(temporalNote)) {
            // Keep patient-facing wording calm and clear without internal labels.
            parsed.user_advice =
              parsed.user_advice
                .replace(/call 911 immediately/gi, 'visit the emergency room immediately')
                .replace(/ambulance/gi, 'transport') + temporalNote;
          }
        }

        // --- AUTHORITY BLOCK ---
        // Safety rationale: if a user explicitly and confidently denies red flags, we can step down.
        // Any downgrade remains fully audit-traced in triage_logic metadata, not in user-facing text.
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
              // Safety rationale: validated denial allows step-down, tracked as metadata.
              parsed.triage_logic = this.appendTriageAdjustment(
                parsed.triage_logic,
                'emergency',
                fallbackLevel as TriageCareLevel,
                'AUTHORITY_DOWNGRADE',
                'Red flags denied with high confidence; authority block applied.',
              );

              if (fallbackLevel === 'health_center') {
                parsed.user_advice =
                  'Based on your symptoms, we recommend a professional evaluation at your local Health Center. This is appropriate for routine viral screening (like flu or dengue) when no life-threatening signs are present.';
              } else {
                parsed.user_advice =
                  'Based on the complexity or duration of your symptoms, we recommend a medical check-up at a Hospital. While no immediate life-threatening signs were reported, professional diagnostics are advised.';
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
              // Safety rationale: uncertainty requires keeping emergency level; keep messaging patient-facing.
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

        if (parsed.triage_logic) {
          parsed.triage_logic = {
            ...parsed.triage_logic,
            final_level: parsed.recommended_level as TriageCareLevel,
          };
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (error instanceof NonRetryableError) {
          console.error('[GeminiClient] Non-retryable error encountered:', errorMessage);
          throw error;
        }

        if (!this.isTransientFailure(error)) {
          console.error('[GeminiClient] Non-transient failure; aborting retries:', errorMessage);
          throw error instanceof Error ? error : new Error('Unexpected non-transient failure');
        }

        attempt++;
        console.error(`[GeminiClient] Request failed (Attempt ${attempt}):`, errorMessage);

        if (attempt >= MAX_RETRIES) {
          throw new Error('Unable to connect to Health Assistant. Please check your connection.');
        }

        // Exponential backoff with jitter
        const delay = this.getRetryDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Final Fallback: If API completely failed but we had a local emergency match, use it.
    if (emergencyFallback) {
      console.warn('[GeminiClient] API unavailable for emergency case. Using local fallback.');
      this.logFinalResult(emergencyFallback, symptoms);
      return emergencyFallback;
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
