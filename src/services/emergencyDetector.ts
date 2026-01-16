import { AssessmentResponse } from '../api/geminiClient';
import { getLevenshteinDistance } from '../utils';

// Keywords derived from medical-knowledge.json
// Scores: 0-10. >7 is EMERGENCY.
const EMERGENCY_KEYWORDS: Record<string, number> = {
  // ... (keep all existing keywords)
  // High severity (Score 10 - Immediate Emergency)
  'chest pain': 10,
  'difficulty breathing': 10,
  'shortness of breath': 10,
  'severe bleeding': 10,
  unconscious: 10,
  fainted: 10,
  seizure: 10,
  stroke: 10,
  'slurred speech': 10,
  'sudden weakness': 10,
  'severe head injury': 10,
  'coughing blood': 10,
  'severe burns': 10,
  poisoning: 10,
  overdose: 10,
  anaphylaxis: 10,
  'severe allergic reaction': 10,
  'blue lips': 10,
  'crushing pain': 10,
  'heart attack': 10,
  'not breathing': 10,
  gasping: 10,
  choking: 10,
  'severe abdominal pain': 10,
  'suicide attempt': 10,
  dying: 10,
  'feel like dying': 10,
  'feeling like dying': 10,
  'facial drooping': 10,
  'arm weakness': 10,
  'cannot speak': 10,
  'chest tightness': 10,
  'active labor': 10,
  'water broke': 10,
  'electric shock': 10,
  drowning: 10,
  hingalo: 10, // Bicolano: gasping for breath / near death

  // Moderate to High (Score 8-9 - Likely Emergency)
  'broken bone': 8,
  'deep wound': 8,
  'vomiting blood': 8,
  'black stool': 8,
  'blood in stool': 8,
  'vision loss': 8,
  'sudden blindness': 8,
  'stiff neck': 8,
  confusion: 8,
  'high fever': 8, // Especially if > 40C or with other symptoms
  'severe dehydration': 8,
  jaundice: 8,
  'persistent vomiting': 8,
  kulog: 8, // Bicolano: pain
  paga: 8, // Bicolano: swelling
  hapdi: 8, // Bicolano: stinging or burning sensation
};

interface EmergencyDetectionResult {
  isEmergency: boolean;
  score: number; // 0-10
  matchedKeywords: string[];
  overrideResponse?: AssessmentResponse;
}

/**
 * Splits input text into separate segments (sentences/clauses) based on punctuation.
 * Handles periods, commas, question marks, and exclamation points.
 */
