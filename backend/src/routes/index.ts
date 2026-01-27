import { Router } from 'express';
import assessmentRoutes from './assessmentRoutes';
import facilityRoutes from './facilityRoutes';
import symptomRoutes from './symptomRoutes';
import aiRoutes from './aiRoutes';
import yakapRoutes from './yakapRoutes';
import emergencyContactRoutes from './emergencyContactRoutes';
import healthFeedRoutes from './healthFeedRoutes';

const router = Router();

router.use('/assessments', assessmentRoutes);
router.use('/facilities', facilityRoutes);
router.use('/symptoms', symptomRoutes);
router.use('/ai', aiRoutes);
router.use('/yakap', yakapRoutes);
router.use('/emergency-contacts', emergencyContactRoutes);
router.use('/feed', healthFeedRoutes);

export default router;
