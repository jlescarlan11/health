import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { geminiClient } from '../src/api/geminiClient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { navigationReducer, settingsReducer } from '../src/store';
import { TriageArbiter } from '../src/services/triageArbiter';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('../src/services/emergencyDetector', () => ({
  detectEmergency: jest.fn(() => ({ isEmergency: false, matchedKeywords: [] })),
}));

jest.mock('../src/services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: jest.fn(() => ({ isCrisis: false, matchedKeywords: [] })),
}));

let planSpy: jest.SpyInstance;
let profileSpy: jest.SpyInstance;
let responseSpy: jest.SpyInstance;

// Mock components used in the screen
jest.mock('../src/components/common', () => {
  const React = require('react');
  const { View, TextInput, TouchableOpacity, Text } = require('react-native');

  return {
    InputCard: ({ value, onChangeText, onSubmit }: any) => (
      <View testID="input-card">
        <TextInput testID="input-field" value={value} onChangeText={onChangeText} />
        <TouchableOpacity testID="submit-button" onPress={onSubmit}>
          <Text>Submit</Text>
        </TouchableOpacity>
      </View>
    ),
    TypingIndicator: () => <View testID="typing-indicator" />,
    ProgressBar: () => <View testID="progress-bar" />,
    MultiSelectChecklist: () => <View testID="multi-select-checklist" />,
  };
});

jest.mock('../src/components/common/StandardHeader', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => (
      <View testID="header">
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

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

describe('SymptomAssessmentScreen RESOLVE_FRICTION handling', () => {
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    planSpy = jest
      .spyOn(geminiClient, 'generateAssessmentPlan')
      .mockResolvedValue({ questions: [], intro: '' });
    profileSpy = jest
      .spyOn(geminiClient, 'extractClinicalProfile')
      .mockResolvedValue({ triage_readiness_score: 0.2 } as any);
    responseSpy = jest.spyOn(geminiClient, 'getGeminiResponse').mockResolvedValue('Test response');
    jest.useFakeTimers();
    (useNavigation as jest.Mock).mockReturnValue({
      replace: jest.fn(),
      goBack: jest.fn(),
    });
    (useRoute as jest.Mock).mockReturnValue({
      params: { initialSymptom: 'Abdominal pain' },
    });

    store = configureStore({
      reducer: combineReducers({
        navigation: navigationReducer,
        settings: settingsReducer,
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Triggers Gemini generation when RESOLVE_FRICTION signal is received', async () => {
    const plan = [
      { id: 'basics', text: 'How old are you?', tier: 1 },
      { id: 'severity', text: 'How severe is it?', tier: 1 },
    ];

    planSpy.mockResolvedValue({ questions: plan, intro: 'Intro' });

    // First extraction (normal)
    profileSpy.mockResolvedValueOnce({
      triage_readiness_score: 0.2,
      clinical_friction_detected: false,
    });

    // Second extraction (friction detected)
    profileSpy.mockResolvedValueOnce({
      triage_readiness_score: 0.3,
      clinical_friction_detected: true,
      clinical_friction_details: 'User reports severe pain but looks comfortable.',
    });

    responseSpy.mockResolvedValue('Can you clarify the pain level given you seem comfortable?');

    const { getByTestId, getByText } = render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>,
    );

    // Initial load
    await waitFor(() => expect(getByText(/How old are you\?/)).toBeTruthy());

    // Submit first answer
    const input = getByTestId('input-field');
    const submit = getByTestId('submit-button');

    fireEvent.changeText(input, '25');
    fireEvent.press(submit);

    // After first answer, it should show 'How severe is it?'
    await waitFor(() => expect(getByText(/How severe is it\?/)).toBeTruthy());

    // Submit second answer which will trigger friction in our mock
    fireEvent.changeText(input, 'It is 10/10 severe');

    // Use act because multiple state updates and promises are happening
    await act(async () => {
      fireEvent.press(submit);
    });

    // Verify getGeminiResponse was called with the friction context
    expect(responseSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Contradiction detected: User reports severe pain but looks comfortable.',
      ),
    );

    // Verify the generated question is displayed
    await waitFor(() => {
      expect(getByText(/Can you clarify the pain level given you seem comfortable\?/)).toBeTruthy();
    });
  });
});