export const tokenizeSentences = (text: string): string[] => {
  if (!text) return [];

  return text
    .split(/[.,?!]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

/**
 * Checks if a keyword within a segment is negated.
 * Scans for negation keywords ("no", "not", "never", "none", etc.) within a 3-word proximity window
 * around the identified red-flag symptom keyword.
 */
export const isNegated = (segment: string, keyword: string): boolean => {
  const NEGATION_KEYWORDS = [
    'no',
    'not',
    'never',
    'none',
    'dont',
    'doesnt',
    'didnt',
    'isnt',
    'arent',
    'without',
    'denies',
    'negative',
  ];
  const PROXIMITY_WINDOW = 3;

  // Clean and tokenize the segment
  const words = segment
    .toLowerCase()
    .replace(/['’]/g, '') // Remove apostrophes to handle contractions (e.g., don't -> dont)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const keywordWords = keyword.toLowerCase().split(/\s+/);

  if (keywordWords.length === 0 || words.length === 0) return false;

  let foundMatch = false;
  let anyNonNegated = false;

  for (let i = 0; i <= words.length - keywordWords.length; i++) {
    // Check for keyword match at current position
    let match = true;
    for (let j = 0; j < keywordWords.length; j++) {
      if (words[i + j] !== keywordWords[j]) {
        match = false;
        break;
      }
    }

    if (match) {
      foundMatch = true;

      // Check for negation keywords in proximity
      const start = Math.max(0, i - PROXIMITY_WINDOW);
      const end = Math.min(words.length - 1, i + keywordWords.length + PROXIMITY_WINDOW - 1);

      let isThisOccurrenceNegated = false;
      for (let k = start; k <= end; k++) {
        // Skip the words that are part of the keyword itself
        if (k >= i && k < i + keywordWords.length) continue;

        if (NEGATION_KEYWORDS.includes(words[k])) {
          isThisOccurrenceNegated = true;
          break;
        }
      }

      if (!isThisOccurrenceNegated) {
        anyNonNegated = true;
      }
    }
  }

  // A symptom is considered negated if we found matches and ALL of them are negated.
  // If there is at least one non-negated match, we consider the symptom present.
  return foundMatch && !anyNonNegated;
};

/**
 * Checks if two strings are a fuzzy match based on Levenshtein distance.
 * The threshold scales with string length.
 */
const isFuzzyMatch = (s1: string, s2: string): boolean => {
  const distance = getLevenshteinDistance(s1, s2);
  const minLength = Math.min(s1.length, s2.length);

  // Thresholds:
  // Short strings (<= 4): 0 distance (exact match)
  // Medium strings (5-8): 1 distance
  // Long strings (> 8): 2 distance
  if (minLength <= 4) return distance === 0;
  if (minLength <= 8) return distance <= 1;
  return distance <= 2;
};

/**
 * Analyzes input text for emergency keywords.
 * Normalizes text and calculates a severity score (0-10).
 * If score > 7, it's an EMERGENCY.
 */
export const detectEmergency = (text: string): EmergencyDetectionResult => {
  const normalizedText = text.toLowerCase();
  const segments = tokenizeSentences(normalizedText);
  let maxScore = 0;
  const matchedKeywords: string[] = [];

  for (const segment of segments) {
    // Tokenize segment into words for per-word fuzzy matching
    const segmentWords = segment.split(/\s+/).filter((w) => w.length > 0);

    for (const [keyword, severity] of Object.entries(EMERGENCY_KEYWORDS)) {
      let isMatch = false;

      // 1. Exact match in segment
      if (segment.includes(keyword)) {
        isMatch = true;
      }
      // 2. Fuzzy match against entire segment (for short segments like "chest pain")
      else if (isFuzzyMatch(segment, keyword)) {
        isMatch = true;
      }
      // 3. Per-word fuzzy match (for single-word keywords like "unconscious")
      else if (!keyword.includes(' ')) {
        isMatch = segmentWords.some((word) => isFuzzyMatch(word, keyword));
      }
      // 4. Sliding window fuzzy match for multi-word keywords
      else {
        const keywordWords = keyword.split(/\s+/);
        if (segmentWords.length >= keywordWords.length) {
          for (let i = 0; i <= segmentWords.length - keywordWords.length; i++) {
            const window = segmentWords.slice(i, i + keywordWords.length).join(' ');
            if (isFuzzyMatch(window, keyword)) {
              isMatch = true;
              break;
            }
          }
        }
      }

      if (isMatch) {
        // Exclude any symptom matches that have been identified as negated
        // Note: isNegated currently uses exact word matching, which is fine for safety
        if (isNegated(segment, keyword)) {
          continue;
        }

        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
        if (severity > maxScore) {
          maxScore = severity;
        }
      }
    }
  }

  // Auditing / Logging
  if (matchedKeywords.length > 0) {
    console.log(`[EmergencyDetector] Detected: ${matchedKeywords.join(', ')} (Score: ${maxScore})`);
  }

  const isEmergency = maxScore > 7;

  let overrideResponse: AssessmentResponse | undefined;

  if (isEmergency) {
    overrideResponse = {
      recommended_level: 'emergency',
      assessment_summary: `CRITICAL: Potential life-threatening condition detected based on keywords (${matchedKeywords.join(', ')}). Immediate medical attention is required.`,
      condition_summary: `CRITICAL: Potential life-threatening condition detected based on keywords (${matchedKeywords.join(', ')}).`,
      recommended_action: 'Go to the nearest emergency room immediately.',
      key_concerns: matchedKeywords.map((k) => `Urgent symptom: ${k}`),
      critical_warnings: ['Immediate medical attention required', 'Do not delay care'],
      relevant_services: ['Emergency', 'Surgery'],
      red_flags: matchedKeywords,
      follow_up_questions: [],
    };
  }

  return {
    isEmergency,
    score: maxScore,
    matchedKeywords,
    overrideResponse,
  };
};
