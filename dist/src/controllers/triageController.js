"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assess = exports.assessV1 = void 0;
const geminiService_1 = require("../services/geminiService");
const TriageArbiter_1 = require("../services/triage/TriageArbiter");
const aiUtils_1 = require("../utils/aiUtils");
const aiService_1 = require("../services/aiService");
const triageSchema_1 = require("../schemas/triageSchema");
const assessV1 = async (req, res) => {
    try {
        const body = req.body;
        const { history, profile: currentProfile, currentTurn, totalPlannedQuestions, remainingQuestions, previousProfile, clarificationAttempts = 0, patientContext, initialSymptom } = body;
        if (!history || !initialSymptom) {
            return res.status(400).json({ error: 'History and initialSymptom are required' });
        }
        const extractedProfile = await geminiService_1.geminiService.extractClinicalProfile(history, {
            previousProfile,
            currentProfileSummary: currentProfile?.summary
        });
        const fullText = history.map(h => h.text).join(' ');
        const emergencyCategory = (0, aiUtils_1.checkCriticalSystemKeywords)(fullText);
        const isEmergency = emergencyCategory === 'critical';
        let responseData;
        if (isEmergency) {
            const finalAssessment = await geminiService_1.geminiService.assessSymptoms(initialSymptom, history, patientContext);
            const facilities = await (0, aiService_1.selectFacilitiesForRecommendation)({
                recommendation: finalAssessment.recommended_level,
                relevantServices: finalAssessment.relevant_services || []
            });
            const narratives = await geminiService_1.geminiService.generateRecommendationNarratives({
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
        }
        else {
            const arbiterResult = TriageArbiter_1.TriageArbiter.evaluateAssessmentState(history, extractedProfile, currentTurn, totalPlannedQuestions, remainingQuestions, previousProfile, clarificationAttempts, initialSymptom);
            if (arbiterResult.signal === 'TERMINATE') {
                const finalAssessment = await geminiService_1.geminiService.assessSymptoms(initialSymptom, history, patientContext);
                const facilities = await (0, aiService_1.selectFacilitiesForRecommendation)({
                    recommendation: finalAssessment.recommended_level,
                    relevantServices: finalAssessment.relevant_services || []
                });
                const narratives = await geminiService_1.geminiService.generateRecommendationNarratives({
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
            }
            else {
                let nextQuestion = remainingQuestions[0];
                let aiText = nextQuestion?.text || 'Could you tell me more about your symptoms?';
                if (arbiterResult.signal === 'REQUIRE_CLARIFICATION' || arbiterResult.signal === 'RESOLVE_AMBIGUITY') {
                    const bridge = await geminiService_1.geminiService.generateBridgeMessage(history[history.length - 1]?.text || '', aiText);
                    if (bridge) {
                        aiText = bridge;
                    }
                }
                responseData = {
                    version: 'v1',
                    controlSignal: arbiterResult.signal,
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
        const validatedResponse = triageSchema_1.TriageAssessmentResponseSchema.parse(responseData);
        return res.json(validatedResponse);
    }
    catch (error) {
        console.error('Error in Triage Orchestrator V1:', error);
        return res.status(500).json({ error: 'Triage assessment failed' });
    }
};
exports.assessV1 = assessV1;
const assess = async (req, res) => {
    try {
        const body = req.body;
        const { history, profile: currentProfile, currentTurn, totalPlannedQuestions, remainingQuestions, previousProfile, clarificationAttempts = 0, patientContext, initialSymptom } = body;
        if (!history || !initialSymptom) {
            return res.status(400).json({ error: 'History and initialSymptom are required' });
        }
        const extractedProfile = await geminiService_1.geminiService.extractClinicalProfile(history, {
            previousProfile,
            currentProfileSummary: currentProfile?.summary
        });
        const fullText = history.map(h => h.text).join(' ');
        const emergencyCategory = (0, aiUtils_1.checkCriticalSystemKeywords)(fullText);
        const isEmergency = emergencyCategory === 'critical';
        if (isEmergency) {
            const finalAssessment = await geminiService_1.geminiService.assessSymptoms(initialSymptom, history, patientContext);
            const facilities = await (0, aiService_1.selectFacilitiesForRecommendation)({
                recommendation: finalAssessment.recommended_level,
                relevantServices: finalAssessment.relevant_services || []
            });
            const narratives = await geminiService_1.geminiService.generateRecommendationNarratives({
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
            const response = {
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
        const arbiterResult = TriageArbiter_1.TriageArbiter.evaluateAssessmentState(history, extractedProfile, currentTurn, totalPlannedQuestions, remainingQuestions, previousProfile, clarificationAttempts, initialSymptom);
        if (arbiterResult.signal === 'TERMINATE') {
            const finalAssessment = await geminiService_1.geminiService.assessSymptoms(initialSymptom, history, patientContext);
            const facilities = await (0, aiService_1.selectFacilitiesForRecommendation)({
                recommendation: finalAssessment.recommended_level,
                relevantServices: finalAssessment.relevant_services || []
            });
            const narratives = await geminiService_1.geminiService.generateRecommendationNarratives({
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
            const response = {
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
        }
        else {
            let nextQuestion = remainingQuestions[0];
            let aiText = nextQuestion?.text || 'Could you tell me more about your symptoms?';
            if (arbiterResult.signal === 'REQUIRE_CLARIFICATION' || arbiterResult.signal === 'RESOLVE_AMBIGUITY') {
                const bridge = await geminiService_1.geminiService.generateBridgeMessage(history[history.length - 1]?.text || '', aiText);
                if (bridge) {
                    aiText = bridge;
                }
            }
            const response = {
                version: 'legacy',
                controlSignal: arbiterResult.signal,
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
    }
    catch (error) {
        console.error('Error in Triage Orchestrator:', error);
        return res.status(500).json({ error: 'Triage assessment failed' });
    }
};
exports.assess = assess;
//# sourceMappingURL=triageController.js.map