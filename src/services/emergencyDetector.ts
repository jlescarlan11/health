import { AssessmentResponse } from '../api/geminiClient';

// Keywords derived from medical-knowledge.json
// Scores: 0-10. >7 is EMERGENCY.
const EMERGENCY_KEYWORDS: Record<string, number> = {
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

  // Moderate to High (Score 8-9 - Likely Emergency)
  'broken bone': 8,
  'deep wound': 8,
  'vomiting blood': 8,
  'black stool': 8,
  'vision loss': 8,
  'sudden blindness': 8,
  'stiff neck': 8,
  confusion: 8,
  'high fever': 8, // Especially if > 40C or with other symptoms
  'severe dehydration': 8,
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
 * Analyzes input text for emergency keywords.
 * Normalizes text and calculates a severity score (0-10).
 * If score > 7, it's an EMERGENCY.
 */
export const detectEmergency = (text: string): EmergencyDetectionResult => {
  const segments = tokenizeSentences(text.toLowerCase());
  let maxScore = 0;
  const matchedKeywords: string[] = [];

  for (const segment of segments) {
    for (const [keyword, severity] of Object.entries(EMERGENCY_KEYWORDS)) {
      // Check for exact keyword or phrase match within the segment
      if (segment.includes(keyword)) {
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
      relevant_services: ['Emergency Room', 'Trauma Center', 'Ambulance'],
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
