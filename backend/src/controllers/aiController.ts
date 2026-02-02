import { Request, Response } from 'express';
import * as aiService from '../services/aiService';
import { geminiService } from '../services/geminiService';
import { TriageArbiter, TriageSessionContext } from '../services/triage/TriageArbiter';

export const navigate = async (req: Request, res: Response) => {
  try {
    const { symptoms, age, severity, medical_history } = req.body;

    if (!symptoms) {
      res.status(400).json({ error: 'Symptoms are required' });
      return;
    }

    const result = await aiService.navigate({
      symptoms,
      age,
      severity,
      medical_history,
    });

    res.json(result);
  } catch (error) {
    console.error('Error in AI navigation:', error);
    res.status(500).json({ error: 'AI navigation failed' });
  }
};

export const generateAssessmentPlan = async (req: Request, res: Response) => {
  try {
    const { initialSymptom, patientContext, fullName } = req.body;
    const result = await geminiService.generateAssessmentPlan(initialSymptom, patientContext, fullName);
    res.json(result);
  } catch (error) {
    console.error('Error in generateAssessmentPlan:', error);
    res.status(500).json({ error: 'Failed to generate assessment plan' });
  }
};

export const extractClinicalProfile = async (req: Request, res: Response) => {
  try {
    const { history, options } = req.body;
    const result = await geminiService.extractClinicalProfile(history, options);
    res.json(result);
  } catch (error) {
    console.error('Error in extractClinicalProfile:', error);
    res.status(500).json({ error: 'Failed to extract clinical profile' });
  }
};

export const assessSymptoms = async (req: Request, res: Response) => {
  try {
    const { symptoms, history, patientContext } = req.body;
    const result = await geminiService.assessSymptoms(symptoms, history, patientContext);
    res.json(result);
  } catch (error) {
    console.error('Error in assessSymptoms:', error);
    res.status(500).json({ error: 'Symptom assessment failed' });
  }
};

export const generateRecommendationNarratives = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const result = await geminiService.generateRecommendationNarratives(input);
    res.json(result);
  } catch (error) {
    console.error('Error in generateRecommendationNarratives:', error);
    res.status(500).json({ error: 'Failed to generate recommendation narratives' });
  }
};

export const generateImmediateFollowUp = async (req: Request, res: Response) => {
  try {
    const { profile, context } = req.body;
    const result = await geminiService.generateImmediateFollowUp(profile, context);
    res.json(result);
  } catch (error) {
    console.error('Error in generateImmediateFollowUp:', error);
    res.status(500).json({ error: 'Failed to generate immediate follow-up' });
  }
};

export const refineAssessmentPlan = async (req: Request, res: Response) => {
  try {
    const { currentProfile, remainingCount } = req.body;
    const result = await geminiService.refineAssessmentPlan(currentProfile, remainingCount);
    res.json(result);
  } catch (error) {
    console.error('Error in refineAssessmentPlan:', error);
    res.status(500).json({ error: 'Failed to refine assessment plan' });
  }
};

export const expandAssessment = async (req: Request, res: Response) => {
  try {
    const {
      resolvedTag,
      initialSymptom,
      symptomContext,
      arbiterReason,
      unresolvedSlotsText,
      missingCoreSlotsText,
      flagsText,
      recentResponsesText,
      triageScoreText,
      currentTurn,
      categoryLabel,
      establishedFacts,
    } = req.body;

    const result = await geminiService.expandAssessment({
      resolvedTag,
      initialSymptom,
      symptomContext,
      arbiterReason,
      unresolvedSlotsText,
      missingCoreSlotsText,
      flagsText,
      recentResponsesText,
      triageScoreText,
      currentTurn,
      categoryLabel,
      establishedFacts,
    });

    res.json(result);
  } catch (error) {
    console.error('Error in expandAssessment:', error);
    res.status(500).json({ error: 'Failed to expand assessment' });
  }
};

export const generateBridgeMessage = async (req: Request, res: Response) => {
  try {
    const { lastUserAnswer, nextQuestion } = req.body;
    const result = await geminiService.generateBridgeMessage(lastUserAnswer, nextQuestion);
    res.json({ message: result });
  } catch (error) {
    console.error('Error in generateBridgeMessage:', error);
    res.status(500).json({ error: 'Failed to generate bridge message' });
  }
};

export const refineQuestion = async (req: Request, res: Response) => {
  try {
    const { questionText, userAnswer } = req.body;
    const result = await geminiService.refineQuestion(questionText, userAnswer);
    res.json({ refinedQuestion: result });
  } catch (error) {
    console.error('Error in refineQuestion:', error);
    res.status(500).json({ error: 'Failed to refine question' });
  }
};

export const evaluateTriageState = async (req: Request, res: Response) => {
  try {
    const {
      history,
      profile,
      currentTurn,
      totalPlannedQuestions,
      remainingQuestions,
      previousProfile,
      clarificationAttempts,
      initialSymptom,
    } = req.body;
    const sessionContext: TriageSessionContext | undefined = req.body.sessionContext;
    const safeRemainingQuestions = Array.isArray(remainingQuestions) ? remainingQuestions : [];

    const result = TriageArbiter.evaluateAssessmentState(
      history,
      profile,
      currentTurn,
      totalPlannedQuestions,
      safeRemainingQuestions,
      previousProfile,
      clarificationAttempts,
      initialSymptom,
      sessionContext,
    );

    res.json(result);
  } catch (error) {
    console.error('Error in evaluateTriageState:', error);
    res.status(500).json({ error: 'Failed to evaluate triage state' });
  }
};

export const chat = async (req: Request, res: Response) => {
  try {
    const { prompt, history, systemInstruction } = req.body;

    if (!prompt && (!history || history.length === 0)) {
      res.status(400).json({ error: 'Prompt or history is required' });
      return;
    }

    const result = await geminiService.getGeminiResponse(prompt, history, systemInstruction);
    res.json({ text: result });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'AI chat failed' });
  }
};
