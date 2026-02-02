"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginSchema = exports.SignupSchema = void 0;
const sexAtBirthValues = ['male', 'female', 'intersex', 'not_specified'];
const zod_1 = require("zod");
const phoneNumberSchema = zod_1.z
    .string()
    .trim()
    .min(7, 'Phone number must contain at least 7 characters')
    .max(32, 'Phone number must not exceed 32 characters')
    .regex(/^[\d+\-().\s]+$/, 'Phone number contains invalid characters');
const dateOfBirthSchema = zod_1.z.preprocess((value) => {
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
}, zod_1.z.date());
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
    sexAtBirth: zod_1.z.enum(sexAtBirthValues),
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
//# sourceMappingURL=authSchema.js.map