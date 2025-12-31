import { Router, Request, Response, NextFunction } from 'express';
import facilityRoutes from './facilityRoutes';
import symptomRoutes from './symptomRoutes';
import aiRoutes from './aiRoutes';
import yakapRoutes from './yakapRoutes';
import emergencyContactRoutes from './emergencyContactRoutes';

const router = Router();

router.use('/facilities', facilityRoutes);
router.use('/symptoms', symptomRoutes);
router.use('/ai', aiRoutes);
router.use('/yakap', yakapRoutes);
router.use('/emergency-contacts', emergencyContactRoutes);

export default router;
