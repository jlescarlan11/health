import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '../generated/prisma/client';
import prisma from '../src/lib/prisma';

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

jest.mock('../src/lib/firebase', () => ({
  firebaseAuth: {
    verifyIdToken: jest.fn().mockImplementation((token) => {
      if (token === 'valid-token') {
        return Promise.resolve({ uid: 'test-uid', email: 'test@example.com' });
      }
      return Promise.reject(new Error('Invalid token'));
    }),
  },
  default: {
    auth: () => ({
      verifyIdToken: jest.fn(),
    }),
  },
}));

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
