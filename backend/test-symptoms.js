// Test script to check Symptom table and query
require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('./generated/prisma/client');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in .env file');
  process.exit(1);
}

console.log('Testing Symptom table access...');
console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testSymptoms() {
  try {
    console.log('\n1. Testing Prisma client initialization...');
    
    console.log('\n2. Testing Symptom table query...');
    const symptoms = await prisma.symptom.findMany({
      take: 5,
      orderBy: {
        name: 'asc',
      },
    });
    
    console.log('✓ Query successful!');
    console.log(`Found ${symptoms.length} symptoms`);
    
    if (symptoms.length > 0) {
      console.log('\nSample symptoms:');
      symptoms.forEach(s => {
        console.log(`  - ${s.name} (${s.category})`);
      });
    } else {
      console.log('\n⚠️  Symptom table is empty. You may need to seed it:');
      console.log('   cd backend && npm run seed');
    }
    
    const count = await prisma.symptom.count();
    console.log(`\nTotal symptoms in database: ${count}`);
    
    await prisma.$disconnect();
    pool.end();
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    
    // Check if it's a table doesn't exist error
    if (error.message && error.message.includes('does not exist')) {
      console.log('\n⚠️  The Symptom table does not exist. You need to run migrations:');
      console.log('   cd backend && npx prisma migrate deploy');
    }
    
    await prisma.$disconnect().catch(() => {});
    pool.end();
    process.exit(1);
  }
}

testSymptoms();



