import { Router } from 'express';
import * as yakapController from '../controllers/yakapController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils';

const router = Router();

// Public routes
router.get('/info', yakapController.getInfo);

// Protected routes
router.post('/enrollment', authenticate, asyncHandler(yakapController.enroll));
router.get('/enrollment/:userId', authenticate, asyncHandler(yakapController.getStatus));
router.put('/enrollment/:userId/step', authenticate, asyncHandler(yakapController.updateStep));
router.put('/enrollment/:userId/complete', authenticate, asyncHandler(yakapController.complete));

export default router;
