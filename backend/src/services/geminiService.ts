import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
// import * as fs from 'fs';
// import * as path from 'path';
import {
  GENERATE_ASSESSMENT_QUESTIONS_PROMPT,
  FINAL_SLOT_EXTRACTION_PROMPT,
  REFINE_PLAN_PROMPT,
  DYNAMIC_CLARIFIER_PROMPT_TEMPLATE,
  IMMEDIATE_FOLLOW_UP_PROMPT,
  SYMPTOM_ASSESSMENT_SYSTEM_PROMPT,
  RECOMMENDATION_NARRATIVE_PROMPT,
  BRIDGE_PROMPT,
  REFINE_QUESTION_PROMPT,
} from '../utils/aiConstants';
import {
  parseAndValidateLLMResponse,
  prioritizeQuestions,
  normalizeDenialConfidence,
} from '../utils/aiUtils';
import { detectProtocol } from './triage/ProtocolRegistry';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export class GeminiService {
  private model: GenerativeModel;
  // private medicalKnowledge: any;

  constructor() {
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    /*
    try {
      const knowledgePath = path.join(__dirname, '../../../assets/medical-knowledge.json');
      if (fs.existsSync(knowledgePath)) {
        this.medicalKnowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load medical knowledge:', error);
    }
    */
  }

  private applyPatientContext(prompt: string, patientContext?: string): string {
    if (!patientContext || !patientContext.trim()) {
      return prompt;
    }
    return `${patientContext.trim()}\n\n---\n\n${prompt}`;
  }

  public async expandAssessment(context: any) {
    const prompt = DYNAMIC_CLARIFIER_PROMPT_TEMPLATE
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

    return parseAndValidateLLMResponse<any>(responseText);
  }

  public async generateAssessmentPlan(
    initialSymptom: string,
    patientContext?: string,
    fullName?: string | null,
  ) {
    let prompt = GENERATE_ASSESSMENT_QUESTIONS_PROMPT.replace(
      '{{initialSymptom}}',
      initialSymptom,
    );

    if (fullName && fullName.trim()) {
      prompt = `The patient's name is ${fullName.trim()}.\n\n${prompt}`;
    }

    prompt = this.applyPatientContext(prompt, patientContext);

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();

    const parsed = parseAndValidateLLMResponse<any>(responseText);
    const questions = parsed.questions || [];

    return {
      questions: prioritizeQuestions(questions),
      intro: parsed.intro,
    };
  }

  public async extractClinicalProfile(
    history: any[],
    options?: any,
  ) {
    const profileSummary = options?.currentProfileSummary || 'No previous profile summary is available.';
    const formattedRecentMessages = history
      .map((msg: any) => `${msg.role === 'user' ? 'USER' : 'ASSISTANT'}: ${msg.text}`)
      .join('\n');

    let enrichedSummary = profileSummary;
    if (options?.previousProfile) {
        const prev = options.previousProfile;
        enrichedSummary += `\nPREVIOUS STATE: Red Flags Resolved: ${prev.red_flags_resolved}, Complexity: ${prev.symptom_category}, Vulnerable: ${prev.is_vulnerable}.`;
    }

    // Detect protocol to inject specific requirements
    const firstUserMsg = history.find(m => m.role === 'user')?.text || '';
    const protocol = detectProtocol(enrichedSummary, firstUserMsg);
    let protocolInstruction = '';
    if (protocol) {
        protocolInstruction = `\n\nREQUIRED FOR ${protocol.id}: Extract these specialized findings into "specific_details" using these exact keys: ${protocol.required_slots.join(', ')}.`;
    }

    const prompt = FINAL_SLOT_EXTRACTION_PROMPT.replace(
      '{{current_profile_summary}}',
      enrichedSummary,
    ).replace('{{recent_messages}}', formattedRecentMessages || 'No recent conversation is available.') + protocolInstruction;
    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();

    const profile = parseAndValidateLLMResponse<any>(responseText);

    if (profile && typeof profile === 'object') {
      const normalizedConfidence = normalizeDenialConfidence(profile.denial_confidence);
      if (normalizedConfidence) {
        profile.denial_confidence = normalizedConfidence;
      } else {
        delete profile.denial_confidence;
      }
    }

    // Post-extraction sanitization: Ensure required protocol slots exist
    if (protocol && profile) {
        if (!profile.specific_details) profile.specific_details = {};
        protocol.required_slots.forEach(slot => {
            if (profile.specific_details[slot] === undefined) {
                profile.specific_details[slot] = null;
            }
        });
    }

    return profile;
  }

  public async assessSymptoms(
    symptoms: string,
    history: any[],
    patientContext?: string,
  ) {
    const systemPrompt = this.applyPatientContext(SYMPTOM_ASSESSMENT_SYSTEM_PROMPT, patientContext);

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
        ...history.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        })),
      ],
    });

    const result = await chat.sendMessage(symptoms);
    const responseText = result.response.text();

    return parseAndValidateLLMResponse<any>(responseText);
  }

  public async generateRecommendationNarratives(input: any) {
    const prompt = RECOMMENDATION_NARRATIVE_PROMPT
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

    return parseAndValidateLLMResponse<any>(responseText);
  }

  public async generateImmediateFollowUp(profile: any, context: string) {
    const prompt = IMMEDIATE_FOLLOW_UP_PROMPT
        .replace('{{profile}}', JSON.stringify(profile, null, 2))
        .replace('{{context}}', context);

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();

    return parseAndValidateLLMResponse<any>(responseText);
  }

  public async refineAssessmentPlan(currentProfile: any, remainingCount: number) {
    const prompt = REFINE_PLAN_PROMPT
        .replace('{{currentProfile}}', JSON.stringify(currentProfile, null, 2))
        .replace('{{remainingCount}}', remainingCount.toString());

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();

    return parseAndValidateLLMResponse<any>(responseText);
  }

  public async generateBridgeMessage(lastUserAnswer: string, nextQuestion: string) {
    const prompt = BRIDGE_PROMPT
        .replace('{{lastUserAnswer}}', lastUserAnswer)
        .replace('{{nextQuestionText}}', nextQuestion);

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();

    return responseText.trim();
  }

  public async refineQuestion(questionText: string, userAnswer: string) {
    const prompt = REFINE_QUESTION_PROMPT
        .replace('{{questionText}}', questionText)
        .replace('{{userAnswer}}', userAnswer);

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();

    return responseText.trim();
  }
  
  /**
   * Generic proxy method for Gemini interactions.
   * Supports both simple string prompts and structured chat history.
   */
  public async getGeminiResponse(prompt: string | any[], history?: any[], systemInstruction?: string) {
    let modelToUse = this.model;

    // If system instruction is provided, we need to get a model instance with it
    if (systemInstruction) {
      modelToUse = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemInstruction,
      });
    }

    if (history && history.length > 0) {
      const chat = modelToUse.startChat({
        history: history.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text || (msg.parts && msg.parts[0]?.text) || '' }],
        })),
      });

      // sendMessage only accepts string, so we ensure prompt is a string if history is used
      const promptText = Array.isArray(prompt) 
        ? prompt.map(p => (typeof p === 'string' ? p : JSON.stringify(p))).join('\n')
        : prompt;

      const result = await chat.sendMessage(promptText);
      return result.response.text().trim();
    } else {
      // If no history, we can use generateContent directly which supports more flexible inputs
      const result = await modelToUse.generateContent(prompt as any);
      return result.response.text().trim();
    }
  }
}

export const geminiService = new GeminiService();
