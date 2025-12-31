import { Request, Response } from 'express';
import * as facilityService from '../services/facilityService';

export const listFacilities = async (req: Request, res: Response) => {
  try {
    const { type, yakap_accredited, limit, offset } = req.query;

    const result = await facilityService.getAllFacilities({
      type: type as string,
      yakap_accredited: yakap_accredited === 'true' ? true : yakap_accredited === 'false' ? false : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json(result);
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

    res.json(facility);
  } catch (error) {
    console.error('Error getting facility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listFacilitiesNearby = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, type } = req.query;

    const facilities = await facilityService.getFacilitiesNearby({
      latitude: Number(lat),
      longitude: Number(lng),
      radiusInKm: radius ? Number(radius) : 5, // Default 5km radius
      type: type as string,
    });

    res.json(facilities);
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
      offset ? Number(offset) : undefined
    );

    res.json(result);
  } catch (error) {
    console.error('Error listing facilities by type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
