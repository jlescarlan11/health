import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from '../src/theme';

// Mock dependencies
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        assessmentData: {
          symptoms: 'Headache and foot pain',
          answers: [],
          extractedProfile: {
            clinical_friction_detected: true,
            clinical_friction_details: 'User reports severe headache but denies head pain later.',
            summary: 'Conflicting headache report.',
          },
        },
      },
    }),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector: (state: any) => any) =>
    selector({
      facilities: {
        facilities: [],
        isLoading: false,
        userLocation: null,
      },
      navigation: {
        recommendation: null,
      },
    }),
}));

jest.mock('../src/api/geminiClient', () => ({
  geminiClient: {
    assessSymptoms: jest.fn().mockResolvedValue({
      recommended_level: 'health_center',
      user_advice: 'Please visit a health center.',
      clinical_soap: 'SOAP note',
      key_concerns: [],
      critical_warnings: [],
      relevant_services: [],
      red_flags: [],
    }),
  },
}));

// Mock RecommendationScreen import since it is a default export
jest.mock('../src/screens/RecommendationScreen', () => {
  const actual = jest.requireActual('../src/screens/RecommendationScreen');
  return {
    __esModule: true,
    default: actual.default,
  };
});

describe('RecommendationScreen - Clinical Friction', () => {
  it('renders the Clinical Context alert when friction is detected', async () => {
    const RecommendationScreenComponent = require('../src/screens/RecommendationScreen').default;

    const { findByText, getByText } = render(
      <PaperProvider theme={theme}>
        <RecommendationScreenComponent />
      </PaperProvider>,
    );

    // Check for the alert title
    const alertTitle = await findByText('CLINICAL CONTEXT');
    expect(alertTitle).toBeTruthy();

    // Check for the specific friction details
    const frictionText = getByText('User reports severe headache but denies head pain later.');
    expect(frictionText).toBeTruthy();
  });
});
