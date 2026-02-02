"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const prisma_1 = require("../../generated/prisma");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    throw new Error('DATABASE_URL environment variable is required');
}
const prismaClientSingleton = () => {
    const pool = new pg_1.Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
    });
    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
    });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    return new prisma_1.PrismaClient({ adapter });
};
const prisma = globalThis.prisma ?? prismaClientSingleton();
exports.default = prisma;
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}
//# sourceMappingURL=prisma.js.map