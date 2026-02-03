"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectFacilitiesForRecommendation = exports.navigate = void 0;
const generative_ai_1 = require("@google/generative-ai");
const prisma_1 = __importDefault(require("../lib/prisma"));
const constants_1 = require("../utils/constants");
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
const navigate = async (data) => {
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
    2. Identify 2-3 relevant medical services or specialties required for this case.
    3. Optionally include specific facility type constraints.
    4. Provide clear reasoning for your recommendation.

    Output Schema (JSON only):
    {
      "recommendation": "One of: Self-Care, Health Center, Hospital, Emergency",
      "triage_readiness_score": 0.0 to 1.0,
      "ambiguity_detected": boolean,
      "reasoning": "Brief explanation...",
      "relevant_services": ["string", "string"], // Use standard medical specialty names (e.g., Pediatrics, Surgery, Mental Health)
      "facility_type_constraints": ["string"] // e.g., "Hospital with trauma services"
    }
    
    Return ONLY valid JSON.
  `;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanedText = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
    let parsedResponse;
    try {
        parsedResponse = JSON.parse(cleanedText);
        if (parsedResponse.recommendation === 'Emergency Room') {
            parsedResponse.recommendation = 'Emergency';
        }
    }
    catch {
        console.error('Failed to parse Gemini response:', cleanedText);
        throw new Error('AI service unavailable');
    }
    if (parsedResponse.relevant_services) {
        parsedResponse.relevant_services = parsedResponse.relevant_services
            .map((s) => (0, constants_1.resolveServiceAlias)(s))
            .filter((s) => constants_1.VALID_SERVICES.includes(s));
    }
    const levels = ['Self-Care', 'Health Center', 'Hospital', 'Emergency'];
    const currentIdx = levels.indexOf(parsedResponse.recommendation);
    const isLowReadiness = parsedResponse.triage_readiness_score !== undefined &&
        parsedResponse.triage_readiness_score < 0.8;
    const isAmbiguous = parsedResponse.ambiguity_detected === true;
    if ((isLowReadiness || isAmbiguous) && currentIdx !== -1 && currentIdx < 3) {
        const nextLevel = levels[currentIdx + 1];
        parsedResponse.recommendation = nextLevel;
        parsedResponse.reasoning += ` (Note: Recommendation upgraded to ${nextLevel} due to uncertainty/ambiguity for safety.)`;
    }
    const recommendedFacilities = await (0, exports.selectFacilitiesForRecommendation)({
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
exports.navigate = navigate;
const HEALTH_CENTER_KEYWORDS = ['Health Center', 'Center'];
const HOSPITAL_KEYWORDS = ['Hospital'];
const EMERGENCY_KEYWORDS = ['Emergency', 'Hospital'];
const SELF_CARE_KEYWORDS = ['Health Center', 'Clinic', 'Community Clinic'];
const FACILITY_LEVEL_KEYWORDS = {
    'SelfCare': SELF_CARE_KEYWORDS,
    'self_care': SELF_CARE_KEYWORDS,
    'self-care': SELF_CARE_KEYWORDS,
    'Self-Care': SELF_CARE_KEYWORDS,
    'Health Center': HEALTH_CENTER_KEYWORDS,
    'health_center': HEALTH_CENTER_KEYWORDS,
    'health-center': HEALTH_CENTER_KEYWORDS,
    'HealthCenter': HEALTH_CENTER_KEYWORDS,
    'Hospital': HOSPITAL_KEYWORDS,
    'hospital': HOSPITAL_KEYWORDS,
    'Emergency': EMERGENCY_KEYWORDS,
    'emergency': EMERGENCY_KEYWORDS,
    'Emergency Room': EMERGENCY_KEYWORDS,
    'Emergency room': EMERGENCY_KEYWORDS,
    'emergency_room': EMERGENCY_KEYWORDS,
};
const resolveFacilityTypeKeywords = (recommendation, facilityTypeConstraints) => {
    const normalizedLevel = recommendation?.trim();
    const baseKeywords = FACILITY_LEVEL_KEYWORDS[normalizedLevel ?? ''] ?? [];
    const constraintKeywords = facilityTypeConstraints?.map((constraint) => constraint.trim()).filter(Boolean) ?? [];
    const allKeywords = [...constraintKeywords, ...baseKeywords].filter(Boolean);
    if (allKeywords.length === 0 && normalizedLevel) {
        console.warn(`[AI] No facility keywords mapped for recommendation "${normalizedLevel}". Defaulting to hospital keywords.`);
        return Array.from(new Set(HOSPITAL_KEYWORDS));
    }
    return Array.from(new Set(allKeywords));
};
const selectFacilitiesForRecommendation = async ({ recommendation, relevantServices, facilityTypeConstraints, }) => {
    const typeKeywords = resolveFacilityTypeKeywords(recommendation, facilityTypeConstraints);
    if (typeKeywords.length === 0) {
        return [];
    }
    const filters = [];
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
    const where = filters.length > 0 ? { AND: filters } : {};
    return prisma_1.default.facility.findMany({
        where,
        orderBy: { name: 'asc' },
        take: 3,
    });
};
exports.selectFacilitiesForRecommendation = selectFacilitiesForRecommendation;
//# sourceMappingURL=aiService.js.map