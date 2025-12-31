import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import { apiLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../utils';

const router = Router();

// Apply rate limiting to this route
router.post('/navigate', apiLimiter, asyncHandler(aiController.navigate));

export default router;
