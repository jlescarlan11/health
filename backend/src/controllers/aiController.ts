import { Request, Response } from 'express';
import * as aiService from '../services/aiService';

export const navigate = async (req: Request, res: Response) => {
  try {
    const { symptoms, age, severity, medical_history } = req.body;

    if (!symptoms) {
      res.status(400).json({ error: 'Symptoms are required' });
      return;
    }

    const result = await aiService.navigate({
      symptoms,
      age,
      severity,
      medical_history,
    });

    res.json(result);
  } catch (error) {
    console.error('Error in AI navigation:', error);
    res.status(500).json({ error: 'AI navigation failed' });
  }
};
