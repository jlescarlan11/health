// Quick test script to check database connection
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in .env file');
  process.exit(1);
}

console.log('Testing database connection...');
console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false },
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Error details:', err);
    process.exit(1);
  } else {
    console.log('✓ Database connection successful!');
    console.log('Current time from DB:', res.rows[0].now);
    
    // Test Facility table
    pool.query('SELECT COUNT(*) FROM "Facility"', (err, res) => {
      if (err) {
        console.error('❌ Error querying Facility table:', err.message);
        console.log('Note: This might mean the table does not exist. Run migrations: npx prisma migrate deploy');
      } else {
        console.log(`✓ Facility table exists with ${res.rows[0].count} records`);
      }
      pool.end();
    });
  }
});

