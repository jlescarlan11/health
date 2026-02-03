import { Router } from 'express';
import assessmentRoutes from './assessmentRoutes';
import triageRoutes from './triageRoutes';
import facilityRoutes from './facilityRoutes';
import symptomRoutes from './symptomRoutes';
import aiRoutes from './aiRoutes';
import yakapRoutes from './yakapRoutes';
import emergencyContactRoutes from './emergencyContactRoutes';
import healthFeedRoutes from './healthFeedRoutes';
import triageRoutesV1 from './v1/triageRoutes';
import authRoutes from './authRoutes';
import historyRoutes from './historyRoutes';
import profileRoutes from './profileRoutes';

const router = Router();

// Versioned Routes
router.use('/v1/triage', triageRoutesV1);

// Legacy/Unversioned Routes
router.use('/assessments', assessmentRoutes);
router.use('/triage', triageRoutes);
router.use('/facilities', facilityRoutes);
router.use('/symptoms', symptomRoutes);
router.use('/ai', aiRoutes);
router.use('/yakap', yakapRoutes);
router.use('/emergency-contacts', emergencyContactRoutes);
router.use('/feed', healthFeedRoutes);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/history', historyRoutes);

export default router;
