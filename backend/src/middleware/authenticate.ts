import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthTokenPayload } from '../types/auth';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required for authentication middleware');
}

const extractToken = (header?: string): string | null => {
  if (!header) {
    return null;
  }
  const [scheme, value] = header.split(' ');
  if (scheme.toLowerCase() !== 'bearer' || !value) {
    return null;
  }
  return value.trim();
};

const isAuthPayload = (value: unknown): value is AuthTokenPayload =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as AuthTokenPayload).sub === 'string';

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!isAuthPayload(payload)) {
      throw new Error('Invalid token payload');
    }
    req.user = payload;
    return next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};
