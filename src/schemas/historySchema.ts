import { z } from 'zod';

const AssessmentProfileSchema = z.object({
  age: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  severity: z.string().nullable().optional(),
  progression: z.string().nullable().optional(),
  red_flag_denials: z.string().nullable().optional(),
  summary: z.string(),
  triage_readiness_score: z.number().optional(),
  ambiguity_detected: z.boolean().optional(),
  internal_inconsistency_detected: z.boolean().optional(),
  internal_consistency_score: z.number().optional(),
  red_flags_resolved: z.boolean().optional(),
  uncertainty_accepted: z.boolean().optional(),
  clinical_friction_detected: z.boolean().optional(),
  clinical_friction_details: z.string().nullable().optional(),
  is_complex_case: z.boolean().optional(),
  is_vulnerable: z.boolean().optional(),
  symptom_category: z.enum(['simple', 'complex', 'critical']).optional(),
  denial_confidence: z.enum(['high', 'medium', 'low']).optional(),
  turn_count: z.number().optional(),
  affected_systems: z.array(z.string()).optional(),
  is_recent_resolved: z.boolean().optional(),
  resolved_keyword: z.string().optional(),
  denied_symptoms: z.array(z.string()).optional(),
  covered_symptoms: z.array(z.string()).optional(),
  specific_details: z.record(z.string(), z.any()).nullable().optional(),
  termination_reason: z.string().nullable().optional(),
});

export const ClinicalHistoryPayloadSchema = z.object({
  version: z.string().optional(),
  controlSignal: z.string().optional(),
  aiResponse: z.object({
    text: z.string(),
    question: z.any().optional(),
    assessment: z.any().optional(),
  }).optional(),
  updatedProfile: AssessmentProfileSchema.optional(),
  profile: AssessmentProfileSchema.optional(),
  metadata: z.any().optional(),
  timestamp: z.string().optional(),
});

export const CreateClinicalHistorySchema = z.object({
  payload: ClinicalHistoryPayloadSchema,
});

export type CreateClinicalHistoryInput = z.infer<typeof CreateClinicalHistorySchema>;

export const ClinicalHistoryResponseSchema = z.object({
  id: z.string(),
  healthProfileId: z.string(),
  payload: z.any(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ClinicalHistoryListResponseSchema = z.array(ClinicalHistoryResponseSchema);
