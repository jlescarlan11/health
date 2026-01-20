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
  | 'Stroke Unit'
  | 'Surgery'
  | 'Trauma Care'
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
  specialized_services?: string[];
  is_24_7?: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  category: string;
  phone: string;
  available24x7: boolean;
  description?: string;
}

export interface AssessmentResponse {
  recommended_level: 'self_care' | 'health_center' | 'hospital' | 'emergency';
  follow_up_questions: string[];
  user_advice: string;
  clinical_soap: string;
  key_concerns: string[];
  critical_warnings: string[];
  relevant_services: FacilityService[];
  red_flags: string[];
  triage_readiness_score?: number;
  ambiguity_detected?: boolean;
  is_conservative_fallback?: boolean;
  clinical_friction_details?: Record<string, unknown>;
}
