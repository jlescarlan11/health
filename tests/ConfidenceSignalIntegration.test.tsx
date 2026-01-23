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

// Mock dependencies
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
}));

// Mock MaterialCommunityIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

const mockAssessmentData = {
  symptoms: 'Vague malaise',
  answers: [],
  extractedProfile: {
    age: '30',
    duration: '1 week',
    severity: 'mild',
    progression: 'stable',
    red_flag_denials: 'none',
    summary: 'Patient feels vaguely unwell.',
    triage_readiness_score: 0.5, // Low readiness likely triggering conservative logic if implemented in mock
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

describe('ConfidenceSignal Integration', () => {
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

  it('displays ConfidenceSignal when is_conservative_fallback is true', async () => {
    const mockResponse = {
      recommended_level: 'hospital',
      user_advice: 'Go to hospital just in case.',
      clinical_soap: 'SOAP note',
      key_concerns: [],
      critical_warnings: [],
      relevant_services: ['Consultation'],
      red_flags: [],
      triage_readiness_score: 0.6,
      is_conservative_fallback: true, // TRIGGER
    };

    (geminiClient.assessSymptoms as jest.Mock).mockResolvedValue(mockResponse);

    const { getByText, getByLabelText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      expect(getByText('Safety Note')).toBeTruthy();
      expect(getByText(/Recommended higher care level because your symptoms/)).toBeTruthy();
    });
  });

  it('does NOT display ConfidenceSignal when is_conservative_fallback is false', async () => {
    const mockResponse = {
      recommended_level: 'self_care',
      user_advice: 'Rest at home.',
      clinical_soap: 'SOAP note',
      key_concerns: [],
      critical_warnings: [],
      relevant_services: [],
      red_flags: [],
      triage_readiness_score: 0.9,
      is_conservative_fallback: false, // NO TRIGGER
    };

    (geminiClient.assessSymptoms as jest.Mock).mockResolvedValue(mockResponse);

    const { queryByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      expect(queryByText('Safety Note')).toBeNull();
    });
  });

  it('displays specific missing fields in ConfidenceSignal when data is incomplete', async () => {
    const incompleteProfile = {
      ...mockAssessmentData.extractedProfile,
      age: null,
      severity: null,
    };

    (useRoute as jest.Mock).mockReturnValue({
      params: {
        assessmentData: {
          ...mockAssessmentData,
          extractedProfile: incompleteProfile,
        },
      },
    });

    const mockResponse = {
      recommended_level: 'hospital',
      user_advice: 'Go to hospital just in case.',
      clinical_soap: 'SOAP note',
      key_concerns: [],
      critical_warnings: [],
      relevant_services: ['Consultation'],
      red_flags: [],
      triage_readiness_score: 0.6,
      is_conservative_fallback: true,
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
      expect(getByText(/Recommended higher care level because Age and Severity were unclear/)).toBeTruthy();
    });
  });
});
