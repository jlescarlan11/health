import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import { requireAuth } from '../middleware/authenticate';
import { apiLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../utils';
import { validateSchema } from '../middleware/validation';
import { TriageAssessmentRequestSchema } from '../schemas/triageSchema';

const router = Router();

// Protect AI routes; authentication must happen before rate limiting
router.use(requireAuth);
router.use(apiLimiter);

router.post('/navigate', asyncHandler(aiController.navigate));
router.post('/plan', asyncHandler(aiController.generateAssessmentPlan));
router.post('/profile', asyncHandler(aiController.extractClinicalProfile));
router.post('/assess', asyncHandler(aiController.assessSymptoms));
router.post('/narrative', asyncHandler(aiController.generateRecommendationNarratives));
router.post('/follow-up', asyncHandler(aiController.generateImmediateFollowUp));
router.post('/refine-plan', aiController.refineAssessmentPlan);
router.post('/expand-assessment', aiController.expandAssessment);
router.post('/bridge', aiController.generateBridgeMessage);
router.post('/refine-question', asyncHandler(aiController.refineQuestion));
router.post(
  '/evaluate-triage',
  validateSchema(TriageAssessmentRequestSchema),
  asyncHandler(aiController.evaluateTriageState),
);
router.post('/chat', asyncHandler(aiController.chat));

export default router;
