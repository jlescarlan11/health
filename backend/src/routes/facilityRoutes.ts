import { Router } from 'express';
import * as facilityController from '../controllers/facilityController';
import {
  validatePagination,
  validateNearbyParams,
  validateFacilityId,
  validateFacilityType,
} from '../middleware/validation';

const router = Router();

// GET /api/facilities
router.get('/', validatePagination, facilityController.listFacilities);

// GET /api/facilities/nearby
router.get('/nearby', validateNearbyParams, facilityController.listFacilitiesNearby);

// GET /api/facilities/by-type/:type
router.get('/by-type/:type', validateFacilityType, validatePagination, facilityController.listFacilitiesByType);

// GET /api/facilities/:id
router.get('/:id', validateFacilityId, facilityController.getFacility);

export default router;
