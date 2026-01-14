// Test Prisma query directly
require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('./generated/prisma/client');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testQuery() {
  try {
    console.log('Testing Prisma query...');

    const result = await prisma.facility.findMany({
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });

    console.log('✓ Query successful!');
    console.log(`Found ${result.length} facilities`);

    const count = await prisma.facility.count();
    console.log(`Total facilities in database: ${count}`);

    if (count === 0) {
      console.log('\n⚠️  Database is empty. You may need to seed it:');
      console.log('   cd backend && npm run seed');
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('Error details:', error);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

testQuery();
