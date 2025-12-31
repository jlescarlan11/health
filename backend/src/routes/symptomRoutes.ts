import { Router, Request, Response, NextFunction } from 'express';
import * as symptomController from '../controllers/symptomController';
import { asyncHandler } from '../utils';

const router = Router();

router.get('/', asyncHandler(symptomController.getSymptoms));
router.get('/search', asyncHandler(symptomController.searchSymptoms));

export default router;
