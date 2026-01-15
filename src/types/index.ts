export * from './navigation';
export * from './triage';

export interface Facility {
  id: string;
  name: string;
  type: string;
  services: string[];
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  yakapAccredited: boolean;
  hours?: string;
  operatingHours?: {
    is24x7: boolean;
    open?: string; // Legacy/Simple
    close?: string; // Legacy/Simple
    description?: string;
    schedule?: Record<number, { open: string; close: string } | null>;
  };
  photoUrl?: string;
  distance?: number; // Optional calculated field
}

export interface EmergencyContact {
  id: string;
  name: string;
  category: string;
  phone: string;
  available24x7: boolean;
  description?: string;
}
