import { Request, Response } from 'express';
import * as symptomService from '../services/symptomService';

export const getSymptoms = async (_req: Request, res: Response) => {
  try {
    const symptoms = await symptomService.getAllSymptoms();
    res.json(symptoms);
  } catch (error) {
    console.error('Error fetching symptoms:', error);
    res.status(500).json({ error: 'Failed to fetch symptoms' });
  }
};

export const searchSymptoms = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const symptoms = await symptomService.searchSymptoms(q);
    res.json(symptoms);
  } catch (error) {
    console.error('Error searching symptoms:', error);
    res.status(500).json({ error: 'Failed to search symptoms' });
  }
};
