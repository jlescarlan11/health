import { Request, Response } from 'express';
import * as yakapService from '../services/yakapService';

export const getInfo = (_req: Request, res: Response) => {
  try {
    const info = yakapService.getYakapInfo();
    res.json(info);
  } catch (error) {
    console.error('Error fetching YAKAP info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
