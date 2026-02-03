"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalHistoryListResponseSchema = exports.ClinicalHistoryResponseSchema = exports.CreateClinicalHistorySchema = exports.ClinicalHistoryPayloadSchema = void 0;
const zod_1 = require("zod");
const AssessmentProfileSchema = zod_1.z.object({
    age: zod_1.z.string().nullable().optional(),
    duration: zod_1.z.string().nullable().optional(),
    severity: zod_1.z.string().nullable().optional(),
    progression: zod_1.z.string().nullable().optional(),
    red_flag_denials: zod_1.z.string().nullable().optional(),
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
    affected_systems: zod_1.z.array(zod_1.z.string()).optional(),
    is_recent_resolved: zod_1.z.boolean().optional(),
    resolved_keyword: zod_1.z.string().optional(),
    denied_symptoms: zod_1.z.array(zod_1.z.string()).optional(),
    covered_symptoms: zod_1.z.array(zod_1.z.string()).optional(),
    specific_details: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).nullable().optional(),
    termination_reason: zod_1.z.string().nullable().optional(),
});
exports.ClinicalHistoryPayloadSchema = zod_1.z.object({
    version: zod_1.z.string().optional(),
    controlSignal: zod_1.z.string().optional(),
    aiResponse: zod_1.z.object({
        text: zod_1.z.string(),
        question: zod_1.z.any().optional(),
        assessment: zod_1.z.any().optional(),
    }).optional(),
    updatedProfile: AssessmentProfileSchema.optional(),
    profile: AssessmentProfileSchema.optional(),
    metadata: zod_1.z.any().optional(),
    timestamp: zod_1.z.string().optional(),
});
exports.CreateClinicalHistorySchema = zod_1.z.object({
    payload: exports.ClinicalHistoryPayloadSchema,
});
exports.ClinicalHistoryResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    healthProfileId: zod_1.z.string(),
    payload: zod_1.z.any(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.ClinicalHistoryListResponseSchema = zod_1.z.array(exports.ClinicalHistoryResponseSchema);
//# sourceMappingURL=historySchema.js.map