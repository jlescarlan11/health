import { Router } from 'express';
import * as symptomController from '../controllers/symptomController';

const router = Router();

router.get('/', symptomController.getSymptoms);
router.get('/search', symptomController.searchSymptoms);

export default router;
