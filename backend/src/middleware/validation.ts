import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { limit, offset } = req.query;

  if (limit && isNaN(Number(limit))) {
    res.status(400).json({ error: 'Limit must be a number' });
    return;
  }

  if (offset && isNaN(Number(offset))) {
    res.status(400).json({ error: 'Offset must be a number' });
    return;
  }

  next();
};

export const validateNearbyParams = (req: Request, res: Response, next: NextFunction) => {
  const { lat, lng, radius } = req.query;

  if (!lat || isNaN(Number(lat))) {
    res.status(400).json({ error: 'Latitude (lat) is required and must be a number' });
    return;
  }

  if (!lng || isNaN(Number(lng))) {
    res.status(400).json({ error: 'Longitude (lng) is required and must be a number' });
    return;
  }

  if (radius && isNaN(Number(radius))) {
    res.status(400).json({ error: 'Radius must be a number' });
    return;
  }

  next();
};

export const validateFacilityId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'Facility ID is required' });
    return;
  }
  next();
};

export const validateFacilityType = (req: Request, res: Response, next: NextFunction) => {
  const { type } = req.params;
  if (!type) {
    res.status(400).json({ error: 'Facility type is required' });
    return;
  }
  next();
};

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};
