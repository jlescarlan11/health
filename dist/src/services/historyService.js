"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHistory = exports.getUserHistory = exports.createHistory = exports.transferAssessmentResult = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const SYSTEM_CATEGORY_MAP = {
    Cardiac: 'Cardiac',
    Respiratory: 'Respiratory',
    Neurological: 'Neurological',
    'Acute Abdomen': 'AcuteAbdomen',
    Trauma: 'Trauma',
};
const isPlainRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const normalizeNullableString = (value) => {
    if (value === null) {
        return null;
    }
    if (typeof value === 'string') {
        return value;
    }
    return undefined;
};
const normalizeBoolean = (value) => typeof value === 'boolean' ? value : undefined;
const normalizeNumber = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
        return undefined;
    }
    return value;
};
const normalizeInteger = (value) => {
    const numericValue = normalizeNumber(value);
    if (numericValue === undefined) {
        return undefined;
    }
    return Math.trunc(numericValue);
};
const normalizeStringArray = (value) => {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const normalized = value.filter((item) => typeof item === 'string');
    return normalized.length ? normalized : undefined;
};
const normalizeSystemCategories = (value) => {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const normalized = value
        .map((item) => {
        if (typeof item !== 'string') {
            return undefined;
        }
        return SYSTEM_CATEGORY_MAP[item];
    })
        .filter((category) => Boolean(category));
    return normalized.length ? normalized : undefined;
};
const isSymptomCategory = (value) => value === 'simple' || value === 'complex' || value === 'critical';
const isDenialConfidence = (value) => value === 'high' || value === 'medium' || value === 'low';
const extractAssessmentProfileCandidate = (assessmentData) => {
    if (!isPlainRecord(assessmentData)) {
        return null;
    }
    const payload = assessmentData.updatedProfile ??
        assessmentData.profile ??
        assessmentData;
    if (!isPlainRecord(payload)) {
        return null;
    }
    return payload;
};
const assignIfDefined = (target, key, value) => {
    if (value !== undefined) {
        target[key] = value;
    }
};
const buildAssessmentProfileCreatePayload = (profile) => {
    const data = {
        summary: typeof profile.summary === 'string' && profile.summary.trim()
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
    assignIfDefined(data, 'internal_inconsistency_detected', normalizeBoolean(profile.internal_inconsistency_detected));
    assignIfDefined(data, 'internal_consistency_score', normalizeNumber(profile.internal_consistency_score));
    assignIfDefined(data, 'red_flags_resolved', normalizeBoolean(profile.red_flags_resolved));
    assignIfDefined(data, 'uncertainty_accepted', normalizeBoolean(profile.uncertainty_accepted));
    assignIfDefined(data, 'clinical_friction_detected', normalizeBoolean(profile.clinical_friction_detected));
    assignIfDefined(data, 'clinical_friction_details', normalizeNullableString(profile.clinical_friction_details));
    assignIfDefined(data, 'is_complex_case', normalizeBoolean(profile.is_complex_case));
    assignIfDefined(data, 'is_vulnerable', normalizeBoolean(profile.is_vulnerable));
    assignIfDefined(data, 'symptom_category', isSymptomCategory(profile.symptom_category) ? profile.symptom_category : undefined);
    assignIfDefined(data, 'denial_confidence', isDenialConfidence(profile.denial_confidence) ? profile.denial_confidence : undefined);
    assignIfDefined(data, 'turn_count', normalizeInteger(profile.turn_count));
    assignIfDefined(data, 'affected_systems', normalizeSystemCategories(profile.affected_systems));
    assignIfDefined(data, 'is_recent_resolved', normalizeBoolean(profile.is_recent_resolved));
    assignIfDefined(data, 'resolved_keyword', normalizeNullableString(profile.resolved_keyword));
    assignIfDefined(data, 'denied_symptoms', normalizeStringArray(profile.denied_symptoms));
    assignIfDefined(data, 'covered_symptoms', normalizeStringArray(profile.covered_symptoms));
    if (profile.specific_details) {
        data.specific_details = { ...profile.specific_details };
    }
    assignIfDefined(data, 'termination_reason', normalizeNullableString(profile.termination_reason));
    return data;
};
const transferAssessmentResult = async (targetPhoneNumber, assessmentData) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { phoneNumber: targetPhoneNumber },
        });
        if (!user) {
            return {
                success: false,
                message: `User with phone number "${targetPhoneNumber}" not found. Please verify the phone number and try again.`,
                statusCode: 404,
            };
        }
        let healthProfile = await prisma_1.default.healthProfile.findUnique({
            where: { userId: user.id },
        });
        if (!healthProfile) {
            healthProfile = await prisma_1.default.healthProfile.create({
                data: {
                    user: {
                        connect: { id: user.id },
                    },
                },
            });
        }
        const payload = assessmentData;
        const profileCandidate = extractAssessmentProfileCandidate(assessmentData);
        const record = await prisma_1.default.clinicalHistoryRecord.create({
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
    }
    catch (error) {
        console.error('Failed to transfer assessment result:', error);
        const message = error instanceof Error ? error.message : 'Failed to persist assessment result';
        return {
            success: false,
            message,
            statusCode: 500,
        };
    }
};
exports.transferAssessmentResult = transferAssessmentResult;
const createHistory = async (userId, payload) => {
    let healthProfile = await prisma_1.default.healthProfile.findUnique({
        where: { userId },
    });
    if (!healthProfile) {
        healthProfile = await prisma_1.default.healthProfile.create({
            data: {
                userId,
            },
        });
    }
    const profileCandidate = extractAssessmentProfileCandidate(payload);
    return prisma_1.default.clinicalHistoryRecord.create({
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
exports.createHistory = createHistory;
const getUserHistory = async (userId) => {
    const healthProfile = await prisma_1.default.healthProfile.findUnique({
        where: { userId },
    });
    if (!healthProfile) {
        return [];
    }
    return prisma_1.default.clinicalHistoryRecord.findMany({
        where: { healthProfileId: healthProfile.id },
        orderBy: { createdAt: 'desc' },
    });
};
exports.getUserHistory = getUserHistory;
const deleteHistory = async (userId, recordId) => {
    const healthProfile = await prisma_1.default.healthProfile.findUnique({
        where: { userId },
    });
    if (!healthProfile) {
        throw new Error('Health profile not found');
    }
    return prisma_1.default.clinicalHistoryRecord.delete({
        where: {
            id: recordId,
            healthProfileId: healthProfile.id,
        },
    });
};
exports.deleteHistory = deleteHistory;
//# sourceMappingURL=historyService.js.map