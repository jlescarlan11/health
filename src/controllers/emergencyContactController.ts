import { Request, Response } from 'express';
import * as emergencyContactService from '../services/emergencyContactService';

export const listEmergencyContacts = async (_req: Request, res: Response) => {
  try {
    const contacts = await emergencyContactService.getAllEmergencyContacts();
    res.json(contacts);
  } catch (error) {
    console.error('Error listing emergency contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listEmergencyContactsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const contacts = await emergencyContactService.getEmergencyContactsByCategory(category);
    res.json(contacts);
  } catch (error) {
    console.error('Error listing emergency contacts by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
