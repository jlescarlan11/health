import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { geminiClient } from '../src/api/geminiClient';
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

jest.mock('../src/services/emergencyDetector', () => ({
  detectEmergency: jest.fn(() => ({ isEmergency: false, matchedKeywords: [] })),
}));

jest.mock('../src/services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: jest.fn(() => ({ isCrisis: false, matchedKeywords: [] })),
}));

// Mock components used in the screen
jest.mock('../src/components/common', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');

  return {
    InputCard: React.forwardRef(
      ({ value, onChangeText, onSubmit, disabled }: any, ref: React.Ref<unknown>) => {
        React.useImperativeHandle(ref, () => ({
          focus: jest.fn(),
          blur: jest.fn(),
          isFocused: jest.fn(() => false),
        }));
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
      <TouchableOpacity
        onPress={onPress}
        testID={`button-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
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
      <View testID="header">
        <Text>{title}</Text>
      </View>
    ),
  };
});

describe('SymptomAssessmentScreen Category Escalation Detection', () => {
  let store: any;
  let planSpy: jest.SpyInstance;
  let profileSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    planSpy = jest.spyOn(geminiClient, 'generateAssessmentPlan').mockResolvedValue({
      questions: [
        { id: 'q1', text: 'Question 1', tier: 1 },
        { id: 'q2', text: 'Question 2', tier: 1 },
        { id: 'q3', text: 'Question 3', tier: 2 },
      ],
      intro: 'Intro',
    });
    profileSpy = jest.spyOn(geminiClient, 'extractClinicalProfile');

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
    jest.useFakeTimers();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.restoreAllMocks();
  });

  test('detects escalation from simple to critical mid-stream', async () => {
    // 1st extraction: simple
    profileSpy.mockResolvedValueOnce({
      symptom_category: 'simple',
      triage_readiness_score: 0.3,
      summary: 'Mild headache',
    });

    // 2nd extraction: critical
    profileSpy.mockResolvedValueOnce({
      symptom_category: 'critical',
      triage_readiness_score: 0.5,
      summary: 'Headache with neurological symptoms',
    });

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>,
    );

    // Initial load
    await waitFor(() => expect(screen.getByText(/Question 1/)).toBeTruthy());

    // Answer Question 1
    const input = screen.getByTestId('input-text');
    const submit = screen.getByTestId('submit-button');

    fireEvent.changeText(input, 'My head hurts a bit');
    fireEvent.press(submit);

    // Wait for 1st extraction to complete and question 2 to appear
    await waitFor(() => expect(screen.getByText(/Question 2/)).toBeTruthy());

    // Verify first category was set internally (implicitly by the fact that it will be compared in next turn)

    // Answer Question 2 with something that triggers escalation
    fireEvent.changeText(input, 'Now I feel numb on one side');
    fireEvent.press(submit);

    // Wait for 2nd extraction to complete
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Assessment] Mid-stream escalation detected: simple -> critical'),
      );
    });
  });

  test('does not log for lateral or downward changes', async () => {
    // 1st extraction: complex
    profileSpy.mockResolvedValueOnce({
      symptom_category: 'complex',
      triage_readiness_score: 0.3,
      summary: 'Persistent pain',
    });

    // 2nd extraction: simple (downward)
    profileSpy.mockResolvedValueOnce({
      symptom_category: 'simple',
      triage_readiness_score: 0.5,
      summary: 'Improving pain',
    });

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Question 1/)).toBeTruthy());

    const input = screen.getByTestId('input-text');
    const submit = screen.getByTestId('submit-button');

    fireEvent.changeText(input, 'Still painful');
    fireEvent.press(submit);

    await waitFor(() => expect(screen.getByText(/Question 2/)).toBeTruthy());

    fireEvent.changeText(input, 'Actually it is better now');
    fireEvent.press(submit);

    await waitFor(() => {
      // Should have been called twice for extrations but never for escalation log
      const escalationLogs = consoleLogSpy.mock.calls.filter(
        (call) =>
          call[0] &&
          typeof call[0] === 'string' &&
          call[0].includes('[Assessment] Mid-stream escalation detected'),
      );
      expect(escalationLogs.length).toBe(0);
    });
  });
});
