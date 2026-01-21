import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import {
  generateAssessmentPlan,
  extractClinicalProfile,
  streamGeminiResponse,
} from '../src/services/gemini';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { navigationReducer, settingsReducer } from '../src/store';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('../src/services/gemini');

jest.mock('../src/services/emergencyDetector', () => ({
  detectEmergency: jest.fn(() => ({ isEmergency: false, matchedKeywords: [] })),
}));

jest.mock('../src/services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: jest.fn(() => ({ isCrisis: false, matchedKeywords: [] })),
}));

// Mock components
jest.mock('../src/components/common', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');

  return {
    InputCard: React.forwardRef(
      ({ value, onChangeText, onSubmit, disabled }: any, ref: React.Ref<unknown>) => {
        return (
          <View testID="input-card">
            <TextInput
              testID="input-text"
              value={value}
              onChangeText={onChangeText}
              editable={!disabled}
            />
            <TouchableOpacity testID="submit-button" onPress={() => onSubmit()} disabled={disabled}>
              <Text>Send</Text>
            </TouchableOpacity>
          </View>
        );
      },
    ),
    TypingIndicator: () => <View testID="typing-indicator" />,
    SafetyRecheckModal: () => <View testID="safety-modal" />,
    ProgressBar: () => <View testID="progress-bar" />,
    MultiSelectChecklist: () => <View testID="multi-select-checklist" />,
  };
});

jest.mock('../src/components/common/Button', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    Button: ({ title, onPress }: any) => (
      <TouchableOpacity onPress={onPress} testID={`button-${title}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../src/components/common/StandardHeader', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }: any) => (
      <View>
        <Text>{title}</Text>
      </View>
    ),
  };
});

describe('SymptomAssessmentScreen Ambiguous Denial', () => {
  const mockNavigate = jest.fn();
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useNavigation as jest.Mock).mockReturnValue({
      replace: mockNavigate,
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

  test('Triggers re-verification when denial confidence is low', async () => {
    // 1. Plan: Red Flag Question
    (generateAssessmentPlan as jest.Mock).mockResolvedValue({
      questions: [
        { id: 'red_flags', text: 'Do you have vision loss?' },
        { id: 'duration', text: 'How long?' },
      ],
      intro: 'Intro',
    });

    // Mock streamGeminiResponse for the bridge
    (streamGeminiResponse as jest.Mock).mockImplementation(async function* () {
      yield 'Okay. ';
      yield 'How long?';
    });

    // 2. Profile Sequence
    // Call 1: Low confidence denial
    (extractClinicalProfile as jest.Mock).mockResolvedValueOnce({
      denial_confidence: 'low',
      red_flags_resolved: true,
      triage_readiness_score: 0.5,
      symptom_category: 'simple',
      red_flag_denials: 'Vision loss',
    });

    // Call 2: High confidence
    (extractClinicalProfile as jest.Mock).mockResolvedValueOnce({
      denial_confidence: 'high',
      red_flags_resolved: true,
      triage_readiness_score: 0.6,
      symptom_category: 'simple',
      red_flag_denials: 'Vision loss',
    });

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>,
    );

    // Wait for first question
    await waitFor(() => expect(screen.getByText(/Do you have vision loss?/)).toBeTruthy());

    // User answers "No" - Handle both InputCard and SafetyCheck UI scenarios
    const input = screen.queryByTestId('input-text');
    if (input) {
      fireEvent.changeText(input, 'No');
      fireEvent.press(screen.getByTestId('submit-button'));
    } else {
      fireEvent.press(screen.getByTestId('button-No, just the Headache'));
    }

    // Wait for system re-verification message
    await waitFor(() => expect(screen.getByText(/100% sure/)).toBeTruthy());

    // Verify processing is unlocked (input editable)
    expect(screen.getByTestId('input-text').props.editable).toBe(true);

    // User confirms "Yes, I am sure"
    fireEvent.changeText(screen.getByTestId('input-text'), 'Yes, I am sure');
    fireEvent.press(screen.getByTestId('submit-button'));

    // Should proceed to next question "How long?"
    await waitFor(() => expect(screen.getByText(/How long?/)).toBeTruthy());
  });
});
