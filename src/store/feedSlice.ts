import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'immunization' | 'health-drive' | 'general';
  location?: string;
}

interface FeedState {
  campaigns: Campaign[];
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    title: 'Barangay Immunization Drive',
    description: 'Free measles and polio vaccines for children under 5. Bring your baby book.',
    date: '2026-02-15',
    type: 'immunization',
    location: 'Conception Pequeña Health Center',
  },
  {
    id: '2',
    title: 'Dengue Awareness & Cleanup',
    description: 'Community-wide cleanup drive to prevent mosquito breeding. Fogging scheduled for afternoon.',
    date: '2026-02-20',
    type: 'health-drive',
    location: 'Naga City Plaza',
  },
  {
    id: '3',
    title: 'Senior Citizen Wellness Check',
    description: 'Free blood pressure and blood sugar screening for seniors.',
    date: '2026-02-25',
    type: 'general',
    location: 'Pacol Barangay Hall',
  },
];

const initialState: FeedState = {
  campaigns: MOCK_CAMPAIGNS,
};

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    addCampaign: (state, action: PayloadAction<Campaign>) => {
      state.campaigns.unshift(action.payload);
    },
    removeCampaign: (state, action: PayloadAction<string>) => {
      state.campaigns = state.campaigns.filter((c) => c.id !== action.payload);
    },
  },
});

export const { addCampaign, removeCampaign } = feedSlice.actions;
export default feedSlice.reducer;
