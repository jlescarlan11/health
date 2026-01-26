import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  throw new Error('DATABASE_URL environment variable is required');
}

const prismaClientSingleton = () => {
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false },
    max: 10, // Limit pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000, // Increased to 20s to prevent timeouts
    keepAlive: true, // Enable TCP Keep-Alive to prevent dropped connections
    keepAliveInitialDelayMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
