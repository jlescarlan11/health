import { Request, Response } from 'express';
import { geminiService } from '../services/geminiService';
import { TriageArbiter, TriageSessionContext } from '../services/triage/TriageArbiter';
import { 
  TriageAssessmentRequest, 
  TriageAssessmentResponse, 
  TriageSignal
} from '../types/triage';
import { checkCriticalSystemKeywords } from '../utils/aiUtils';
import { selectFacilitiesForRecommendation } from '../services/aiService';
import { TriageAssessmentResponseSchema } from '../schemas/triageSchema';
import { ZodError } from 'zod';

export const assessV1 = async (req: Request, res: Response) => {
  try {
    const body = req.body as TriageAssessmentRequest;
    const {
      history,
      profile: currentProfile,
      currentTurn,
      totalPlannedQuestions,
      remainingQuestions,
      previousProfile,
      clarificationAttempts = 0,
      patientContext,
      initialSymptom,
      sessionContext,
    } = body;

    const safeRemainingQuestions = Array.isArray(remainingQuestions) ? remainingQuestions : [];
    const triageSessionContext: TriageSessionContext | undefined = sessionContext ?? undefined;

    if (!history || !initialSymptom) {
      return res.status(400).json({ error: 'History and initialSymptom are required' });
    }

    // 1. Extract/Update Clinical Profile
    const extractedProfile = await geminiService.extractClinicalProfile(history, {
      previousProfile,
      currentProfileSummary: currentProfile?.summary
    });

    // 2. Emergency Check
    const fullText = history.map(h => h.text).join(' ');
    const emergencyCategory = checkCriticalSystemKeywords(fullText);
    const isEmergency = emergencyCategory === 'critical';

    let responseData: any;

    if (isEmergency) {
      // Force termination and get final recommendation
      const finalAssessment = await geminiService.assessSymptoms(
        initialSymptom,
        history,
        patientContext
      );

      // Fetch facilities for the recommended level
      const facilities = await selectFacilitiesForRecommendation({
        recommendation: finalAssessment.recommended_level,
        relevantServices: finalAssessment.relevant_services || []
      });

      // Fetch narratives for the recommended level
      const narratives = await geminiService.generateRecommendationNarratives({
        initialSymptom,
        profileSummary: extractedProfile.summary,
        answers: history.filter(h => h.role === 'user').map(h => h.text).join('\n'),
        selectedOptions: '',
        recommendedLevel: finalAssessment.recommended_level,
        keyConcerns: finalAssessment.key_concerns || [],
        relevantServices: finalAssessment.relevant_services || [],
        redFlags: finalAssessment.red_flags || [],
        clinicalSoap: finalAssessment.clinical_soap
      });

      responseData = {
        version: 'v1',
        controlSignal: 'TERMINATE',
        aiResponse: {
          text: narratives.recommendationNarrative || finalAssessment.user_advice || 'Emergency detected. Please seek immediate medical attention.',
          assessment: {
            ...finalAssessment,
            facilities,
            narratives
          }
        },
        updatedProfile: extractedProfile,
        metadata: {
          reason: 'EMERGENCY_DETECTED',
          emergency_detected: true
        }
      };
    } else {
      // 3. Evaluate Triage State using TriageArbiter
        const arbiterResult = TriageArbiter.evaluateAssessmentState(
          history,
          extractedProfile,
          currentTurn,
          totalPlannedQuestions,
          safeRemainingQuestions,
          previousProfile,
          clarificationAttempts,
          initialSymptom,
          triageSessionContext,
        );
            // 4. Orchestrate Response based on Arbiter Signal
      if (arbiterResult.signal === 'TERMINATE') {
        // Generate final recommendation
        const finalAssessment = await geminiService.assessSymptoms(
          initialSymptom,
          history,
          patientContext
        );

        // Fetch facilities for the recommended level
        const facilities = await selectFacilitiesForRecommendation({
          recommendation: finalAssessment.recommended_level,
          relevantServices: finalAssessment.relevant_services || []
        });

        // Fetch narratives for the recommended level
        const narratives = await geminiService.generateRecommendationNarratives({
          initialSymptom,
          profileSummary: extractedProfile.summary,
          answers: history.filter(h => h.role === 'user').map(h => h.text).join('\n'),
          selectedOptions: '',
          recommendedLevel: finalAssessment.recommended_level,
          keyConcerns: finalAssessment.key_concerns || [],
          relevantServices: finalAssessment.relevant_services || [],
          redFlags: finalAssessment.red_flags || [],
          clinicalSoap: finalAssessment.clinical_soap
        });

        responseData = {
          version: 'v1',
          controlSignal: 'TERMINATE',
          aiResponse: {
            text: narratives.recommendationNarrative || finalAssessment.user_advice,
            assessment: {
              ...finalAssessment,
              facilities,
              narratives
            }
          },
          updatedProfile: extractedProfile,
          metadata: {
            reason: arbiterResult.reason,
            nextSteps: arbiterResult.nextSteps,
            saturation_count: arbiterResult.saturation_count
          }
        };
      } else {
        // CONTINUE or other non-terminal signals
        const nextQuestion = safeRemainingQuestions[0] ?? null;
        let aiText = nextQuestion?.text || 'Could you tell me more about your symptoms?';

        if (arbiterResult.signal === 'REQUIRE_CLARIFICATION' || arbiterResult.signal === 'RESOLVE_AMBIGUITY') {
          const bridge = await geminiService.generateBridgeMessage(
            history[history.length - 1]?.text || '',
            aiText
          );
          if (bridge) {
            aiText = bridge;
          }
        }

        responseData = {
          version: 'v1',
          controlSignal: arbiterResult.signal as TriageSignal,
          aiResponse: {
            text: aiText,
            question: nextQuestion
          },
          updatedProfile: extractedProfile,
          metadata: {
            reason: arbiterResult.reason,
            nextSteps: arbiterResult.nextSteps,
            needs_reset: arbiterResult.needs_reset,
            saturation_count: arbiterResult.saturation_count
          }
        };
      }
    }

    // Validate outbound response
    const validatedResponse = TriageAssessmentResponseSchema.parse(responseData);
    return res.json(validatedResponse);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => ({
        path: issue.path.map((segment) => String(segment)).join('.') || 'response',
        message: issue.message,
      }));
      console.warn('Triage Orchestrator V1 response validation failed:', issues);
      return res.status(400).json({
        error: 'Invalid triage response payload',
        issues,
      });
    }

    console.error('Error in Triage Orchestrator V1:', error);
    return res.status(500).json({ error: 'Triage assessment failed' });
  }
};

