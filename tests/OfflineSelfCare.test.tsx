import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RecommendationScreen from '../src/screens/RecommendationScreen';
import { Provider as ReduxProvider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  navigationReducer,
  facilitiesReducer,
  offlineReducer,
  settingsReducer,
} from '../src/store';
import { useRoute, useNavigation } from '@react-navigation/native';
import { geminiClient } from '../src/api/geminiClient';
import { detectEmergency } from '../src/services/emergencyDetector';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../src/theme';

// --- MOCKS ---

jest.mock('../src/hooks/useUserLocation', () => ({
  useUserLocation: jest.fn(() => ({
    location: null,
    errorMsg: null,
    permissionStatus: 'denied',
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

jest.mock('../src/services/emergencyDetector', () => {
  const actual = jest.requireActual('../src/services/emergencyDetector');
  return {
    ...actual,
    detectEmergency: jest.fn(),
  };
});

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

const mockAssessmentData = {
  symptoms: 'Mild headache',
  answers: [{ question: 'How severe?', answer: 'Mild' }],
  extractedProfile: {
    age: '25',
    duration: '1 hour',
    severity: 'mild',
    progression: 'stable',
    red_flag_denials: 'none',
    summary: 'Patient has mild headache for 1 hour.',
    triage_readiness_score: 1.0,
    is_vulnerable: false,
  },
};

describe('Offline Self-Care Logic (T-005)', () => {
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
      reducer: combineReducers({
        navigation: navigationReducer,
        facilities: facilitiesReducer,
        offline: offlineReducer,
        settings: settingsReducer,
      }),
      preloadedState: {
        facilities: {
          facilities: [],
          isLoading: false,
        },
      } as any,
    });
  });

  const setupOfflineScenario = (score: number, matchedKeywords: string[] = [], profileOverride = {}) => {
    (geminiClient.assessSymptoms as jest.Mock).mockRejectedValue(new Error('Network Error'));
    (detectEmergency as jest.Mock).mockReturnValue({
      score,
      matchedKeywords,
      affectedSystems: [],
      debugLog: { reasoning: 'Test Reasoning' },
    });
    
    if (Object.keys(profileOverride).length > 0) {
      (useRoute as jest.Mock).mockReturnValue({
        params: { 
          assessmentData: { 
            ...mockAssessmentData, 
            extractedProfile: { ...mockAssessmentData.extractedProfile, ...profileOverride } 
          } 
        },
      });
    }
  };

  it('Score 2 (<=3) with no keywords and NOT vulnerable → Recommended: SELF CARE', async () => {
    setupOfflineScenario(2, []);

    const { getByText, queryByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      expect(getByText('SELF CARE (HOME)')).toBeTruthy();
      expect(getByText(/manageable at home/)).toBeTruthy();
      // Facilities section should be hidden
      expect(queryByText('Recommended Facilities')).toBeNull();
    });
  });

  it('Score 3 (exactly 3) with no keywords and NOT vulnerable → Recommended: SELF CARE', async () => {
    setupOfflineScenario(3, []);

    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      expect(getByText('SELF CARE (HOME)')).toBeTruthy();
    });
  });

  it('Score 4 (>3) → Recommended: HEALTH CENTER (Conservative Fallback)', async () => {
    setupOfflineScenario(4, []);

    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      expect(getByText('HEALTH CENTER (PRIMARY CARE)')).toBeTruthy();
    });
  });

  it('Score 2 but has Matched Keywords → Recommended: HEALTH CENTER (Safety Override)', async () => {
    setupOfflineScenario(2, ['fever']); // Keyword present even if score is low

    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      expect(getByText('HEALTH CENTER (PRIMARY CARE)')).toBeTruthy();
    });
  });

  it('Score 2 but Vulnerable Population → Recommended: HEALTH CENTER (Safety Override)', async () => {
    setupOfflineScenario(2, [], { is_vulnerable: true });

    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      expect(getByText('HEALTH CENTER (PRIMARY CARE)')).toBeTruthy();
    });
  });

  it('Score null/undefined → Recommended: HEALTH CENTER (Error Handling)', async () => {
    setupOfflineScenario(null as any, []);

    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      expect(getByText('HEALTH CENTER (PRIMARY CARE)')).toBeTruthy();
    });
  });
});

describe('UI Consistency (T-006)', () => {
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
      },
    });
  });

  it('handles hyphenated "self-care" level from data source correctly', async () => {
    // Simulate AI or fallback providing hyphenated version
    (geminiClient.assessSymptoms as jest.Mock).mockResolvedValue({
      recommended_level: 'self-care',
      user_advice: 'Rest at home',
      clinical_soap: 'S: headache. A: self-care. P: home.',
      key_concerns: [],
      critical_warnings: [],
      relevant_services: [],
      red_flags: [],
    });

    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      // getCareLevelInfo should normalize it to render correctly
      expect(getByText('SELF CARE (HOME)')).toBeTruthy();
    });
  });

  it('handles underscored "self_care" level from data source correctly', async () => {
    (geminiClient.assessSymptoms as jest.Mock).mockResolvedValue({
      recommended_level: 'self_care',
      user_advice: 'Rest at home',
      clinical_soap: 'S: headache. A: self-care. P: home.',
      key_concerns: [],
      critical_warnings: [],
      relevant_services: [],
      red_flags: [],
    });

    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <RecommendationScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => {
      expect(getByText('SELF CARE (HOME)')).toBeTruthy();
    });
  });
});
