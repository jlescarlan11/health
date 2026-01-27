import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma';
import { Facility, Prisma } from '../../generated/prisma';
import { VALID_SERVICES } from '../utils/constants';

const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

interface AIRequest {
  symptoms: string;
  age?: string;
  severity?: string;
  medical_history?: string;
}

interface AIResponse {
  recommendation: string;
  reasoning: string;
  facilities: Facility[];
}

interface GeminiParsedResponse {
  recommendation: string;
  triage_readiness_score: number;
  ambiguity_detected: boolean;
  reasoning: string;
  relevant_services: string[];
  facility_type_constraints?: string[];
}

export const navigate = async (data: AIRequest): Promise<AIResponse> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
    You are a medical triage assistant for Naga City.
    
    User Profile:
    - Symptoms: ${data.symptoms}
    - Age: ${data.age || 'Not specified'}
    - Severity: ${data.severity || 'Not specified'}
    - Medical History: ${data.medical_history || 'None'}

    Task:
    1. Analyze the symptoms and severity to determine the appropriate level of care (Self-Care, Health Center, Hospital, or Emergency).
    2. Provide 2-3 "relevant_services" that align with the high-level facility categories such as General, Trauma, Pediatrics, Mental Health, Maternal Care, or Diagnostics (Radiology/Lab). Do not repeat the entire VALID_SERVICES list; the backend will validate your selections.
    3. Optionally include "facility_type_constraints" if the case needs a specific facility type (for example, "Hospital with trauma services").
    4. Provide a clear reasoning for your recommendation.

    Output Schema (JSON only):
    {
      "recommendation": "One of: Self-Care, Health Center, Hospital, Emergency",
      "triage_readiness_score": 0.0 to 1.0,
      "ambiguity_detected": boolean,
      "reasoning": "Brief explanation...",
      "relevant_services": ["Service 1", "Service 2"],
      "facility_type_constraints": ["Hospital with trauma services"]
    }
    
    Return ONLY valid JSON.
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Clean the response text (remove markdown code blocks if present)
  const cleanedText = responseText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  let parsedResponse: GeminiParsedResponse;
  try {
    parsedResponse = JSON.parse(cleanedText);

    // Normalize "Emergency Room" to "Emergency" for internal consistency
    if (parsedResponse.recommendation === 'Emergency Room') {
      parsedResponse.recommendation = 'Emergency';
    }
  } catch {
    console.error('Failed to parse Gemini response:', cleanedText);
    throw new Error('AI service unavailable');
  }

  if (parsedResponse.relevant_services) {
    parsedResponse.relevant_services = parsedResponse.relevant_services.filter((s: string) =>
      VALID_SERVICES.includes(s),
    );
  }

  // --- Conservative Fallback Logic ---
  const levels = ['Self-Care', 'Health Center', 'Hospital', 'Emergency'];
  const currentIdx = levels.indexOf(parsedResponse.recommendation);

  const isLowReadiness =
    parsedResponse.triage_readiness_score !== undefined &&
    parsedResponse.triage_readiness_score < 0.8;
  const isAmbiguous = parsedResponse.ambiguity_detected === true;

  if ((isLowReadiness || isAmbiguous) && currentIdx !== -1 && currentIdx < 3) {
    const nextLevel = levels[currentIdx + 1];
    parsedResponse.recommendation = nextLevel;
    parsedResponse.reasoning += ` (Note: Recommendation upgraded to ${nextLevel} due to uncertainty/ambiguity for safety.)`;
  }
  // -----------------------------------

  const recommendedFacilities = await selectFacilitiesForRecommendation({
    recommendation: parsedResponse.recommendation,
    relevantServices: parsedResponse.relevant_services || [],
    facilityTypeConstraints: parsedResponse.facility_type_constraints,
  });

  return {
    recommendation: parsedResponse.recommendation,
    reasoning: parsedResponse.reasoning,
    facilities: recommendedFacilities,
  };
};

const FACILITY_LEVEL_KEYWORDS: Record<string, string[]> = {
  'Health Center': ['Health Center', 'Center'],
  Hospital: ['Hospital'],
  Emergency: ['Emergency', 'Hospital'],
  'Emergency Room': ['Emergency', 'Hospital'],
};

const resolveFacilityTypeKeywords = (
  recommendation: string,
  facilityTypeConstraints?: string[],
): string[] => {
  const normalizedLevel = recommendation?.trim();
  const baseKeywords = FACILITY_LEVEL_KEYWORDS[normalizedLevel] ?? [];
  const constraintKeywords =
    facilityTypeConstraints?.map((constraint) => constraint.trim()).filter(Boolean) ?? [];

  const allKeywords = [...constraintKeywords, ...baseKeywords].filter(Boolean);
  return Array.from(new Set(allKeywords));
};

const selectFacilitiesForRecommendation = async ({
  recommendation,
  relevantServices,
  facilityTypeConstraints,
}: {
  recommendation: string;
  relevantServices?: string[];
  facilityTypeConstraints?: string[];
}): Promise<Facility[]> => {
  const typeKeywords = resolveFacilityTypeKeywords(recommendation, facilityTypeConstraints);

  if (typeKeywords.length === 0) {
    return [];
  }

  const filters: Prisma.FacilityWhereInput[] = [];

  if (typeKeywords.length > 0) {
    filters.push({
      OR: typeKeywords.map((keyword) => ({
        type: { contains: keyword, mode: 'insensitive' },
      })),
    });
  }

  if (relevantServices && relevantServices.length > 0) {
    filters.push({
      OR: [
        { services: { hasSome: relevantServices } },
        { specialized_services: { hasSome: relevantServices } },
      ],
    });
  }

  const where: Prisma.FacilityWhereInput = filters.length > 0 ? { AND: filters } : {};

  return prisma.facility.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 3,
  });
};
