import { Request, Response } from 'express';
import * as historyService from '../services/historyService';

export const transferAssessment = async (req: Request, res: Response) => {
  try {
    const { targetUsername, assessmentData } = req.body;

    if (!targetUsername || typeof targetUsername !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'targetUsername (string) is required',
      });
    }

    if (assessmentData === undefined || assessmentData === null) {
      return res.status(400).json({
        success: false,
        error: 'assessmentData is required',
      });
    }

    const result = await historyService.transferAssessmentResult(targetUsername, assessmentData);

    if (!result.success) {
      return res.status(result.statusCode ?? 500).json({
        success: false,
        error: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      recordId: result.recordId,
    });
  } catch (error) {
    console.error('Unexpected error transferring assessment:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected error while transferring assessment result',
    });
  }
};