export const assess = async (req: Request, res: Response) => {
  try {
    const body = req.body as TriageAssessmentRequest;
    const { 
      history, 
      profile: currentProfile, 
      currentTurn, 
      totalPlannedQuestions, 
      remainingQuestions, 
      previousProfile, 
      clarificationAttempts = 0,
      patientContext,
      initialSymptom,
      sessionContext,
    } = body;

    const safeRemainingQuestions = Array.isArray(remainingQuestions) ? remainingQuestions : [];
    const triageSessionContext: TriageSessionContext | undefined = sessionContext ?? undefined;

    if (!history || !initialSymptom) {
      return res.status(400).json({ error: 'History and initialSymptom are required' });
    }

    // 1. Extract/Update Clinical Profile
    // We use the history and previous profile to get the most accurate current profile
    const extractedProfile = await geminiService.extractClinicalProfile(history, {
      previousProfile,
      currentProfileSummary: currentProfile?.summary
    });

    // 2. Emergency Check
    // Run keyword-based emergency detection on the entire conversation for safety
    const fullText = history.map(h => h.text).join(' ');
    const emergencyCategory = checkCriticalSystemKeywords(fullText);
    const isEmergency = emergencyCategory === 'critical';

    if (isEmergency) {
      // Force termination and get final recommendation
      const finalAssessment = await geminiService.assessSymptoms(
        initialSymptom,
        history,
        patientContext
      );

      // Fetch facilities for the recommended level
      const facilities = await selectFacilitiesForRecommendation({
        recommendation: finalAssessment.recommended_level,
        relevantServices: finalAssessment.relevant_services || []
      });

      // Fetch narratives for the recommended level
      const narratives = await geminiService.generateRecommendationNarratives({
        initialSymptom,
        profileSummary: extractedProfile.summary,
        answers: history.filter(h => h.role === 'user').map(h => h.text).join('\n'),
        selectedOptions: '',
        recommendedLevel: finalAssessment.recommended_level,
        keyConcerns: finalAssessment.key_concerns || [],
        relevantServices: finalAssessment.relevant_services || [],
        redFlags: finalAssessment.red_flags || [],
        clinicalSoap: finalAssessment.clinical_soap
      });

      const response: TriageAssessmentResponse = {
        version: 'legacy',
        controlSignal: 'TERMINATE',
        aiResponse: {
          text: narratives.recommendationNarrative || finalAssessment.user_advice || 'Emergency detected. Please seek immediate medical attention.',
          assessment: {
            ...finalAssessment,
            facilities,
            narratives
          }
        },
        updatedProfile: extractedProfile,
        metadata: {
          reason: 'EMERGENCY_DETECTED',
          emergency_detected: true
        }
      };
      return res.json(response);
    }

    // 3. Evaluate Triage State using TriageArbiter
    const arbiterResult = TriageArbiter.evaluateAssessmentState(
      history,
      extractedProfile,
      currentTurn,
      totalPlannedQuestions,
      safeRemainingQuestions,
      previousProfile,
      clarificationAttempts,
      initialSymptom,
      triageSessionContext,
    );

    // 4. Orchestrate Response based on Arbiter Signal
    if (arbiterResult.signal === 'TERMINATE') {
      // Generate final recommendation
      const finalAssessment = await geminiService.assessSymptoms(
        initialSymptom,
        history,
        patientContext
      );

      // Fetch facilities for the recommended level
      const facilities = await selectFacilitiesForRecommendation({
        recommendation: finalAssessment.recommended_level,
        relevantServices: finalAssessment.relevant_services || []
      });

      // Fetch narratives for the recommended level
      const narratives = await geminiService.generateRecommendationNarratives({
        initialSymptom,
        profileSummary: extractedProfile.summary,
        answers: history.filter(h => h.role === 'user').map(h => h.text).join('\n'),
        selectedOptions: '',
        recommendedLevel: finalAssessment.recommended_level,
        keyConcerns: finalAssessment.key_concerns || [],
        relevantServices: finalAssessment.relevant_services || [],
        redFlags: finalAssessment.red_flags || [],
        clinicalSoap: finalAssessment.clinical_soap
      });

      const response: TriageAssessmentResponse = {
        version: 'legacy',
        controlSignal: 'TERMINATE',
        aiResponse: {
          text: narratives.recommendationNarrative || finalAssessment.user_advice,
          assessment: {
            ...finalAssessment,
            facilities,
            narratives
          }
        },
        updatedProfile: extractedProfile,
        metadata: {
          reason: arbiterResult.reason,
          nextSteps: arbiterResult.nextSteps,
          saturation_count: arbiterResult.saturation_count
        }
      };
      return res.json(response);
    } else {
      // CONTINUE or other non-terminal signals (PRIORITIZE_RED_FLAGS, REQUIRE_CLARIFICATION, etc.)
      
      const nextQuestion = safeRemainingQuestions[0] ?? null;
      let aiText = nextQuestion?.text || 'Could you tell me more about your symptoms?';

      // If we have a bridge message or specific clarification needed, we can use Gemini
      if (arbiterResult.signal === 'REQUIRE_CLARIFICATION' || arbiterResult.signal === 'RESOLVE_AMBIGUITY') {
         // Optionally refine the question or add context
         const bridge = await geminiService.generateBridgeMessage(
            history[history.length - 1]?.text || '',
            aiText
         );
         if (bridge) {
            aiText = bridge;
         }
      }

      const response: TriageAssessmentResponse = {
        version: 'legacy',
        controlSignal: arbiterResult.signal as TriageSignal,
        aiResponse: {
          text: aiText,
          question: nextQuestion
        },
        updatedProfile: extractedProfile,
        metadata: {
          reason: arbiterResult.reason,
          nextSteps: arbiterResult.nextSteps,
          needs_reset: arbiterResult.needs_reset,
          saturation_count: arbiterResult.saturation_count
        }
      };
      return res.json(response);
    }
  } catch (error) {
    console.error('Error in Triage Orchestrator:', error);
    return res.status(500).json({ error: 'Triage assessment failed' });
  }
};
