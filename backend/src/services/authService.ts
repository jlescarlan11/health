import { Prisma, User } from '../../generated/prisma';
import argon2 from 'argon2';
import jwt, { type SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { PublicUser } from '../types/auth';
import { LoginForm, SexAtBirthValue, SignupPayload } from '../schemas/authSchema';
import { formatIsoDate } from '../utils/dateUtils';
import type { StringValue } from 'ms';

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '1h') as StringValue;
const jwtSignOptions: SignOptions = {
  expiresIn: jwtExpiresIn,
};

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required for authentication');
}

const createPublicUser = (user: User): PublicUser => {
  const dateOfBirth = formatIsoDate(user.dateOfBirth);
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    dateOfBirth,
    sexAtBirth: user.sexAtBirth,
  };
};

const createToken = (user: PublicUser): string =>
  jwt.sign(
    {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      sexAtBirth: user.sexAtBirth,
    },
    jwtSecret,
    jwtSignOptions
  );

const buildError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  return error;
};

export interface AuthResult {
  user: PublicUser;
  token: string;
}

const DEFAULT_SEX_AT_BIRTH: SexAtBirthValue = 'not_specified';

const sanitizePhoneNumber = (value: string): string => value.trim();

const isPhoneNumberUniqueError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

export const signup = async (payload: SignupPayload): Promise<AuthResult> => {
  const hashedPassword = await argon2.hash(payload.password);
  try {
    const user = await prisma.user.create({
      data: {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phoneNumber: sanitizePhoneNumber(payload.phoneNumber),
        dateOfBirth: payload.dateOfBirth,
        sexAtBirth: payload.sexAtBirth ?? DEFAULT_SEX_AT_BIRTH,
        passwordHash: hashedPassword,
        healthProfile: {
          create: {},
        },
      },
    });

    const publicUser = createPublicUser(user);
    return {
      user: publicUser,
      token: createToken(publicUser),
    };
  } catch (error: unknown) {
    if (
      isPhoneNumberUniqueError(error) &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('phoneNumber')
    ) {
      throw buildError('Phone number already in use', 409);
    }
    throw error;
  }
};

export const login = async (payload: LoginForm): Promise<AuthResult> => {
  const phoneNumber = sanitizePhoneNumber(payload.phoneNumber);
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  if (!user) {
    throw buildError('Invalid phone number or password', 401);
  }

  const matches = await argon2.verify(user.passwordHash, payload.password);
  if (!matches) {
    throw buildError('Invalid phone number or password', 401);
  }

  const publicUser = createPublicUser(user);
  return {
    user: publicUser,
    token: createToken(publicUser),
  };
};
