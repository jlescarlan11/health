import prisma from '../lib/prisma';
import { Symptom } from '../../generated/prisma/client';

export const getAllSymptoms = async (): Promise<Symptom[]> => {
  return await prisma.symptom.findMany({
    orderBy: {
      name: 'asc',
    },
  });
};

export const searchSymptoms = async (query: string): Promise<Symptom[]> => {
  return await prisma.symptom.findMany({
    where: {
      OR: [
        {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          keywords: {
            has: query.toLowerCase(),
          },
        },
      ],
    },
    orderBy: {
      name: 'asc',
    },
  });
};
