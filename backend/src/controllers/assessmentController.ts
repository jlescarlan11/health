import { Request, Response } from 'express';
import * as historyService from '../services/historyService';

export const transferAssessment = async (req: Request, res: Response) => {
  try {
    const { targetUsername, targetPhoneNumber, assessmentData } = req.body;

    const rawPhoneNumber =
      typeof targetPhoneNumber === 'string'
        ? targetPhoneNumber
        : typeof targetUsername === 'string'
        ? targetUsername
        : undefined;

    if (!rawPhoneNumber || typeof rawPhoneNumber !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'targetPhoneNumber (string) is required',
      });
    }

    const normalizedPhone = rawPhoneNumber.trim();
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'targetPhoneNumber cannot be empty',
      });
    }

    if (assessmentData === undefined || assessmentData === null) {
      return res.status(400).json({
        success: false,
        error: 'assessmentData is required',
      });
    }

    const result = await historyService.transferAssessmentResult(normalizedPhone, assessmentData);

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
