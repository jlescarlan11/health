import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing app (which imports routes, which import services, which import prisma)
// Try backend/.env first, then parent directory .env
const envPath = path.resolve(__dirname, '../.env');
const parentEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
if (!process.env.DATABASE_URL) {
  // If DATABASE_URL not found, try parent directory
  dotenv.config({ path: parentEnvPath });
}

import app from './app';

const PORT = process.env.PORT || 3000;

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.on('error', (error: Error) => {
  console.error('Server error:', error);
});