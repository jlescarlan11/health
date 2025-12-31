import prisma from '../lib/prisma';

export const getAllSymptoms = async () => {
  return await prisma.symptom.findMany({
    orderBy: {
      name: 'asc',
    },
  });
};

export const searchSymptoms = async (query: string) => {
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
