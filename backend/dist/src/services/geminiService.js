"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiService = exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const aiConstants_1 = require("../utils/aiConstants");
const aiUtils_1 = require("../utils/aiUtils");
const ProtocolRegistry_1 = require("./triage/ProtocolRegistry");
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
class GeminiService {
    constructor() {
        this.model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
        });
    }
    applyPatientContext(prompt, patientContext) {
        if (!patientContext || !patientContext.trim()) {
            return prompt;
        }
        return `${patientContext.trim()}\n\n---\n\n${prompt}`;
    }
    async expandAssessment(context) {
        const prompt = aiConstants_1.DYNAMIC_CLARIFIER_PROMPT_TEMPLATE
            .replace('{{resolvedTag}}', context.resolvedTag || '')
            .replace('{{initialSymptom}}', context.initialSymptom || '')
            .replace('{{symptomContext}}', context.symptomContext || '')
            .replace('{{arbiterReason}}', context.arbiterReason || '')
            .replace('{{missingSlots}}', context.unresolvedSlotsText || '')
            .replace('{{coreSlots}}', context.missingCoreSlotsText || '')
            .replace('{{flagsText}}', context.flagsText || '')
            .replace('{{recentResponses}}', context.recentResponsesText || '')
            .replace('{{triageScore}}', context.triageScoreText || '')
            .replace('{{establishedFacts}}', context.establishedFacts || '')
            .replace('{{currentTurn}}', (context.currentTurn || 0).toString())
            .replace('{{categoryLabel}}', context.categoryLabel || '');
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();
        return (0, aiUtils_1.parseAndValidateLLMResponse)(responseText);
    }
    async generateAssessmentPlan(initialSymptom, patientContext, fullName) {
        let prompt = aiConstants_1.GENERATE_ASSESSMENT_QUESTIONS_PROMPT.replace('{{initialSymptom}}', initialSymptom);
        if (fullName && fullName.trim()) {
            prompt = `The patient's name is ${fullName.trim()}.\n\n${prompt}`;
        }
        prompt = this.applyPatientContext(prompt, patientContext);
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();
        const parsed = (0, aiUtils_1.parseAndValidateLLMResponse)(responseText);
        const questions = parsed.questions || [];
        return {
            questions: (0, aiUtils_1.prioritizeQuestions)(questions),
            intro: parsed.intro,
        };
    }
    async extractClinicalProfile(history, options) {
        const profileSummary = options?.currentProfileSummary || 'No previous profile summary is available.';
        const formattedRecentMessages = history
            .map((msg) => `${msg.role === 'user' ? 'USER' : 'ASSISTANT'}: ${msg.text}`)
            .join('\n');
        let enrichedSummary = profileSummary;
        if (options?.previousProfile) {
            const prev = options.previousProfile;
            enrichedSummary += `\nPREVIOUS STATE: Red Flags Resolved: ${prev.red_flags_resolved}, Complexity: ${prev.symptom_category}, Vulnerable: ${prev.is_vulnerable}.`;
        }
        const firstUserMsg = history.find(m => m.role === 'user')?.text || '';
        const protocol = (0, ProtocolRegistry_1.detectProtocol)(enrichedSummary, firstUserMsg);
        let protocolInstruction = '';
        if (protocol) {
            protocolInstruction = `\n\nREQUIRED FOR ${protocol.id}: Extract these specialized findings into "specific_details" using these exact keys: ${protocol.required_slots.join(', ')}.`;
        }
        const prompt = aiConstants_1.FINAL_SLOT_EXTRACTION_PROMPT.replace('{{current_profile_summary}}', enrichedSummary).replace('{{recent_messages}}', formattedRecentMessages || 'No recent conversation is available.') + protocolInstruction;
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();
        const profile = (0, aiUtils_1.parseAndValidateLLMResponse)(responseText);
        if (protocol && profile) {
            if (!profile.specific_details)
                profile.specific_details = {};
            protocol.required_slots.forEach(slot => {
                if (profile.specific_details[slot] === undefined) {
                    profile.specific_details[slot] = null;
                }
            });
        }
        return profile;
    }
    async assessSymptoms(symptoms, history, patientContext) {
        const systemPrompt = this.applyPatientContext(aiConstants_1.SYMPTOM_ASSESSMENT_SYSTEM_PROMPT, patientContext);
        const chat = this.model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: 'model',
                    parts: [{ text: 'Understood. I am ready to triage symptoms for Naga City residents.' }],
                },
                ...history.map((msg) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }],
                })),
            ],
        });
        const result = await chat.sendMessage(symptoms);
        const responseText = result.response.text();
        return (0, aiUtils_1.parseAndValidateLLMResponse)(responseText);
    }
    async generateRecommendationNarratives(input) {
        const prompt = aiConstants_1.RECOMMENDATION_NARRATIVE_PROMPT
            .replace('{{initialSymptom}}', input.initialSymptom || '')
            .replace('{{profileSummary}}', input.profileSummary || '')
            .replace('{{answers}}', input.answers || '')
            .replace('{{selectedOptions}}', input.selectedOptions || '')
            .replace('{{recommendedLevel}}', input.recommendedLevel || '')
            .replace('{{keyConcerns}}', (input.keyConcerns || []).join(', '))
            .replace('{{relevantServices}}', (input.relevantServices || []).join(', '))
            .replace('{{redFlags}}', (input.redFlags || []).join(', '))
            .replace('{{clinicalSoap}}', input.clinicalSoap || '');
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();
        return (0, aiUtils_1.parseAndValidateLLMResponse)(responseText);
    }
    async generateImmediateFollowUp(profile, context) {
        const prompt = aiConstants_1.IMMEDIATE_FOLLOW_UP_PROMPT
            .replace('{{profile}}', JSON.stringify(profile, null, 2))
            .replace('{{context}}', context);
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();
        return (0, aiUtils_1.parseAndValidateLLMResponse)(responseText);
    }
    async refineAssessmentPlan(currentProfile, remainingCount) {
        const prompt = aiConstants_1.REFINE_PLAN_PROMPT
            .replace('{{currentProfile}}', JSON.stringify(currentProfile, null, 2))
            .replace('{{remainingCount}}', remainingCount.toString());
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();
        return (0, aiUtils_1.parseAndValidateLLMResponse)(responseText);
    }
    async generateBridgeMessage(lastUserAnswer, nextQuestion) {
        const prompt = aiConstants_1.BRIDGE_PROMPT
            .replace('{{lastUserAnswer}}', lastUserAnswer)
            .replace('{{nextQuestionText}}', nextQuestion);
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();
        return responseText.trim();
    }
    async refineQuestion(questionText, userAnswer) {
        const prompt = aiConstants_1.REFINE_QUESTION_PROMPT
            .replace('{{questionText}}', questionText)
            .replace('{{userAnswer}}', userAnswer);
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();
        return responseText.trim();
    }
    async getGeminiResponse(prompt, history, systemInstruction) {
        let modelToUse = this.model;
        if (systemInstruction) {
            modelToUse = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                systemInstruction: systemInstruction,
            });
        }
        if (history && history.length > 0) {
            const chat = modelToUse.startChat({
                history: history.map((msg) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text || (msg.parts && msg.parts[0]?.text) || '' }],
                })),
            });
            const promptText = Array.isArray(prompt)
                ? prompt.map(p => (typeof p === 'string' ? p : JSON.stringify(p))).join('\n')
                : prompt;
            const result = await chat.sendMessage(promptText);
            return result.response.text().trim();
        }
        else {
            const result = await modelToUse.generateContent(prompt);
            return result.response.text().trim();
        }
    }
}
exports.GeminiService = GeminiService;
exports.geminiService = new GeminiService();
//# sourceMappingURL=geminiService.js.map