"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriageAssessmentResponseSchema = exports.AssessmentResponseSchema = exports.TriageAssessmentRequestSchema = exports.AssessmentQuestionSchema = exports.AssessmentProfileSchema = exports.ChatHistoryItemSchema = void 0;
const zod_1 = require("zod");
exports.ChatHistoryItemSchema = zod_1.z.object({
    role: zod_1.z.enum(['user', 'assistant', 'system']),
    text: zod_1.z.string(),
});
exports.AssessmentProfileSchema = zod_1.z.object({
    age: zod_1.z.string().nullable(),
    duration: zod_1.z.string().nullable(),
    severity: zod_1.z.string().nullable(),
    progression: zod_1.z.string().nullable(),
    red_flag_denials: zod_1.z.string().nullable(),
    summary: zod_1.z.string(),
    triage_readiness_score: zod_1.z.number().optional(),
    ambiguity_detected: zod_1.z.boolean().optional(),
    internal_inconsistency_detected: zod_1.z.boolean().optional(),
    internal_consistency_score: zod_1.z.number().optional(),
    red_flags_resolved: zod_1.z.boolean().optional(),
    uncertainty_accepted: zod_1.z.boolean().optional(),
    clinical_friction_detected: zod_1.z.boolean().optional(),
    clinical_friction_details: zod_1.z.string().nullable().optional(),
    is_complex_case: zod_1.z.boolean().optional(),
    is_vulnerable: zod_1.z.boolean().optional(),
    symptom_category: zod_1.z.enum(['simple', 'complex', 'critical']).optional(),
    denial_confidence: zod_1.z.enum(['high', 'medium', 'low']).optional(),
    turn_count: zod_1.z.number().optional(),
    is_recent_resolved: zod_1.z.boolean().optional(),
    resolved_keyword: zod_1.z.string().optional(),
    denied_symptoms: zod_1.z.array(zod_1.z.string()).optional(),
    covered_symptoms: zod_1.z.array(zod_1.z.string()).optional(),
    specific_details: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).nullable().optional(),
    termination_reason: zod_1.z.string().nullable().optional(),
});
exports.AssessmentQuestionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    text: zod_1.z.string(),
    type: zod_1.z.enum(['text', 'multi-select', 'single-select', 'number']).optional(),
    options: zod_1.z.array(zod_1.z.any()).optional(),
    tier: zod_1.z.number().optional(),
    is_red_flag: zod_1.z.boolean().optional(),
    metadata: zod_1.z.any().optional(),
});
const SessionContextSchema = zod_1.z.object({
    sessionId: zod_1.z.string().optional(),
    stableTurnCount: zod_1.z.number().min(0).optional(),
});
exports.TriageAssessmentRequestSchema = zod_1.z.object({
    history: zod_1.z.array(exports.ChatHistoryItemSchema),
    profile: exports.AssessmentProfileSchema.optional(),
    currentTurn: zod_1.z.number(),
    totalPlannedQuestions: zod_1.z.number(),
    remainingQuestions: zod_1.z.array(exports.AssessmentQuestionSchema),
    previousProfile: exports.AssessmentProfileSchema.optional(),
    clarificationAttempts: zod_1.z.number().optional(),
    patientContext: zod_1.z.string().optional(),
    initialSymptom: zod_1.z.string(),
    fullName: zod_1.z.string().optional(),
    sessionContext: SessionContextSchema.optional(),
});
exports.AssessmentResponseSchema = zod_1.z.object({
    recommended_level: zod_1.z.enum(['self_care', 'health_center', 'hospital', 'emergency', 'self-care', 'health-center']),
    user_advice: zod_1.z.string(),
    follow_up_questions: zod_1.z.array(zod_1.z.string()),
    clinical_soap: zod_1.z.string(),
    key_concerns: zod_1.z.array(zod_1.z.string()),
    critical_warnings: zod_1.z.array(zod_1.z.string()),
    relevant_services: zod_1.z.array(zod_1.z.string()),
    red_flags: zod_1.z.array(zod_1.z.string()),
    medical_justification: zod_1.z.string().optional(),
    triage_logic: zod_1.z.any().optional(),
    facilities: zod_1.z.array(zod_1.z.any()).optional(),
    narratives: zod_1.z.object({
        recommendationNarrative: zod_1.z.string(),
        handoverNarrative: zod_1.z.string(),
    }).optional(),
});
exports.TriageAssessmentResponseSchema = zod_1.z.object({
    version: zod_1.z.string(),
    controlSignal: zod_1.z.enum([
        'TERMINATE',
        'CONTINUE',
        'RESOLVE_AMBIGUITY',
        'PRIORITIZE_RED_FLAGS',
        'REQUIRE_CLARIFICATION',
        'DRILL_DOWN',
    ]),
    aiResponse: zod_1.z.object({
        text: zod_1.z.string(),
        question: exports.AssessmentQuestionSchema.optional(),
        assessment: exports.AssessmentResponseSchema.optional(),
    }),
    updatedProfile: exports.AssessmentProfileSchema,
    metadata: zod_1.z.object({
        reason: zod_1.z.string().optional(),
        nextSteps: zod_1.z.array(zod_1.z.string()).optional(),
        needs_reset: zod_1.z.boolean().optional(),
        saturation_count: zod_1.z.number().optional(),
        emergency_detected: zod_1.z.boolean().optional(),
    }).optional(),
});
//# sourceMappingURL=triageSchema.js.map