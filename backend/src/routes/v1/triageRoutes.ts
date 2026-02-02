import { Router } from 'express';
import * as triageController from '../../controllers/triageController';
import { validateSchema } from '../../middleware/validation';
import { TriageAssessmentRequestSchema } from '../../schemas/triageSchema';

const router = Router();

router.post('/assess', validateSchema(TriageAssessmentRequestSchema), triageController.assessV1);

export default router;
