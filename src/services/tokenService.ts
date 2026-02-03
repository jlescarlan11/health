import crypto from 'crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { AppError } from '../middleware/errorHandler';
import { PublicUser } from '../types/auth';
import { toPublicUser } from '../utils/userMappers';
import prisma from '../lib/prisma';

const jwtAccessSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
const jwtAccessExpiresIn = (process.env.JWT_EXPIRES_IN || '1h') as StringValue;
const jwtRefreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue;

if (!jwtAccessSecret) {
  throw new Error('JWT_SECRET environment variable is required for token management');
}

if (!jwtRefreshSecret) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required for token refresh');
}

const accessTokenOptions: SignOptions = { expiresIn: jwtAccessExpiresIn };
const refreshTokenOptions: SignOptions = { expiresIn: jwtRefreshExpiresIn };

const buildAppError = (message: string, statusCode: number = 401): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  return error;
};

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const getExpirationDateFromToken = (token: string): Date => {
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (decoded?.exp && typeof decoded.exp === 'number') {
    return new Date(decoded.exp * 1000);
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

const persistRefreshToken = async (token: string, userId: string) => {
  const expiresAt = getExpirationDateFromToken(token);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });
};

const createAccessToken = (user: PublicUser): string =>
  jwt.sign(
    {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      sexAtBirth: user.sexAtBirth,
    },
    jwtAccessSecret,
    accessTokenOptions
  );

const createRefreshToken = (userId: string): string =>
  jwt.sign({ sub: userId, type: 'refresh' }, jwtRefreshSecret, refreshTokenOptions);

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshSessionResult extends SessionTokens {
  user: PublicUser;
}

export const createSessionForUser = async (user: PublicUser): Promise<SessionTokens> => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user.id);
  await persistRefreshToken(refreshToken, user.id);
  return { accessToken, refreshToken };
};

export const refreshSession = async (refreshToken: string): Promise<RefreshSessionResult> => {
  if (!refreshToken) {
    throw buildAppError('Refresh token is required', 400);
  }

  let decodedToken: JwtPayload & { sub?: string; type?: string };
  try {
    decodedToken = jwt.verify(refreshToken, jwtRefreshSecret) as JwtPayload & {
      sub?: string;
      type?: string;
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw buildAppError('Refresh token expired', 401);
    }
    throw buildAppError('Invalid refresh token', 401);
  }

  if (decodedToken.type !== 'refresh' || !decodedToken.sub) {
    throw buildAppError('Invalid refresh token', 401);
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });

  if (!storedToken || storedToken.revoked) {
    throw buildAppError('Invalid refresh token', 401);
  }

  if (storedToken.expiresAt && storedToken.expiresAt.getTime() < Date.now()) {
    // Clean up to prevent reuse
    await prisma.refreshToken.update({
      where: { tokenHash: storedToken.tokenHash },
      data: { revoked: true },
    });
    throw buildAppError('Refresh token expired', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: storedToken.userId } });
  if (!user) {
    throw buildAppError('User not found', 401);
  }

  await prisma.refreshToken.update({
    where: { tokenHash: storedToken.tokenHash },
    data: { revoked: true },
  });

  const publicUser = toPublicUser(user);
  const tokens = await createSessionForUser(publicUser);
  return { user: publicUser, ...tokens };
};
