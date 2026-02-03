import { Prisma } from '../../generated/prisma';
import argon2 from 'argon2';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { PublicUser } from '../types/auth';
import { LoginForm, SexAtBirthValue, SignupPayload } from '../schemas/authSchema';
import { toPublicUser } from '../utils/userMappers';
import {
  createSessionForUser,
  refreshSession as refreshTokens,
  type RefreshSessionResult,
} from './tokenService';

const buildError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  return error;
};

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
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
        dateOfBirth: new Date(payload.dateOfBirth),
        sexAtBirth: payload.sexAtBirth ?? DEFAULT_SEX_AT_BIRTH,
        passwordHash: hashedPassword,
        healthProfile: {
          create: {},
        },
      },
    });

    const publicUser = toPublicUser(user);
    const session = await createSessionForUser(publicUser);
    return {
      user: publicUser,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
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

  const publicUser = toPublicUser(user);
  const session = await createSessionForUser(publicUser);
  return {
    user: publicUser,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
};

export const refreshSession = (refreshToken: string): Promise<RefreshSessionResult> =>
  refreshTokens(refreshToken);
