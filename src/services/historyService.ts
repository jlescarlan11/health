import {
  Prisma,
  SystemCategory as PrismaSystemCategory,
  SymptomCategory as PrismaSymptomCategory,
  DenialConfidence as PrismaDenialConfidence,
} from '../../generated/prisma';
import prisma from '../lib/prisma';
import { AssessmentProfile, SystemCategory as TriageSystemCategory } from '../types/triage';

export type AssessmentData = Prisma.JsonValue;

export interface AssessmentTransferResult {
  success: boolean;
  message: string;
  recordId?: string;
  statusCode?: number;
}

const SYSTEM_CATEGORY_MAP: Record<TriageSystemCategory, PrismaSystemCategory> = {
  Cardiac: 'Cardiac',
  Respiratory: 'Respiratory',
  Neurological: 'Neurological',
  'Acute Abdomen': 'AcuteAbdomen',
  Trauma: 'Trauma',
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeNullableString = (value: unknown): string | null | undefined => {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

const normalizeBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
};

const normalizeInteger = (value: unknown): number | undefined => {
  const numericValue = normalizeNumber(value);
  if (numericValue === undefined) {
    return undefined;
  }
  return Math.trunc(numericValue);
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value.filter((item): item is string => typeof item === 'string');
  return normalized.length ? normalized : undefined;
};

const normalizeSystemCategories = (value: unknown): PrismaSystemCategory[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .map((item) => {
      if (typeof item !== 'string') {
        return undefined;
      }
      return SYSTEM_CATEGORY_MAP[item as TriageSystemCategory];
    })
    .filter((category): category is PrismaSystemCategory => Boolean(category));

  return normalized.length ? normalized : undefined;
};

const isSymptomCategory = (value: unknown): value is PrismaSymptomCategory =>
  value === 'simple' || value === 'complex' || value === 'critical';

const isDenialConfidence = (value: unknown): value is PrismaDenialConfidence =>
  value === 'high' || value === 'medium' || value === 'low';

const extractAssessmentProfileCandidate = (
  assessmentData: AssessmentData
): Partial<AssessmentProfile> | null => {
  if (!isPlainRecord(assessmentData)) {
    return null;
  }

  const payload =
    (assessmentData as Record<string, unknown>).updatedProfile ??
    (assessmentData as Record<string, unknown>).profile ??
    assessmentData;

  if (!isPlainRecord(payload)) {
    return null;
  }

  return payload as Partial<AssessmentProfile>;
};

const assignIfDefined = <K extends keyof Prisma.AssessmentProfileCreateWithoutClinicalHistoryRecordInput>(
  target: Prisma.AssessmentProfileCreateWithoutClinicalHistoryRecordInput,
  key: K,
  value: Prisma.AssessmentProfileCreateWithoutClinicalHistoryRecordInput[K] | undefined
) => {
  if (value !== undefined) {
    target[key] = value;
  }
};

const buildAssessmentProfileCreatePayload = (
  profile: Partial<AssessmentProfile>
): Prisma.AssessmentProfileCreateWithoutClinicalHistoryRecordInput => {
  const data: Prisma.AssessmentProfileCreateWithoutClinicalHistoryRecordInput = {
    summary:
      typeof profile.summary === 'string' && profile.summary.trim()
        ? profile.summary.trim()
        : 'No summary provided.',
  };

  assignIfDefined(data, 'age', normalizeNullableString(profile.age));
  assignIfDefined(data, 'duration', normalizeNullableString(profile.duration));
  assignIfDefined(data, 'severity', normalizeNullableString(profile.severity));
  assignIfDefined(data, 'progression', normalizeNullableString(profile.progression));
  assignIfDefined(data, 'red_flag_denials', normalizeNullableString(profile.red_flag_denials));
  assignIfDefined(data, 'triage_readiness_score', normalizeNumber(profile.triage_readiness_score));
  assignIfDefined(data, 'ambiguity_detected', normalizeBoolean(profile.ambiguity_detected));
  assignIfDefined(
    data,
    'internal_inconsistency_detected',
    normalizeBoolean(profile.internal_inconsistency_detected)
  );
  assignIfDefined(data, 'internal_consistency_score', normalizeNumber(profile.internal_consistency_score));
  assignIfDefined(data, 'red_flags_resolved', normalizeBoolean(profile.red_flags_resolved));
  assignIfDefined(data, 'uncertainty_accepted', normalizeBoolean(profile.uncertainty_accepted));
  assignIfDefined(data, 'clinical_friction_detected', normalizeBoolean(profile.clinical_friction_detected));
  assignIfDefined(data, 'clinical_friction_details', normalizeNullableString(profile.clinical_friction_details));
  assignIfDefined(data, 'is_complex_case', normalizeBoolean(profile.is_complex_case));
  assignIfDefined(data, 'is_vulnerable', normalizeBoolean(profile.is_vulnerable));
  assignIfDefined(
    data,
    'symptom_category',
    isSymptomCategory(profile.symptom_category) ? profile.symptom_category : undefined
  );
  assignIfDefined(
    data,
    'denial_confidence',
    isDenialConfidence(profile.denial_confidence) ? profile.denial_confidence : undefined
  );
  assignIfDefined(data, 'turn_count', normalizeInteger(profile.turn_count));
  assignIfDefined(data, 'affected_systems', normalizeSystemCategories(profile.affected_systems));
  assignIfDefined(data, 'is_recent_resolved', normalizeBoolean(profile.is_recent_resolved));
  assignIfDefined(data, 'resolved_keyword', normalizeNullableString(profile.resolved_keyword));
  assignIfDefined(data, 'denied_symptoms', normalizeStringArray(profile.denied_symptoms));
  assignIfDefined(data, 'covered_symptoms', normalizeStringArray(profile.covered_symptoms));

  // Populate specific_details
  if (profile.specific_details) {
    data.specific_details = { ...(profile.specific_details as Record<string, any>) };
  }

  assignIfDefined(data, 'termination_reason', normalizeNullableString(profile.termination_reason));

  return data;
};

/**
 * Transfers an assessment result to a target user's clinical history.
 * Resolves the provided phone number to a user and ensures a HealthProfile exists before persisting.
 * If found, creates a new ClinicalHistory record linked to that profile and an optional nested AssessmentProfile.
 */
export const transferAssessmentResult = async (
  targetPhoneNumber: string,
  assessmentData: AssessmentData
): Promise<AssessmentTransferResult> => {
  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber: targetPhoneNumber },
    });

    if (!user) {
      return {
        success: false,
        message: `User with phone number "${targetPhoneNumber}" not found. Please verify the phone number and try again.`,
        statusCode: 404,
      };
    }

    let healthProfile = await prisma.healthProfile.findUnique({
      where: { userId: user.id },
    });

    if (!healthProfile) {
      healthProfile = await prisma.healthProfile.create({
        data: {
          user: {
            connect: { id: user.id },
          },
        },
      });
    }

    const payload: Prisma.InputJsonValue = assessmentData as Prisma.InputJsonValue;
    const profileCandidate = extractAssessmentProfileCandidate(assessmentData);

    const record = await prisma.clinicalHistoryRecord.create({
      data: {
        healthProfileId: healthProfile.id,
        payload,
        assessmentProfile: profileCandidate
          ? {
              create: buildAssessmentProfileCreatePayload(profileCandidate),
            }
          : undefined,
      },
    });

    return {
      success: true,
      message: 'Assessment result successfully transferred.',
      recordId: record.id,
    };
  } catch (error) {
    console.error('Failed to transfer assessment result:', error);
    const message = error instanceof Error ? error.message : 'Failed to persist assessment result';
    return {
      success: false,
      message,
      statusCode: 500,
    };
  }
};

