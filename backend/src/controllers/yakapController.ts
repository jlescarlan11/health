import { Request, Response } from 'express';
import * as yakapService from '../services/yakapService';
import { AuthRequest } from '../middleware/auth';

export const getInfo = (_req: Request, res: Response) => {
  try {
    const info = yakapService.getYakapInfo();
    res.json(info);
  } catch (error) {
    console.error('Error fetching YAKAP info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const enroll = async (req: AuthRequest, res: Response) => {
  try {
    const authUserId = req.user?.uid;
    const { user_id, phone_number } = req.body;

    if (!authUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!user_id || !phone_number) {
      res.status(400).json({ error: 'User ID and phone number are required' });
      return;
    }

    if (authUserId !== user_id) {
      res.status(403).json({ error: 'Forbidden: Cannot enroll for another user' });
      return;
    }

    // Check if already enrolled
    const existing = await yakapService.getEnrollmentStatus(user_id);
    if (existing) {
      res.status(409).json({ error: 'User already enrolled', enrollment: existing });
      return;
    }

    const enrollment = await yakapService.enrollUser(user_id, phone_number);
    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Error enrolling user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const paramUserId = req.params.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Ensure user can only check their own status, unless admin (not implemented yet)
    if (userId !== paramUserId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const enrollment = await yakapService.getEnrollmentStatus(userId);
    
    if (!enrollment) {
      res.status(404).json({ error: 'Enrollment not found' });
      return;
    }

    res.json(enrollment);
  } catch (error) {
    console.error('Error fetching enrollment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStep = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const paramUserId = req.params.userId;
    const { step, pathway, documents } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (userId !== paramUserId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (step === undefined) {
      res.status(400).json({ error: 'Step is required' });
      return;
    }

    const updatedEnrollment = await yakapService.updateEnrollmentStep(userId, step, pathway, documents);
    res.json(updatedEnrollment);
  } catch (error) {
    console.error('Error updating enrollment step:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const complete = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const paramUserId = req.params.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (userId !== paramUserId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const completedEnrollment = await yakapService.completeEnrollment(userId);
    res.json(completedEnrollment);
  } catch (error) {
    console.error('Error completing enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
