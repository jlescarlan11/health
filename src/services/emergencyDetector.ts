import { AssessmentResponse } from "../api/geminiClient";

// Keywords derived from medical-knowledge.json and standard triage protocols
const EMERGENCY_KEYWORDS: Record<string, number> = {
  // High severity (Score 10 - Immediate Emergency)
  "chest pain": 10,
  "difficulty breathing": 10,
  "shortness of breath": 10,
  "severe bleeding": 10,
  "unconscious": 10,
  "fainted": 10,
  "seizure": 10,
  "stroke": 10,
  "slurred speech": 10,
  "sudden weakness": 10,
  "severe head injury": 10,
  "coughing blood": 10,
  "severe burns": 10,
  "poisoning": 10,
  "overdose": 10,
  "anaphylaxis": 10,
  "severe allergic reaction": 10,
  "blue lips": 10,
  "crushing pain": 10,
  "heart attack": 10,
  "not breathing": 10,
  "gasping": 10,
  "choking": 10,

  // Moderate to High (Score 8 - Likely Emergency)
  "broken bone": 8,
  "deep wound": 8,
  "severe pain": 8,
  "vomiting blood": 8,
  "black stool": 8,
  "vision loss": 8,
  "sudden blind": 8,
};

interface EmergencyDetectionResult {
  isEmergency: boolean;
  score: number; // 0-10
  matchedKeywords: string[];
  overrideResponse?: AssessmentResponse;
}

export const detectEmergency = (text: string): EmergencyDetectionResult => {
  const normalizedText = text.toLowerCase().trim();
  let maxScore = 0;
  const matchedKeywords: string[] = [];

  for (const [keyword, severity] of Object.entries(EMERGENCY_KEYWORDS)) {
    if (normalizedText.includes(keyword)) {
      matchedKeywords.push(keyword);
      if (severity > maxScore) {
        maxScore = severity;
      }
    }
  }

  // Auditing / Logging
  if (matchedKeywords.length > 0) {
    console.log(`[EmergencyDetector] Detected: ${matchedKeywords.join(", ")} (Score: ${maxScore})`);
  }

  const isEmergency = maxScore > 7;

  let overrideResponse: AssessmentResponse | undefined;

  if (isEmergency) {
    overrideResponse = {
      recommended_level: "Emergency",
      reasoning: "CRITICAL: Potential life-threatening condition detected based on keywords (" + matchedKeywords.join(", ") + "). Immediate medical attention is required.",
      red_flags: matchedKeywords,
      nearest_facility_type: "Emergency Room / Hospital"
    };
  }

  return {
    isEmergency,
    score: maxScore,
    matchedKeywords,
    overrideResponse
  };
};
