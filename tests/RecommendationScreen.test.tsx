import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RecommendationScreen from '../src/screens/RecommendationScreen';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  navigationReducer,
  facilitiesReducer,
  offlineReducer,
  settingsReducer,
} from '../src/store';
import { useRoute, useNavigation } from '@react-navigation/native';
import { geminiClient } from '../src/api/geminiClient';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../src/theme';
import * as locationHook from '../src/hooks/useUserLocation';

// Mock dependencies
jest.mock('../src/hooks/useUserLocation', () => ({
  useUserLocation: jest.fn(() => ({
    location: {
      coords: { latitude: 13.6218, longitude: 123.1875 },
      timestamp: Date.now(),
    },
    errorMsg: null,
    permissionStatus: 'granted',
    requestPermission: jest.fn(() => Promise.resolve(true)),
  })),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
  DefaultTheme: {
    colors: {
      primary: 'rgb(0, 122, 255)',
      background: 'rgb(242, 242, 242)',
      card: 'rgb(255, 255, 255)',
      text: 'rgb(28, 28, 30)',
      border: 'rgb(199, 199, 204)',
      notification: 'rgb(255, 59, 48)',
    },
  },
  CommonActions: {
    reset: jest.fn(),
  },
}));

jest.mock('../src/api/geminiClient', () => ({
  geminiClient: {
    assessSymptoms: jest.fn(),
  },
}));

jest.mock('../src/services/emergencyDetector', () => ({
  detectEmergency: jest.fn(() => ({ score: 0, matchedKeywords: [] })),
  COMBINATION_RISKS: [
    {
      symptoms: ['headache', 'blurred vision'],
      severity: 10,
      reason: 'Neurological or hypertensive crisis',
    },
  ],
}));

// Mock MaterialCommunityIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

const mockAssessmentData = {
  symptoms: 'Fever and cough',
  answers: [
    { question: 'How long?', answer: '2 days' },
    { question: 'Any chest pain?', answer: 'No' },
  ],
  extractedProfile: {
    age: '25',
    duration: '2 days',
    severity: 'moderate',
    progression: 'stable',
    red_flag_denials: 'none',
    summary: 'Patient has fever and cough for 2 days.',
    triage_readiness_score: 0.9,
  },
};

const mockFacilities = [
  {
    id: '1',
    name: 'Naga City Hospital',
    type: 'Hospital',
    latitude: 13.6218,
    longitude: 123.1875,
    services: ['Emergency', 'Consultation'],
  },
];

describe('RecommendationScreen', () => {
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRoute as jest.Mock).mockReturnValue({
      params: { assessmentData: mockAssessmentData },
    });
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
    });

    store = configureStore({
      reducer: {
        navigation: navigationReducer,
        facilities: facilitiesReducer,
        offline: offlineReducer,
        settings: settingsReducer,
      } as any,
      preloadedState: {
        facilities: {
          facilities: mockFacilities,
          filteredFacilities: [],
          selectedFacilityId: null,
          userLocation: { latitude: 13.6218, longitude: 123.1875 },
          filters: {},
          isLoading: false,
          error: null,
          total: 1,
          page: 1,
          hasMore: false,
        },
      } as any,
    });
  });

  it('renders loading state initially', () => {
    (geminiClient.assessSymptoms as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );
    expect(getByText('Analyzing symptoms...')).toBeTruthy();
  });

  it('renders recommendation after analysis', async () => {
    const mockResponse = {
      recommended_level: 'health_center',
      user_advice: 'Go to health center',
      clinical_soap: 'SOAP note',
      key_concerns: ['Concern 1'],
      critical_warnings: ['Warning 1'],
      relevant_services: ['Consultation'],
      red_flags: [],
      triage_readiness_score: 0.9,
    };

    (geminiClient.assessSymptoms as jest.Mock).mockResolvedValue(mockResponse);

    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      expect(getByText('Health Center (Primary Care)')).toBeTruthy();
      expect(getByText('Go to health center')).toBeTruthy();
    });
  });

  it('handles analysis error with fallback', async () => {
    (geminiClient.assessSymptoms as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      // Fallback level for low risk is self-care
      expect(getByText('Self Care (Home Management)')).toBeTruthy();
      expect(
        getByText(/condition appears manageable at home/i),
      ).toBeTruthy();
    });
  });
});
