import { Router } from 'express';
import * as yakapController from '../controllers/yakapController';

const router = Router();

router.get('/info', yakapController.getInfo);

export default router;
