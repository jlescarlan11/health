import { Request } from 'express';
import { SexAtBirth as PrismaSexAtBirth } from '../../generated/prisma';

export type SexAtBirth = PrismaSexAtBirth;

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  sexAtBirth: SexAtBirth;
}

export interface AuthTokenPayload extends PublicUser {
  sub: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}
