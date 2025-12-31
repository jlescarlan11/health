import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply rate limiting to this route
router.post('/navigate', apiLimiter, aiController.navigate);

export default router;
