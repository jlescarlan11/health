import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
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
  const { View, TextInput, TouchableOpacity, Text } = require('react-native');

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

describe('SymptomAssessmentScreen Hedging Clarification', () => {
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

  test('Forces clarification with binary choices when hedging is detected in red flags', async () => {
    // 1. Initial Plan
    (generateAssessmentPlan as jest.Mock).mockResolvedValue({
      questions: [
        { id: 'red_flags', text: 'Do you have difficulty breathing?' },
        { id: 'duration', text: 'How long has it been?' },
      ],
      intro: 'Intro',
    });

    // Mock streamGeminiResponse for the bridge logic
    (streamGeminiResponse as jest.Mock).mockImplementation(async function* () {
      yield 'I understand. ';
      yield 'How long has it been?';
    });

    // 2. Mock hedging scenario
    // Turn 1: User says "Maybe" -> applyHedgingCorrections (in gemini.ts) sets denial_confidence: 'low'
    (extractClinicalProfile as jest.Mock).mockResolvedValueOnce({
      denial_confidence: 'low',
      red_flags_resolved: false,
      ambiguity_detected: true,
      clinical_friction_detected: true,
      clinical_friction_details: '[System] Hedging detected in: red_flag_denials ("maybe")',
      triage_readiness_score: 0.4,
      symptom_category: 'simple',
    });

    // Turn 2: User says "Yes, I am sure" (definitive)
    (extractClinicalProfile as jest.Mock).mockResolvedValueOnce({
      denial_confidence: 'high',
      red_flags_resolved: true,
      ambiguity_detected: false,
      clinical_friction_detected: false,
      triage_readiness_score: 0.8,
      symptom_category: 'simple',
    });

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>,
    );

    // Wait for first question
    await waitFor(() => expect(screen.getByText(/difficulty breathing/)).toBeTruthy());

    // User types "maybe"
    const input = screen.getByTestId('input-text');
    fireEvent.changeText(input, 'maybe');
    fireEvent.press(screen.getByTestId('submit-button'));

    // Wait for targeted clarification question
    // Use a regex that matches the improved component text
    await waitFor(() => expect(screen.getByText(/perfectly safe/)).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/"red_flag_denials" might be present/)).toBeTruthy());

    // Verify binary choice buttons are visible
    expect(screen.getByTestId('button-Yes, I am sure')).toBeTruthy();
    expect(screen.getByTestId('button-No, let me re-check')).toBeTruthy();

    // User presses "Yes, I am sure"
    fireEvent.press(screen.getByTestId('button-Yes, I am sure'));

    // 3. Verify it unblocks and moves to the next question
    // Call 2 happens during the "Proceed" turn
    await waitFor(() => expect(extractClinicalProfile).toHaveBeenCalledTimes(2));
    
    // Verify the next planned question is now displayed
    await waitFor(() => expect(screen.getByText(/How long has it been?/)).toBeTruthy());
  });
});
