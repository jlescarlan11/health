import { geminiClient, AssessmentResponse } from '../../api/geminiClient';
import { detectEmergency } from '../../services/emergencyDetector';
import { detectMentalHealthCrisis } from '../../services/mentalHealthDetector';

interface TriageResult {
  type: 'EMERGENCY' | 'CRISIS' | 'ASSESSMENT';
  data: AssessmentResponse | any;
}

export const performTriage = async (
  symptoms: string,
  age: string | number,
  severity: number,
): Promise<TriageResult> => {
  // 1. Check for Immediate Emergency
  const emergencyCheck = detectEmergency(symptoms);
  if (emergencyCheck.isEmergency && emergencyCheck.overrideResponse) {
    return {
      type: 'EMERGENCY',
      data: emergencyCheck.overrideResponse,
    };
  }

  // 2. Check for Mental Health Crisis
  const mentalHealthCheck = detectMentalHealthCrisis(symptoms);
  if (mentalHealthCheck.isCrisis) {
    return {
      type: 'CRISIS',
      data: mentalHealthCheck,
    };
  }

  // 3. AI Assessment
  try {
    const fullSymptoms = `Symptoms: ${symptoms}. Age: ${age}. Severity: ${severity}/10.`;
    const assessment = await geminiClient.assessSymptoms(fullSymptoms, []);
    return {
      type: 'ASSESSMENT',
      data: assessment,
    };
  } catch (error) {
    console.error('Triage Error:', error);
    // Fallback if AI fails but no specific emergency detected
    // In a real app, we might check for "offline mode" here or return a generic "Go to Health Center" advice.
    throw error;
  }
};
