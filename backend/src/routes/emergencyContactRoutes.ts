import { Router } from 'express';
import * as emergencyContactController from '../controllers/emergencyContactController';
import { asyncHandler } from '../utils';

const router = Router();

// GET /api/emergency-contacts
router.get('/', asyncHandler(emergencyContactController.listEmergencyContacts));

// GET /api/emergency-contacts/by-category/:category
router.get('/by-category/:category', asyncHandler(emergencyContactController.listEmergencyContactsByCategory));

export default router;
