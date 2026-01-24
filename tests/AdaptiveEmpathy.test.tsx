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

describe('Adaptive Empathy Engine', () => {
  let store: any;
  let planSpy: jest.SpyInstance;
  let profileSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    planSpy = jest
      .spyOn(geminiClient, 'generateAssessmentPlan')
      .mockResolvedValue({ questions: [], intro: '' });
    
    // Ensure readiness is high enough (> 0.4) to trigger local bridging
    profileSpy = jest
      .spyOn(geminiClient, 'extractClinicalProfile')
      .mockResolvedValue({
        triage_readiness_score: 0.8,
        symptom_category: 'simple',
        ambiguity_detected: false,
        clinical_friction_detected: false,
      } as any);

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

  const setupTest = async (questions: any[]) => {
    planSpy.mockResolvedValue({ questions, intro: 'Intro' });
    const utils = render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>,
    );
    // Use regex to find question text within the larger intro block
    const qText = questions[0].text;
    const safePattern = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    await waitFor(() => expect(utils.getByText(safePattern)).toBeTruthy());
    return utils;
  };

  const submitAnswer = async (utils: any, answer: string) => {
    const input = utils.getByTestId('input-field');
    const submit = utils.getByTestId('submit-button');
    
    await act(async () => {
      fireEvent.changeText(input, answer);
    });
    
    await act(async () => {
      fireEvent.press(submit);
    });
  };

  it('responds with Distress empathy for "pain" keyword', async () => {
    const plan = [
      { id: 'q1', text: 'Q1?', tier: 1 },
      { id: 'q2', text: 'Next Question?', tier: 1 },
    ];
    const utils = await setupTest(plan);
    
    await submitAnswer(utils, 'I have severe pain');
    // Wait for user message to render first to ensure state flow
    await waitFor(() => expect(utils.getByText(/I have severe pain/)).toBeTruthy());

    const expected = "I'm sorry you're going through this... Next Question?";
    await waitFor(() => expect(utils.getByText(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy());
  });

  it('responds with Denial empathy for "no" keyword', async () => {
    const plan = [
      { id: 'q1', text: 'Q1?', tier: 1 },
      { id: 'q2', text: 'Next Question?', tier: 1 },
    ];
    const utils = await setupTest(plan);
    
    await submitAnswer(utils, 'No');
    await waitFor(() => expect(utils.getByText(/No/)).toBeTruthy());

    const expected = "That's good to know... Next Question?";
    await waitFor(() => expect(utils.getByText(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy());
  });

  it('responds with Uncertainty empathy for "not sure" keyword', async () => {
    const plan = [
      { id: 'q1', text: 'Q1?', tier: 1 },
      { id: 'q2', text: 'Next Question?', tier: 1 },
    ];
    const utils = await setupTest(plan);
    
    await submitAnswer(utils, 'I am not sure');
    await waitFor(() => expect(utils.getByText(/I am not sure/)).toBeTruthy());

    const expected = "That's okay, we can work with that... Next Question?";
    await waitFor(() => expect(utils.getByText(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy());
  });

  it('responds with Neutral fallback for unmatched input', async () => {
    const plan = [
      { id: 'q1', text: 'Q1?', tier: 1 },
      { id: 'q2', text: 'Next Question?', tier: 1 },
    ];
    const utils = await setupTest(plan);
    
    await submitAnswer(utils, 'It started yesterday');
    await waitFor(() => expect(utils.getByText(/It started yesterday/)).toBeTruthy());

    const expected = "Got it. Next Question?";
    await waitFor(() => expect(utils.getByText(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy());
  });
});
