export * from './navigation';
export * from './triage';

export type FacilityService =
  | 'Adolescent Health'
  | 'Animal Bite Clinic'
  | 'Blood Bank'
  | 'Clinical Chemistry'
  | 'Clinical Microscopy'
  | 'Consultation'
  | 'Dental'
  | 'Dermatology'
  | 'Dialysis'
  | 'ECG'
  | 'ENT'
  | 'Emergency'
  | 'Eye Center'
  | 'Family Planning'
  | 'General Medicine'
  | 'HIV Treatment'
  | 'Hematology'
  | 'Immunization'
  | 'Internal Medicine'
  | 'Laboratory'
  | 'Maternal Care'
  | 'Mental Health'
  | 'Nutrition Services'
  | 'OB-GYN'
  | 'Pediatrics'
  | 'Primary Care'
  | 'Radiology'
  | 'Surgery'
  | 'X-ray';

export interface Facility {
  id: string;
  name: string;
  type: string;
  services: FacilityService[];
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