/**
 * Creates a new clinical history record for an authenticated user.
 */
export const createHistory = async (userId: string, payload: any) => {
  let healthProfile = await prisma.healthProfile.findUnique({
    where: { userId },
  });

  if (!healthProfile) {
    healthProfile = await prisma.healthProfile.create({
      data: {
        userId,
      },
    });
  }

  const profileCandidate = extractAssessmentProfileCandidate(payload);

  return prisma.clinicalHistoryRecord.create({
    data: {
      healthProfileId: healthProfile.id,
      payload,
      assessmentProfile: profileCandidate
        ? {
            create: buildAssessmentProfileCreatePayload(profileCandidate),
          }
        : undefined,
    },
  });
};

/**
 * Retrieves all clinical history records for an authenticated user.
 */
export const getUserHistory = async (userId: string) => {
  const healthProfile = await prisma.healthProfile.findUnique({
    where: { userId },
  });

  if (!healthProfile) {
    return [];
  }

  return prisma.clinicalHistoryRecord.findMany({
    where: { healthProfileId: healthProfile.id },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Deletes a clinical history record for an authenticated user.
 */
export const deleteHistory = async (userId: string, recordId: string) => {
  const healthProfile = await prisma.healthProfile.findUnique({
    where: { userId },
  });

  if (!healthProfile) {
    throw new Error('Health profile not found');
  }

  return prisma.clinicalHistoryRecord.delete({
    where: {
      id: recordId,
      healthProfileId: healthProfile.id,
    },
  });
};
