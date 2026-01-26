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
import cron from 'node-cron';
import { healthFeedService } from './services/healthFeedService';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initial sync on startup
  healthFeedService.syncHealthNews().catch(err => console.error('Initial feed sync failed:', err));
  
  // Schedule sync every 24 hours at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled health news sync...');
    healthFeedService.syncHealthNews();
  });
});

server.on('error', (error: Error) => {
  console.error('Server error:', error);
});