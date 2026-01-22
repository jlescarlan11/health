import { AssessmentQuestion } from '../types/triage';
import { DEFAULT_RED_FLAG_QUESTION } from '../constants/clinical';

/**
 * Normalizes a slot value by converting "semantically null" strings into actual null values.
 *
 * @param value - The slot value to check (string, null, or undefined).
 * @param options - Configuration options.
 * @param options.allowNone - If true, 'none' is considered a valid value and NOT normalized to null.
 * @returns The original string if valid, or null if it matches a null-equivalent indicator.
 *
 * Recognized null-equivalent strings (case-insensitive):
 * - 'null'
 * - 'n/a'
 * - 'none' (unless allowNone is true)
 * - 'unknown'
 * - 'not mentioned'
 * - 'unsure'
 * - Empty string or whitespace only
 */
export function normalizeSlot(
  value: string | null | undefined,
  options: { allowNone?: boolean } = {},
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const lower = trimmed.toLowerCase();
  const nullIndicators = ['null', 'n/a', 'unknown', 'not mentioned', 'unsure'];
  
  if (!options.allowNone) {
    nullIndicators.push('none');
  }

  if (nullIndicators.includes(lower)) {
    return null;
  }

  return value;
}

/**
 * Calculates the triage readiness score based on extracted clinical data.
 * This is a deterministic algorithm that should be used after slot extraction.
 */
export function calculateTriageScore(slots: {
  age?: string | null;
  duration?: string | null;
  severity?: string | null;
  progression?: string | null;
  red_flags_resolved?: boolean;
  uncertainty_accepted?: boolean;
  clinical_friction_detected?: boolean;
  ambiguity_detected?: boolean;
  internal_inconsistency_detected?: boolean;
  symptom_category?: 'simple' | 'complex' | 'critical';
  turn_count?: number;
  denial_confidence?: 'high' | 'medium' | 'low';
}): number {
  let score = 1.0;

  // Core slots penalty
  let coreSlots: Array<'age' | 'duration' | 'severity' | 'progression'> = [
    'age',
    'duration',
    'severity',
    'progression',
  ];

  // Adaptive Strategy: Waive penalties for simple, low-risk cases
  if (slots.symptom_category === 'simple') {
    const severityVal = normalizeSlot(slots.severity)?.toLowerCase() || '';
    // Low risk definition: Explicit 'mild' or numeric 1-3/10
    const isLowRisk =
      severityVal.includes('mild') || /\b[1-3]\s*(\/|out of)\s*10\b/.test(severityVal);

    if (isLowRisk) {
      // For simple, low-risk cases, we don't strictly require Age or Progression
      // if we already have Duration and Severity (implied by isLowRisk check)
      coreSlots = ['duration', 'severity'];
    }
  }

  const nullCount = coreSlots.filter((s) => !normalizeSlot(slots[s])).length;
  if (nullCount > 0) {
    if (slots.uncertainty_accepted) {
      score -= 0.05;
      score -= nullCount * 0.05;
    } else {
      score = 0.8;
      score -= nullCount * 0.1;
    }
  }

  // Safety floor (non-negotiable)
  if (!slots.red_flags_resolved) {
    score = Math.min(score, 0.4);
  }

  // Friction hard cap (non-overridable)
  if (slots.clinical_friction_detected) {
    score = Math.min(score, 0.6);
  }

  // Ambiguity cap
  if (slots.ambiguity_detected) {
    score = Math.min(score, 0.7);
  }

  // Complex category penalty
  if (slots.symptom_category === 'complex' && (slots.turn_count || 0) < 7) {
    score = Math.min(score, 0.85);
  }

  // Internal inconsistency penalty
  if (slots.internal_inconsistency_detected) {
    score -= 0.4;
  }

  // Red flag ambiguity penalty
  if (slots.denial_confidence === 'low') {
    score -= 0.2;
  }

  return Math.max(0, Math.min(1.0, score));
}

/**
 * Ensures red flags question appears in the first 3 positions (0, 1, or 2).
 * Moves it to position 1 if found later in the array.
 * Injects a default red flags question if missing to prevent safety violations.
 */
export function prioritizeQuestions(questions: AssessmentQuestion[]): AssessmentQuestion[] {
  const redFlagIndex = questions.findIndex((q) => q.id === 'red_flags');

  // Create a shallow copy to avoid mutating the input array
  const sortedQuestions = [...questions];

  if (redFlagIndex === -1) {
    console.warn('[Safety Fallback] Red flags question missing from AI response. Injecting default.');
    // Inject at index 1 (after basics) or 0 if empty/single
    const insertIndex = sortedQuestions.length > 0 ? 1 : 0;
    sortedQuestions.splice(insertIndex, 0, DEFAULT_RED_FLAG_QUESTION);
    return sortedQuestions;
  }

  if (redFlagIndex > 2) {
    // Move red flags to position 1 (after basics, before others)
    const [redFlagQ] = sortedQuestions.splice(redFlagIndex, 1);
    sortedQuestions.splice(1, 0, redFlagQ);
  }

  return sortedQuestions;
}

/**
 * Parses and validates LLM response, handling common formatting issues.
 */
export function parseAndValidateLLMResponse<T = any>(rawResponse: string): T {
  try {
    // Strip markdown if present
    const cleaned = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed as T;
  } catch (error) {
    // Fallback: extract JSON from text
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        throw new Error('Failed to parse extracted JSON from LLM response');
      }
    }
    throw new Error(
      `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
