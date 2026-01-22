import { AssessmentQuestion } from '../types/triage';

/**
 * Default Red Flag Question for Safety Fallback.
 * This is injected if the AI fails to generate a mandatory red_flags question.
 * It covers the "Big 3" immediate life threats: Respiratory, Cardiac, and Hemorrhagic/Trauma.
 */
export const DEFAULT_RED_FLAG_QUESTION: AssessmentQuestion = {
  id: 'red_flags',
  text: 'To ensure your safety, are you experiencing any difficulty breathing, severe chest pain, distinct confusion, or uncontrolled bleeding?',
  type: 'multi-select',
  tier: 1,
  is_red_flag: true,
  options: [
    {
      category: 'Critical Signs',
      items: [
        'Difficulty breathing',
        'Severe chest pain',
        'Confusion / Disorientation',
        'Uncontrolled bleeding',
      ],
    },
  ],
};

/**
 * Safety threshold for offline self-care recommendations.
 * A score <= 3 indicates minimal risk with no clinical red flags detected,
 * or symptoms that have been de-escalated by viral indicators (cough/cold).
 */
export const OFFLINE_SELF_CARE_THRESHOLD = 3;

/**
 * A comprehensive list of safety-critical clinical keywords used for deterministic
 * symptom detection and emergency filtering.
 *
 * Usage pattern: Case-insensitive substring matching against user input.
 * These terms trigger immediate emergency escalation or high-priority triage logic.
 */
export const SAFETY_CRITICAL_KEYWORDS: readonly string[] = [
  // Cardiac
  'chest pain',
  'heart attack',
  'chest pressure',

  // Respiratory
  'shortness of breath',
  'breathing difficulty',
  'difficulty breathing',
  'choking',

  // Neurological
  'stroke',
  'sudden weakness',
  'confusion',
  'seizure',
  'vision loss',
  'severe headache',

  // Trauma & Consciousness
  'severe bleeding',
  'unconscious',
  'unresponsive',
  'passing out',
  'fainting',

  // Allergic Reactions
  'allergic reaction',
  'swelling throat',
  'anaphylaxis',
] as const;
