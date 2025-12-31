import { Router } from 'express';
import * as yakapController from '../controllers/yakapController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/info', yakapController.getInfo);

// Protected routes
router.post('/enrollment', authenticate, yakapController.enroll);
router.get('/enrollment/:userId', authenticate, yakapController.getStatus);
router.put('/enrollment/:userId/step', authenticate, yakapController.updateStep);
router.put('/enrollment/:userId/complete', authenticate, yakapController.complete);

export default router;
