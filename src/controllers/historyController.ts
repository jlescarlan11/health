import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import * as historyService from '../services/historyService';
import { 
  CreateClinicalHistorySchema, 
  ClinicalHistoryResponseSchema,
  ClinicalHistoryListResponseSchema 
} from '../schemas/historySchema';

export const createHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User context missing' });
    }

    const validatedData = CreateClinicalHistorySchema.parse(req.body);
    const record = await historyService.createHistory(req.user.sub, validatedData.payload);

    const validatedResponse = ClinicalHistoryResponseSchema.parse({
      ...record,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });

    return res.status(201).json(validatedResponse);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User context missing' });
    }

    const history = await historyService.getUserHistory(req.user.sub);
    
    const validatedResponse = ClinicalHistoryListResponseSchema.parse(
      history.map(record => ({
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }))
    );

    return res.json(validatedResponse);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(500).json({ error: 'Response validation failed', details: error.errors });
    }
    console.error('Get history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User context missing' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Record ID is required' });
    }

    await historyService.deleteHistory(req.user.sub, id);
    return res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found or not owned by user' });
    }
    console.error('Delete history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
