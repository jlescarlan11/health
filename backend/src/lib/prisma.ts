import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'src/lib/prisma.ts:5',
    message: 'Prisma module loaded - checking DATABASE_URL',
    data: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlLength: process.env.DATABASE_URL?.length || 0,
      allEnvKeys: Object.keys(process.env).filter(
        (k) => k.includes('DATABASE') || k.includes('DB'),
      ),
      cwd: process.cwd(),
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'A',
  }),
}).catch(() => {});
// #endregion
const connectionString = process.env.DATABASE_URL;
// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'src/lib/prisma.ts:8',
    message: 'After reading DATABASE_URL',
    data: {
      connectionString: connectionString || null,
      connectionStringLength: connectionString?.length || 0,
      willThrow: !connectionString,
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'A',
  }),
}).catch(() => {});
// #endregion
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'src/lib/prisma.ts:11',
      message: 'Throwing error - DATABASE_URL missing',
      data: { allEnvKeys: Object.keys(process.env).slice(0, 20) },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A',
    }),
  }).catch(() => {});
  // #endregion
  throw new Error('DATABASE_URL environment variable is required');
}

const prismaClientSingleton = () => {
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false },
    max: 10, // Limit pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
