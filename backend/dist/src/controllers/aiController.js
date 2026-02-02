"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = exports.evaluateTriageState = exports.refineQuestion = exports.generateBridgeMessage = exports.expandAssessment = exports.refineAssessmentPlan = exports.generateImmediateFollowUp = exports.generateRecommendationNarratives = exports.assessSymptoms = exports.extractClinicalProfile = exports.generateAssessmentPlan = exports.navigate = void 0;
const aiService = __importStar(require("../services/aiService"));
const geminiService_1 = require("../services/geminiService");
const TriageArbiter_1 = require("../services/triage/TriageArbiter");
const navigate = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error in AI navigation:', error);
        res.status(500).json({ error: 'AI navigation failed' });
    }
};
exports.navigate = navigate;
const generateAssessmentPlan = async (req, res) => {
    try {
        const { initialSymptom, patientContext, fullName } = req.body;
        const result = await geminiService_1.geminiService.generateAssessmentPlan(initialSymptom, patientContext, fullName);
        res.json(result);
    }
    catch (error) {
        console.error('Error in generateAssessmentPlan:', error);
        res.status(500).json({ error: 'Failed to generate assessment plan' });
    }
};
exports.generateAssessmentPlan = generateAssessmentPlan;
const extractClinicalProfile = async (req, res) => {
    try {
        const { history, options } = req.body;
        const result = await geminiService_1.geminiService.extractClinicalProfile(history, options);
        res.json(result);
    }
    catch (error) {
        console.error('Error in extractClinicalProfile:', error);
        res.status(500).json({ error: 'Failed to extract clinical profile' });
    }
};
exports.extractClinicalProfile = extractClinicalProfile;
const assessSymptoms = async (req, res) => {
    try {
        const { symptoms, history, patientContext } = req.body;
        const result = await geminiService_1.geminiService.assessSymptoms(symptoms, history, patientContext);
        res.json(result);
    }
    catch (error) {
        console.error('Error in assessSymptoms:', error);
        res.status(500).json({ error: 'Symptom assessment failed' });
    }
};
exports.assessSymptoms = assessSymptoms;
const generateRecommendationNarratives = async (req, res) => {
    try {
        const { input } = req.body;
        const result = await geminiService_1.geminiService.generateRecommendationNarratives(input);
        res.json(result);
    }
    catch (error) {
        console.error('Error in generateRecommendationNarratives:', error);
        res.status(500).json({ error: 'Failed to generate recommendation narratives' });
    }
};
exports.generateRecommendationNarratives = generateRecommendationNarratives;
const generateImmediateFollowUp = async (req, res) => {
    try {
        const { profile, context } = req.body;
        const result = await geminiService_1.geminiService.generateImmediateFollowUp(profile, context);
        res.json(result);
    }
    catch (error) {
        console.error('Error in generateImmediateFollowUp:', error);
        res.status(500).json({ error: 'Failed to generate immediate follow-up' });
    }
};
exports.generateImmediateFollowUp = generateImmediateFollowUp;
const refineAssessmentPlan = async (req, res) => {
    try {
        const { currentProfile, remainingCount } = req.body;
        const result = await geminiService_1.geminiService.refineAssessmentPlan(currentProfile, remainingCount);
        res.json(result);
    }
    catch (error) {
        console.error('Error in refineAssessmentPlan:', error);
        res.status(500).json({ error: 'Failed to refine assessment plan' });
    }
};
exports.refineAssessmentPlan = refineAssessmentPlan;
const expandAssessment = async (req, res) => {
    try {
        const { resolvedTag, initialSymptom, symptomContext, arbiterReason, unresolvedSlotsText, missingCoreSlotsText, flagsText, recentResponsesText, triageScoreText, currentTurn, categoryLabel, establishedFacts, } = req.body;
        const result = await geminiService_1.geminiService.expandAssessment({
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
    }
    catch (error) {
        console.error('Error in expandAssessment:', error);
        res.status(500).json({ error: 'Failed to expand assessment' });
    }
};
exports.expandAssessment = expandAssessment;
const generateBridgeMessage = async (req, res) => {
    try {
        const { lastUserAnswer, nextQuestion } = req.body;
        const result = await geminiService_1.geminiService.generateBridgeMessage(lastUserAnswer, nextQuestion);
        res.json({ message: result });
    }
    catch (error) {
        console.error('Error in generateBridgeMessage:', error);
        res.status(500).json({ error: 'Failed to generate bridge message' });
    }
};
exports.generateBridgeMessage = generateBridgeMessage;
const refineQuestion = async (req, res) => {
    try {
        const { questionText, userAnswer } = req.body;
        const result = await geminiService_1.geminiService.refineQuestion(questionText, userAnswer);
        res.json({ refinedQuestion: result });
    }
    catch (error) {
        console.error('Error in refineQuestion:', error);
        res.status(500).json({ error: 'Failed to refine question' });
    }
};
exports.refineQuestion = refineQuestion;
const evaluateTriageState = async (req, res) => {
    try {
        const { history, profile, currentTurn, totalPlannedQuestions, remainingQuestions, previousProfile, clarificationAttempts, initialSymptom, } = req.body;
        const result = TriageArbiter_1.TriageArbiter.evaluateAssessmentState(history, profile, currentTurn, totalPlannedQuestions, remainingQuestions, previousProfile, clarificationAttempts, initialSymptom);
        res.json(result);
    }
    catch (error) {
        console.error('Error in evaluateTriageState:', error);
        res.status(500).json({ error: 'Failed to evaluate triage state' });
    }
};
exports.evaluateTriageState = evaluateTriageState;
const chat = async (req, res) => {
    try {
        const { prompt, history, systemInstruction } = req.body;
        if (!prompt && (!history || history.length === 0)) {
            res.status(400).json({ error: 'Prompt or history is required' });
            return;
        }
        const result = await geminiService_1.geminiService.getGeminiResponse(prompt, history, systemInstruction);
        res.json({ text: result });
    }
    catch (error) {
        console.error('Error in chat:', error);
        res.status(500).json({ error: 'AI chat failed' });
    }
};
exports.chat = chat;
//# sourceMappingURL=aiController.js.map