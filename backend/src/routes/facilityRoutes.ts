import { Router } from 'express';
import * as facilityController from '../controllers/facilityController';
import {
  validatePagination,
  validateNearbyParams,
  validateFacilityId,
  validateFacilityType,
} from '../middleware/validation';
import { asyncHandler } from '../utils';

const router = Router();

// GET /api/facilities
router.get('/', validatePagination, asyncHandler(facilityController.listFacilities));

// GET /api/facilities/nearby
router.get('/nearby', validateNearbyParams, asyncHandler(facilityController.listFacilitiesNearby));

// GET /api/facilities/by-type/:type
router.get('/by-type/:type', validateFacilityType, validatePagination, asyncHandler(facilityController.listFacilitiesByType));

// GET /api/facilities/:id
router.get('/:id', validateFacilityId, asyncHandler(facilityController.getFacility));

export default router;
