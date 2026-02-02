import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ZodSchema, ZodError, ZodIssue } from 'zod';

export const validateSchema = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue: ZodIssue) => ({
        path: issue.path,
        message: issue.message,
      }));
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Schema validation failed:', issues);
      }
      res.status(400).json({
        error: 'Validation failed',
        details: issues,
      });
      return;
    }
    res.status(500).json({ error: 'Internal server error during validation' });
  }
};

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
