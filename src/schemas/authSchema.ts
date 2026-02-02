import { z } from 'zod';
import {
  coerceIsoDate,
  FUTURE_DATE_MESSAGE,
  RANGE_DATE_MESSAGE,
  AGE_REQUIREMENT_MESSAGE,
  meetsMinimumAgeRequirement,
  isDateInFuture,
  HAS_MINIMUM_AGE_REQUIREMENT,
  MINIMUM_DOB_YEAR,
} from '../utils/dateUtils';

const sexAtBirthValues = ['male', 'female', 'intersex', 'not_specified'] as const;
export type SexAtBirthValue = (typeof sexAtBirthValues)[number];

const phoneNumberSchema = z
  .string()
  .trim()
  .min(7, 'Phone number must contain at least 7 characters')
  .max(32, 'Phone number must not exceed 32 characters')
  .regex(/^[\d+\-().\s]+$/, 'Phone number contains invalid characters');

const minimumAllowedIso = new Date(Date.UTC(MINIMUM_DOB_YEAR, 0, 1));
const dateOfBirthSchemaBase = z.date();

let dateOfBirthSchema = z.preprocess((value) => coerceIsoDate(value), dateOfBirthSchemaBase)
  .refine(
    (date) => !isDateInFuture(date),
    { message: FUTURE_DATE_MESSAGE },
  )
  .refine(
    (date) => !date.getTime() || date.getTime() >= minimumAllowedIso.getTime(),
    { message: RANGE_DATE_MESSAGE },
  );

if (HAS_MINIMUM_AGE_REQUIREMENT && AGE_REQUIREMENT_MESSAGE) {
  dateOfBirthSchema = dateOfBirthSchema.refine(
    (date) => meetsMinimumAgeRequirement(date),
    { message: AGE_REQUIREMENT_MESSAGE },
  );
}

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

/**
 * Backend signup contract:
 * - firstName (string, required, trimmed, minimum 1 character)
 * - lastName (string, required, trimmed, minimum 1 character)
 * - phoneNumber (string, required, trimmed, between 7 and 32 characters, digits and + - . parentheses/spaces allowed)
 * - dateOfBirth (string or Date, required, parsed to a Date instance; ISO 8601 date-only string in YYYY-MM-DD)
 * - sexAtBirth (optional enum: 'male' | 'female' | 'intersex' | 'not_specified'; defaults to 'not_specified' server-side)
 * - password (string, required, 8-128 characters)
 * - confirmPassword (string, required for validation only; not accepted by the signup payload)
 */
export const SignupSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    phoneNumber: phoneNumberSchema,
    dateOfBirth: dateOfBirthSchema,
    sexAtBirth: z.enum(sexAtBirthValues).optional(),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

export const LoginSchema = z.object({
  phoneNumber: phoneNumberSchema,
  password: passwordSchema,
});

export type SignupForm = z.infer<typeof SignupSchema>;
export type SignupPayload = Omit<SignupForm, 'confirmPassword'>;
export type LoginForm = z.infer<typeof LoginSchema>;
