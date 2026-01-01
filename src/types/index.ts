export * from './navigation';

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
