import React from 'react';
import { View, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { PaperProvider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { navigationReducer, settingsReducer } from '../src/store';
import { theme } from '../src/theme';
import { geminiClient } from '../src/api/geminiClient';
import { detectEmergency } from '../src/services/emergencyDetector';
import { detectMentalHealthCrisis } from '../src/services/mentalHealthDetector';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn().mockImplementation((effect: () => void) => effect()),
  DefaultTheme: {
    colors: {
      primary: '#000000',
      background: '#ffffff',
      card: '#ffffff',
      text: '#000000',
      border: '#ffffff',
    },
  },
}));

jest.mock('../src/services/emergencyDetector', () => ({
  detectEmergency: jest.fn(),
}));

jest.mock('../src/services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: jest.fn(),
}));

jest.mock('../src/api/geminiClient', () => ({
  geminiClient: {
    generateAssessmentPlan: jest.fn(),
  },
}));

jest.mock('../src/components/common', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    InputCard: React.forwardRef((props: any, ref: any) => <View ref={ref} {...props} />),
    TypingIndicator: () => <View />,
    ProgressBar: () => <View />,
    MultiSelectChecklist: () => <View />,
  };
});

jest.mock('../src/components/common/StandardHeader', () => {
  const { View, Text } = require('react-native');

  return {
    __esModule: true,
    default: ({ title }: { title: string }) => (
      <View>
        <Text>{title}</Text>
      </View>
    ),
  };
});

jest.mock('../src/services/speechService', () => ({
  speechService: {
    stopListening: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe('SymptomAssessmentScreen offline triage', () => {
  let store: any;
  let replaceMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    replaceMock = jest.fn();

    (detectEmergency as jest.Mock).mockReturnValue({
      isEmergency: false,
      matchedKeywords: [],
    });
    (detectMentalHealthCrisis as jest.Mock).mockReturnValue({
      isCrisis: false,
      matchedKeywords: [],
    });
    (geminiClient.generateAssessmentPlan as jest.Mock).mockResolvedValue({
      questions: [],
      intro: '',
    });

    const netInfoFetchMock = NetInfo.fetch as jest.Mock;
    netInfoFetchMock.mockReset();
    netInfoFetchMock.mockResolvedValue({ isConnected: false });

    (useRoute as jest.Mock).mockReturnValue({
      params: { initialSymptom: 'Sharp chest pain' },
    });
    (useNavigation as jest.Mock).mockReturnValue({
      replace: replaceMock,
      goBack: jest.fn(),
      dispatch: jest.fn(),
      navigate: jest.fn(),
      setOptions: jest.fn(),
    });

    store = configureStore({
      reducer: combineReducers({
        navigation: navigationReducer,
        settings: settingsReducer,
      }),
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('falls back to deterministic offline triage when initialization cannot reach the AI', async () => {
    const { getByText } = render(
      <ReduxProvider store={store}>
        <PaperProvider theme={theme}>
          <SymptomAssessmentScreen />
        </PaperProvider>
      </ReduxProvider>,
    );

    await waitFor(() => expect(getByText(/Offline Emergency Check/)).toBeTruthy());

    await waitFor(() => expect(getByText(/Are any of these emergency signs present/)).toBeTruthy());

    fireEvent.press(getByText('No'));
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(getByText(/severe chest pain\/pressure/)).toBeTruthy());

    fireEvent.press(getByText('Yes'));
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());

    expect(replaceMock).toHaveBeenCalledWith(
      'Recommendation',
      expect.objectContaining({
        assessmentData: expect.objectContaining({
          symptoms: 'Sharp chest pain',
          answers: [
            expect.objectContaining({
              question: 'Offline Triage',
              answer: expect.stringContaining('heart attack or stroke'),
            }),
          ],
          offlineRecommendation: expect.objectContaining({
            level: 'emergency',
          }),
        }),
      }),
    );
  });
});
