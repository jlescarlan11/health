import prisma from '../lib/prisma';
import { EmergencyContact } from '../../generated/prisma/client';

export const getAllEmergencyContacts = async (): Promise<EmergencyContact[]> => {
  return prisma.emergencyContact.findMany({
    orderBy: { name: 'asc' },
  });
};

export const getEmergencyContactsByCategory = async (
  category: string,
): Promise<EmergencyContact[]> => {
  return prisma.emergencyContact.findMany({
    where: { category },
    orderBy: { name: 'asc' },
  });
};
