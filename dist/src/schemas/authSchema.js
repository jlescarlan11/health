"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshSchema = exports.LoginSchema = exports.SignupSchema = void 0;
const zod_1 = require("zod");
const dateUtils_1 = require("../utils/dateUtils");
const sexAtBirthValues = ['male', 'female', 'intersex', 'not_specified'];
const phoneNumberSchema = zod_1.z
    .string()
    .trim()
    .min(7, 'Phone number must contain at least 7 characters')
    .max(32, 'Phone number must not exceed 32 characters')
    .regex(/^[\d+\-().\s]+$/, 'Phone number contains invalid characters');
const minimumAllowedIso = new Date(Date.UTC(dateUtils_1.MINIMUM_DOB_YEAR, 0, 1));
const dateOfBirthSchemaBase = zod_1.z.date();
let dateOfBirthSchema = zod_1.z.preprocess((value) => (0, dateUtils_1.coerceIsoDate)(value), dateOfBirthSchemaBase)
    .refine((date) => !(0, dateUtils_1.isDateInFuture)(date), { message: dateUtils_1.FUTURE_DATE_MESSAGE })
    .refine((date) => !date.getTime() || date.getTime() >= minimumAllowedIso.getTime(), { message: dateUtils_1.RANGE_DATE_MESSAGE });
if (dateUtils_1.HAS_MINIMUM_AGE_REQUIREMENT && dateUtils_1.AGE_REQUIREMENT_MESSAGE) {
    dateOfBirthSchema = dateOfBirthSchema.refine((date) => (0, dateUtils_1.meetsMinimumAgeRequirement)(date), { message: dateUtils_1.AGE_REQUIREMENT_MESSAGE });
}
const passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters');
exports.SignupSchema = zod_1.z
    .object({
    firstName: zod_1.z.string().trim().min(1, 'First name is required'),
    lastName: zod_1.z.string().trim().min(1, 'Last name is required'),
    phoneNumber: phoneNumberSchema,
    dateOfBirth: dateOfBirthSchema,
    sexAtBirth: zod_1.z.enum(sexAtBirthValues).optional(),
    password: passwordSchema,
    confirmPassword: passwordSchema,
})
    .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
});
exports.LoginSchema = zod_1.z.object({
    phoneNumber: phoneNumberSchema,
    password: passwordSchema,
});
exports.RefreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
//# sourceMappingURL=authSchema.js.map