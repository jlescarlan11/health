import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '../generated/prisma/client';
import prisma from '../src/lib/prisma';

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
