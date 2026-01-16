import { Request, Response } from 'express';
import * as facilityService from '../services/facilityService';
import { Facility } from '../../generated/prisma/client';

interface FacilityWithDistance extends Facility {
  distance?: number;
}

// Helper to map DB model to Frontend Interface
const mapToFacility = (f: FacilityWithDistance) => {
  const operatingHours = f.operating_hours as Record<string, unknown>;
  const hours =
    operatingHours && typeof operatingHours === 'object'
      ? (operatingHours.description as string) || ''
      : '';

  return {
    id: f.id,
    name: f.name,
    type: f.type,
    services: f.services,
    address: f.address,
    latitude: f.latitude,
    longitude: f.longitude,
    phone: f.phone,
    yakapAccredited: f.yakap_accredited,
    hours: hours,
    operatingHours: f.operating_hours, // Expose full structured data
    photoUrl: f.photos && f.photos.length > 0 ? f.photos[0] : null,
    distance: f.distance, // Preserve if present
    specialized_services: f.specialized_services,
    is_24_7: f.is_24_7,
  };
};

export const listFacilities = async (req: Request, res: Response) => {
  try {
    const { type, yakap_accredited, limit, offset } = req.query;

    const result = await facilityService.getAllFacilities({
      type: type as string,
      yakap_accredited:
        yakap_accredited === 'true' ? true : yakap_accredited === 'false' ? false : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json({
      ...result,
      facilities: result.facilities.map(mapToFacility),
    });
  } catch (error) {
    console.error('Error listing facilities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFacility = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const facility = await facilityService.getFacilityById(id);

    if (!facility) {
      res.status(404).json({ error: 'Facility not found' });
      return;
    }

    res.json(mapToFacility(facility));
  } catch (error) {
    console.error('Error getting facility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listFacilitiesNearby = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, type } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ error: 'Missing latitude or longitude' });
      return;
    }

    const facilities = await facilityService.getFacilitiesNearby({
      latitude: Number(lat),
      longitude: Number(lng),
      radiusInKm: radius ? Number(radius) : 5, // Default 5km radius
      type: type as string,
    });

    res.json(facilities.map(mapToFacility));
  } catch (error) {
    console.error('Error finding nearby facilities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listFacilitiesByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { limit, offset } = req.query;

    const result = await facilityService.getFacilitiesByType(
      type,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );

    res.json({
      ...result,
      facilities: result.facilities.map(mapToFacility),
    });
  } catch (error) {
    console.error('Error listing facilities by type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
