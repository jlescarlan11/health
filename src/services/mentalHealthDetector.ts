// Keywords derived from medical-knowledge.json
const CRISIS_KEYWORDS = [
  "suicide",
  "kill myself",
  "hurt myself",
  "self-harm",
  "hopelessness",
  "want to die",
  "end my life",
  "hearing voices",
  "hallucinations",
  "severe depression",
  "uncontrollable anger",
  "better off dead",
  "no reason to live",
  "panic attack"
];

export interface MentalHealthResource {
  name: string;
  number: string;
  description: string;
}

export const MENTAL_HEALTH_RESOURCES: MentalHealthResource[] = [
  {
    name: "NCMH Crisis Hotline",
    number: "1553",
    description: "National Center for Mental Health (24/7)"
  },
  {
    name: "Hopeline Philippines",
    number: "2919",
    description: "24/7 Suicide Prevention Hotline"
  },
  {
    name: "Naga City Mental Health Unit",
    number: "(054) 473-1234", // Placeholder - would need actual local number
    description: "Local support services"
  }
];

interface MentalHealthDetectionResult {
  isCrisis: boolean;
  matchedKeywords: string[];
  message?: string;
  resources?: MentalHealthResource[];
}

export const detectMentalHealthCrisis = (text: string): MentalHealthDetectionResult => {
  const normalizedText = text.toLowerCase().trim();
  const matchedKeywords: string[] = [];

  for (const keyword of CRISIS_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }

  const isCrisis = matchedKeywords.length > 0;

  if (isCrisis) {
    console.log(`[MentalHealthDetector] Crisis keywords detected: ${matchedKeywords.join(", ")}`);
    return {
      isCrisis: true,
      matchedKeywords,
      message: "You are not alone. Help is available. If you are in immediate danger, please go to the nearest hospital or call emergency services immediately.",
      resources: MENTAL_HEALTH_RESOURCES
    };
  }

  return {
    isCrisis: false,
    matchedKeywords: []
  };
};
