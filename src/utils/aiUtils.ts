/**
 * specific utility functions for AI processing
 */

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
  clinical_friction_detected?: boolean;
  ambiguity_detected?: boolean;
  internal_inconsistency_detected?: boolean;
  symptom_category?: 'simple' | 'complex' | 'critical';
  turn_count?: number;
  denial_confidence?: 'high' | 'medium' | 'low';
}): number {
  let score = 1.0;

  // Core slots penalty
  const coreSlots: Array<'age' | 'duration' | 'severity' | 'progression'> = ['age', 'duration', 'severity', 'progression'];
  const nullCount = coreSlots.filter(s => !slots[s] || (typeof slots[s] === 'string' && slots[s]!.toLowerCase() === 'null')).length;
  if (nullCount > 0) {
    score = 0.80;
    score -= (nullCount * 0.10);
  }

  // Safety floor (non-negotiable)
  if (!slots.red_flags_resolved) {
    score = Math.min(score, 0.40);
  }

  // Friction hard cap (non-overridable)
  if (slots.clinical_friction_detected) {
    score = Math.min(score, 0.60);
  }

  // Ambiguity cap
  if (slots.ambiguity_detected) {
    score = Math.min(score, 0.70);
  }

  // Complex category penalty
  if (slots.symptom_category === 'complex' && (slots.turn_count || 0) < 7) {
    score = Math.min(score, 0.85);
  }

  // Internal inconsistency penalty
  if (slots.internal_inconsistency_detected) {
    score -= 0.40;
  }

  // Red flag ambiguity penalty
  if (slots.denial_confidence === 'low') {
    score -= 0.20;
  }

  return Math.max(0, Math.min(1.0, score));
}

/**
 * Ensures red flags question appears in the first 3 positions (0, 1, or 2).
 * Moves it to position 1 if found later in the array.
 */
export function prioritizeQuestions<T extends { id: string }>(questions: T[]): T[] {
  const redFlagIndex = questions.findIndex(q => q.id === 'red_flags');

  if (redFlagIndex === -1) {
    // If missing, we can't prioritize it. In strict mode this might be an error,
    // but here we just return the list as is (or throw if required by safety rules).
    // The proposal says: "throw new Error('Red flags question missing - safety violation');"
    throw new Error('Red flags question missing - safety violation');
  }

  // Create a shallow copy to avoid mutating the input array
  const sortedQuestions = [...questions];

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
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
