import { Router } from 'express';
import { healthFeedController } from '../controllers/healthFeedController';

const router = Router();

// GET /api/feed/health - Get latest health news
router.get('/health', healthFeedController.getFeed);

// POST /api/feed/health/sync - Manually trigger sync
router.post('/health/sync', healthFeedController.triggerSync);

export default router;
