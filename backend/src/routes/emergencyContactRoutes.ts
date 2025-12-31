import { Router } from 'express';
import * as emergencyContactController from '../controllers/emergencyContactController';

const router = Router();

// GET /api/emergency-contacts
router.get('/', emergencyContactController.listEmergencyContacts);

// GET /api/emergency-contacts/by-category/:category
router.get('/by-category/:category', emergencyContactController.listEmergencyContactsByCategory);

export default router;
