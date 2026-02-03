"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const authenticate_1 = require("../middleware/authenticate");
const dateUtils_1 = require("../utils/dateUtils");
const router = (0, express_1.Router)();
const SEX_AT_BIRTH_VALUES = ['male', 'female', 'intersex', 'not_specified'];
const isSexAtBirthValue = (value) => typeof value === 'string' && SEX_AT_BIRTH_VALUES.includes(value);
const normalizeStringArray = (value) => {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const normalized = value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
    return normalized;
};
const normalizeNullableString = (value) => {
    if (value === null) {
        return null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
    }
    return undefined;
};
const formatHealthProfile = (healthProfile) => {
    if (!healthProfile) {
        return null;
    }
    return {
        id: healthProfile.id,
        chronicConditions: healthProfile.chronic_conditions,
        allergies: healthProfile.allergies,
        currentMedications: healthProfile.current_medications,
        surgicalHistory: healthProfile.surgical_history,
        familyHistory: healthProfile.family_history,
        createdAt: healthProfile.createdAt.toISOString(),
        updatedAt: healthProfile.updatedAt.toISOString(),
    };
};
const formatUserResponse = (user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    dateOfBirth: (0, dateUtils_1.formatIsoDate)(user.dateOfBirth),
    sexAtBirth: user.sexAtBirth,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    healthProfile: formatHealthProfile(user.healthProfile),
});
router.get('/', authenticate_1.requireAuth, async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ error: 'User context missing' });
    }
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            dateOfBirth: true,
            sexAtBirth: true,
            createdAt: true,
            updatedAt: true,
            healthProfile: {
                select: {
                    id: true,
                    userId: true,
                    chronic_conditions: true,
                    allergies: true,
                    current_medications: true,
                    surgical_history: true,
                    family_history: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
    });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.json(formatUserResponse(user));
});
router.put('/', authenticate_1.requireAuth, async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ error: 'User context missing' });
    }
    const { firstName, lastName, dateOfBirth, sexAtBirth, chronicConditions, allergies, currentMedications, surgicalHistory, familyHistory, } = req.body;
    const userUpdateData = {};
    if (typeof firstName === 'string' && firstName.trim()) {
        userUpdateData.firstName = firstName.trim();
    }
    if (typeof lastName === 'string' && lastName.trim()) {
        userUpdateData.lastName = lastName.trim();
    }
    if (dateOfBirth) {
        const parsedDob = (0, dateUtils_1.coerceIsoDate)(dateOfBirth);
        if (parsedDob) {
            userUpdateData.dateOfBirth = parsedDob;
        }
    }
    if (isSexAtBirthValue(sexAtBirth)) {
        userUpdateData.sexAtBirth = sexAtBirth;
    }
    const healthProfileData = {};
    const healthProfileCreateData = {};
    const normalizedChronic = normalizeStringArray(chronicConditions);
    if (normalizedChronic !== undefined) {
        healthProfileData.chronic_conditions = normalizedChronic;
        healthProfileCreateData.chronic_conditions = normalizedChronic;
    }
    const normalizedAllergies = normalizeStringArray(allergies);
    if (normalizedAllergies !== undefined) {
        healthProfileData.allergies = normalizedAllergies;
        healthProfileCreateData.allergies = normalizedAllergies;
    }
    const normalizedCurrentMeds = normalizeStringArray(currentMedications);
    if (normalizedCurrentMeds !== undefined) {
        healthProfileData.current_medications = normalizedCurrentMeds;
        healthProfileCreateData.current_medications = normalizedCurrentMeds;
    }
    const normalizedSurgicalHistory = normalizeNullableString(surgicalHistory);
    if (normalizedSurgicalHistory !== undefined) {
        healthProfileData.surgical_history = normalizedSurgicalHistory;
        healthProfileCreateData.surgical_history = normalizedSurgicalHistory;
    }
    const normalizedFamilyHistory = normalizeNullableString(familyHistory);
    if (normalizedFamilyHistory !== undefined) {
        healthProfileData.family_history = normalizedFamilyHistory;
        healthProfileCreateData.family_history = normalizedFamilyHistory;
    }
    const hasUserUpdates = Object.keys(userUpdateData).length > 0;
    const hasHealthUpdates = Object.keys(healthProfileData).length > 0;
    if (!hasUserUpdates && !hasHealthUpdates) {
        const existing = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                dateOfBirth: true,
                sexAtBirth: true,
                createdAt: true,
                updatedAt: true,
                healthProfile: {
                    select: {
                        id: true,
                        userId: true,
                        chronic_conditions: true,
                        allergies: true,
                        current_medications: true,
                        surgical_history: true,
                        family_history: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });
        if (!existing) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json(formatUserResponse(existing));
    }
    const updatedUser = await prisma_1.default.user.update({
        where: { id: userId },
        data: {
            ...userUpdateData,
            ...(hasHealthUpdates
                ? {
                    healthProfile: {
                        upsert: {
                            create: healthProfileCreateData,
                            update: healthProfileData,
                        },
                    },
                }
                : {}),
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            dateOfBirth: true,
            sexAtBirth: true,
            createdAt: true,
            updatedAt: true,
            healthProfile: {
                select: {
                    id: true,
                    userId: true,
                    chronic_conditions: true,
                    allergies: true,
                    current_medications: true,
                    surgical_history: true,
                    family_history: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
    });
    return res.json(formatUserResponse(updatedUser));
});
exports.default = router;
//# sourceMappingURL=profileRoutes.js.map