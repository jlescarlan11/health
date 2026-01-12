import { Router } from 'express';
import * as yakapController from '../controllers/yakapController';
import { asyncHandler } from '../utils';

const router = Router();

router.get('/info', yakapController.getInfo);

router.post('/enrollment', asyncHandler(yakapController.enroll));
router.get('/enrollment/:userId', asyncHandler(yakapController.getStatus));
router.put('/enrollment/:userId/step', asyncHandler(yakapController.updateStep));
router.put('/enrollment/:userId/complete', asyncHandler(yakapController.complete));

export default router;
