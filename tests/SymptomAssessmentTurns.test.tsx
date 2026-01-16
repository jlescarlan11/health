import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { getGeminiResponse, generateAssessmentPlan, extractClinicalProfile } from '../src/services/gemini';
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

jest.mock('../src/services/gemini', () => {
  const actual = jest.requireActual('../src/services/gemini');
  return {
    getGeminiResponse: jest.fn(),
    generateAssessmentPlan: jest.fn(),
    extractClinicalProfile: jest.fn(),
    parseClarifyingQuestions: actual.parseClarifyingQuestions,
  };
});

jest.mock('../src/services/emergencyDetector', () => ({
  detectEmergency: jest.fn(() => ({ isEmergency: false, matchedKeywords: [] })),
  detectMentalHealthCrisis: jest.fn(() => ({ isCrisis: false, matchedKeywords: [] })),
}));

// Mock components used in the screen
jest.mock('../src/components/common', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');

  return {
    InputCard: React.forwardRef(({ value, onChangeText, onSubmit, disabled }: any, ref: React.Ref<unknown>) => {
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
            placeholder=""
          />
          <TouchableOpacity testID="submit-button" onPress={() => onSubmit()} disabled={disabled}>
            <Text>Send</Text>
          </TouchableOpacity>
        </View>
      );
    }),
    TypingIndicator: () => <View testID="typing-indicator" />,
    SafetyRecheckModal: () => <View testID="safety-modal" />,
    ProgressBar: () => <View testID="progress-bar" />,
    MultiSelectChecklist: ({ options, selectedIds, onSelectionChange }: any) => (
      <View testID="multi-select-checklist">
        {options.map((opt: any) => (
          <TouchableOpacity 
            key={opt.id} 
            testID={`option-${opt.id}`} 
            onPress={() => onSelectionChange(
              selectedIds.includes(opt.id) 
                ? selectedIds.filter((id: string) => id !== opt.id) 
                : [...selectedIds, opt.id]
            )}
          >
            <Text>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

jest.mock('../src/components/common/Button', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    Button: ({ title, onPress }: { title: string; onPress: () => void }) => (
      <TouchableOpacity onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
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

const mockQuestions = (id: string) => ({
  questions: [{ id, text: `Question ${id}`, type: 'text' }],
});

describe('SymptomAssessmentScreen Turn Limits', () => {
  const mockNavigate = jest.fn();
  const mockSetOptions = jest.fn();
  let store: import('@reduxjs/toolkit').EnhancedStore;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      replace: mockNavigate,
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
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('concludes assessment automatically at turn limit', async () => {
    // Mock a plan with 5 questions
    const questions = [
      ...mockQuestions('age').questions,
      ...mockQuestions('duration').questions,
      ...mockQuestions('severity').questions,
      ...mockQuestions('progression').questions,
      ...mockQuestions('red_flag_denials').questions
    ];

    (generateAssessmentPlan as jest.Mock).mockResolvedValueOnce(questions);
    (extractClinicalProfile as jest.Mock).mockResolvedValue({ summary: 'Mock' });

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>
    );

    // Turn 1 (Age)
    await waitFor(() => expect(screen.getByText(/Question age/)).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('input-text'), '25');
    fireEvent.press(screen.getByText('Send'));
    act(() => { jest.advanceTimersByTime(1500); });

    // Turn 2 (Duration)
    await waitFor(() => expect(screen.getByText(/Question duration/)).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('input-text'), '2 days');
    fireEvent.press(screen.getByText('Send'));
    act(() => { jest.advanceTimersByTime(1500); });

    // Turn 3 (Severity)
    await waitFor(() => expect(screen.getByText(/Question severity/)).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('input-text'), 'Severe');
    fireEvent.press(screen.getByText('Send'));
    act(() => { jest.advanceTimersByTime(1500); });

    // Turn 4 (Progression)
    await waitFor(() => expect(screen.getByText(/Question progression/)).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('input-text'), 'Worsening');
    fireEvent.press(screen.getByText('Send'));
    act(() => { jest.advanceTimersByTime(1500); });

    // Turn 5 (Red Flag Denials)
    await waitFor(() => expect(screen.getByText(/Question red_flag_denials/)).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('input-text'), 'No red flags');
    fireEvent.press(screen.getByText('Send'));
    act(() => { jest.advanceTimersByTime(1500); });

    // Next turn would be 6, so we expect navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Recommendation', expect.anything());
    }, { timeout: 5000 });

    // Verification: Single fetch call made
    expect(generateAssessmentPlan).toHaveBeenCalledTimes(1);
  });

  test('concludes assessment immediately when Red Flag is identified', async () => {
    const { detectEmergency } = require('../src/services/emergencyDetector');
    // Ensure we start fresh for this test
    (detectEmergency as jest.Mock).mockReturnValue({ isEmergency: false, matchedKeywords: [] });
    (generateAssessmentPlan as jest.Mock).mockResolvedValueOnce(mockQuestions('age').questions);

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>
    );

    await waitFor(() => expect(screen.getByText(/Question age/)).toBeTruthy());
    
    // Now trigger emergency for the next input
    (detectEmergency as jest.Mock).mockReturnValue({ isEmergency: true, matchedKeywords: ['chest pain'] });

    fireEvent.changeText(screen.getByTestId('input-text'), 'I have chest pain');
    fireEvent.press(screen.getByText('Send'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Recommendation', expect.objectContaining({
        assessmentData: expect.objectContaining({
          symptoms: 'Headache',
        })
      }));
    });
  });
});
