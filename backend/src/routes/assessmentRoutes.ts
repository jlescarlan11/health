import { Router } from 'express';
import { transferAssessment } from '../controllers/assessmentController';

const router = Router();

router.post('/transfer', transferAssessment);

export default router;
