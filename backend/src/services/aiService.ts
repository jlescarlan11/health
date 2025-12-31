import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma';

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
  facilities: any[];
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
      address: true,
    },
  });

  const facilityContext = allFacilities.map(f => 
    `- ID: ${f.id}, Name: ${f.name}, Type: ${f.type}, Services: ${f.services.join(', ')}, Address: ${f.address}`
  ).join('\n');

  const prompt = `
    You are a medical triage assistant for Naga City.
    
    User Profile:
    - Symptoms: ${data.symptoms}
    - Age: ${data.age || 'Not specified'}
    - Severity: ${data.severity || 'Not specified'}
    - Medical History: ${data.medical_history || 'None'}

    Available Healthcare Facilities in Naga City:
    ${facilityContext}

    Task:
    1. Analyze the symptoms and severity to determine the appropriate level of care (Self-Care, Health Center, Hospital, or Emergency Room).
    2. Recommend specific facilities from the provided list that are best suited to handle the case based on their type and services.
    3. Provide a clear reasoning for your recommendation.

    Output Schema (JSON only):
    {
      "recommendation": "One of: Self-Care, Health Center, Hospital, Emergency",
      "reasoning": "Brief explanation...",
      "recommended_facility_ids": ["id1", "id2"]
    }
    
    Return ONLY valid JSON.
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Clean the response text (remove markdown code blocks if present)
  const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(cleanedText);
  } catch (e) {
    console.error('Failed to parse Gemini response:', cleanedText);
    throw new Error('AI service unavailable');
  }

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
