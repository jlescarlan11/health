import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { geminiClient } from '../src/api/geminiClient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { navigationReducer, settingsReducer } from '../src/store';

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('../src/services/emergencyDetector', () => ({
  detectEmergency: jest.fn(() => ({ isEmergency: false, matchedKeywords: [], affectedSystems: [] })),
}));

jest.mock('../src/services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: jest.fn(() => ({ isCrisis: false, matchedKeywords: [] })),
}));

jest.mock('../src/components/common', () => {
  const React = require('react');
  const { View, TextInput, TouchableOpacity, Text } = require('react-native');

  return {
    InputCard: ({ value, onChangeText, onSubmit }: any) => (
      <View>
        <TextInput testID="input-field" value={value} onChangeText={onChangeText} />
        <TouchableOpacity testID="submit-button" onPress={onSubmit}>
          <Text>Send</Text>
        </TouchableOpacity>
      </View>
    ),
    TypingIndicator: () => <View testID="typing-indicator" />,
    ProgressBar: () => <View testID="progress-bar" />,
    MultiSelectChecklist: () => <View testID="multi-select-checklist" />,
  };
});

jest.mock('../src/components/common/StandardHeader', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return {
    __esModule: true,
    default: () => (
      <View testID="header">
        <Text>Symptom Assessment</Text>
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

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

describe('SymptomAssessmentScreen bridge path', () => {
  let store: any;
  let planSpy: jest.SpyInstance;
  let profileSpy: jest.SpyInstance;
  let streamSpy: jest.SpyInstance;
  let responseSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    planSpy = jest
      .spyOn(geminiClient, 'generateAssessmentPlan')
      .mockResolvedValue({ questions: [], intro: '' });
    profileSpy = jest
      .spyOn(geminiClient, 'extractClinicalProfile')
      .mockResolvedValue({
        triage_readiness_score: 0.7,
        symptom_category: 'simple',
        ambiguity_detected: false,
        clinical_friction_detected: false,
      } as any);
    streamSpy = jest.spyOn(geminiClient, 'streamGeminiResponse');
    responseSpy = jest.spyOn(geminiClient, 'getGeminiResponse');

    (useNavigation as jest.Mock).mockReturnValue({
      replace: jest.fn(),
      goBack: jest.fn(),
    });
    (useRoute as jest.Mock).mockReturnValue({
      params: { initialSymptom: 'Headache' },
    });

    store = configureStore({
      reducer: combineReducers({
        navigation: navigationReducer,
        settings: settingsReducer,
      }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('bridges to the next question without invoking Gemini when readiness is high', async () => {
    const plan = [
      { id: 'age', text: 'How old are you?', tier: 1 },
      { id: 'duration', text: 'How long has this been happening?', tier: 1 },
    ];
    planSpy.mockResolvedValue({ questions: plan, intro: 'Intro' });

    const { getByText, getByTestId } = render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>,
    );

    await waitFor(() => expect(getByText(/How old are you\?/)).toBeTruthy());

    const input = getByTestId('input-field');
    const submit = getByTestId('submit-button');

    await act(async () => {
      fireEvent.changeText(input, '25');
      fireEvent.press(submit);
    });

    const bridgePattern = /Thanks for sharing that 25\. How long has this been happening\?/;
    await waitFor(() => expect(getByText(bridgePattern)).toBeTruthy());

    expect(streamSpy).not.toHaveBeenCalled();
    expect(responseSpy).not.toHaveBeenCalled();
  });
});
