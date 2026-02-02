export * from './triage';
export * from './auth';

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

export interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  scheduled_time: string | null;
  is_active: boolean;
  days_of_week: string[];
}

export interface HealthProfile {
  fullName?: string | null;
  dob?: string | null | Date;
  sex?: string | null;
  bloodType?: string | null;
  philHealthId?: string | null;
  chronicConditions?: string[];
  allergies?: string[];
  surgicalHistory?: string | null;
  familyHistory?: string | null;
}
