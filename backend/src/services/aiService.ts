import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma';
import { Facility } from '../../generated/prisma/client';
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
  recommended_facility_ids: string[];
}

export const navigate = async (data: AIRequest): Promise<AIResponse> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Fetch all facilities to provide as context
  const allFacilities = await prisma.facility.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      services: true,
      specialized_services: true,
      is_24_7: true,
      address: true,
    },
  });

  const facilityContext = allFacilities
    .map(
      (f) =>
        `- ID: ${f.id}, Name: ${f.name}, Type: ${f.type}, Services: ${f.services.join(', ')}, Specialized: ${f.specialized_services.join(', ')}, 24/7: ${f.is_24_7}, Address: ${f.address}`,
    )
    .join('\n');

  const prompt = `
    You are a medical triage assistant for Naga City.
    
    User Profile:
    - Symptoms: ${data.symptoms}
    - Age: ${data.age || 'Not specified'}
    - Severity: ${data.severity || 'Not specified'}
    - Medical History: ${data.medical_history || 'None'}

    Available Healthcare Facilities in Naga City:
    ${facilityContext}

    VALID_SERVICES = [
      ${VALID_SERVICES.map(s => `"${s}"`).join(', ')}
    ]

    Task:
    1. Analyze the symptoms and severity to determine the appropriate level of care (Self-Care, Health Center, Hospital, or Emergency Room).
    2. Recommend specific facilities from the provided list that are best suited to handle the case based on their type and services.
    3. Include 2-3 "relevant_services" in your reasoning or as part of the recommendation, choosing ONLY from the VALID_SERVICES list above.
    4. Provide a clear reasoning for your recommendation.

    Output Schema (JSON only):
    {
      "recommendation": "One of: Self-Care, Health Center, Hospital, Emergency",
      "triage_readiness_score": 0.0 to 1.0,
      "ambiguity_detected": boolean,
      "reasoning": "Brief explanation...",
      "relevant_services": ["Service 1", "Service 2"],
      "recommended_facility_ids": ["id1", "id2"]
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
    parsedResponse.triage_readiness_score !== undefined && parsedResponse.triage_readiness_score < 0.80;
  const isAmbiguous = parsedResponse.ambiguity_detected === true;

  if ((isLowReadiness || isAmbiguous) && currentIdx !== -1 && currentIdx < 3) {
    const nextLevel = levels[currentIdx + 1];
    parsedResponse.recommendation = nextLevel;
    parsedResponse.reasoning += ` (Note: Recommendation upgraded to ${nextLevel} due to uncertainty/ambiguity for safety.)`;

    // Update recommended facilities based on new level
    let targetTypeKeyword = '';
    if (nextLevel === 'Health Center')
      targetTypeKeyword = 'Center'; // Matches "Barangay Health Center"
    else if (nextLevel === 'Hospital' || nextLevel === 'Emergency') targetTypeKeyword = 'Hospital';

    if (targetTypeKeyword) {
      const newFacilities = allFacilities
        .filter((f) => f.type.includes(targetTypeKeyword))
        .slice(0, 3); // Take top 3
      parsedResponse.recommended_facility_ids = newFacilities.map((f) => f.id);
    } else {
      // If Self-Care (unlikely to upgrade TO self-care), clear facilities
      parsedResponse.recommended_facility_ids = [];
    }
  }
  // -----------------------------------

  // Retrieve full facility details for the recommended IDs
  const recommendedFacilities = await prisma.facility.findMany({
    where: {
      id: {
        in: parsedResponse.recommended_facility_ids || [],
      },
    },
  });

  return {
    recommendation: parsedResponse.recommendation,
    reasoning: parsedResponse.reasoning,
    facilities: recommendedFacilities,
  };
};
