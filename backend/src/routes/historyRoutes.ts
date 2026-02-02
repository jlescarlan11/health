import { Router } from 'express';
import * as historyController from '../controllers/historyController';
import { requireAuth } from '../middleware/authenticate';

const router = Router();

// All history routes require authentication
router.use(requireAuth as any);

router.post('/', historyController.createHistory);
router.get('/', historyController.getHistory);
router.delete('/:id', historyController.deleteHistory);

export default router;
