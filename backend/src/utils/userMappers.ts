import { User } from '../../generated/prisma';
import { formatIsoDate } from './dateUtils';
import type { PublicUser } from '../types/auth';

export const toPublicUser = (user: User): PublicUser => {
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
