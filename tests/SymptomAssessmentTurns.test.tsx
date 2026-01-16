import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { getGeminiResponse } from '../src/services/gemini';
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
    // Turn 1: Initial
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockQuestions('age')));
    // Turn 2
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockQuestions('duration')));
    // Turn 3 (should not be called if we limit to 3)
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockQuestions('severity')));

    // We will test with a limit of 3 for brevity in this test
    // I will temporarily change the screen's behavior or just test the current 5 limit but more carefully.
    // Actually, I'll stick to 5 but fix the async wait.

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>
    );

    // Wait for Turn 1 Q
    await waitFor(() => expect(screen.getByText(/Question age/)).toBeTruthy());
    
    // Turn 1 -> 2
    fireEvent.changeText(screen.getByTestId('input-text'), '25');
    fireEvent.press(screen.getByText('Send'));
    act(() => { jest.advanceTimersByTime(1500); });
    await waitFor(() => expect(screen.getByText(/Question duration/)).toBeTruthy());

    // Turn 2 -> 3
    fireEvent.changeText(screen.getByTestId('input-text'), '2 days');
    fireEvent.press(screen.getByText('Send'));
    act(() => { jest.advanceTimersByTime(1500); });
    await waitFor(() => expect(screen.getByText(/Question severity/)).toBeTruthy());

    // Turn 3 -> 4
    fireEvent.changeText(screen.getByTestId('input-text'), 'Severe');
    fireEvent.press(screen.getByText('Send'));
    act(() => { jest.advanceTimersByTime(1500); });
    await waitFor(() => expect(screen.getByText(/Question progression/)).toBeTruthy());

    // Turn 4 -> 5. Final batch finishes. Turn count reaches 5.
    fireEvent.changeText(screen.getByTestId('input-text'), 'Worsening');
    fireEvent.press(screen.getByText('Send'));
    act(() => { jest.advanceTimersByTime(1500); });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Recommendation', expect.anything());
    }, { timeout: 5000 });

    // Verification: Turn 1, 2, 3, 4 fetch calls made.
    // Call 1: useEffect
    // Call 2: after Turn 1 batch
    // Call 3: after Turn 2 batch
    // Call 4: after Turn 3 batch
    // After Turn 4 batch, nextTurn is 5. We STOP.
    expect(getGeminiResponse).toHaveBeenCalledTimes(4);
  });

  test('concludes assessment immediately when Red Flag is identified', async () => {
    const { detectEmergency } = require('../src/services/emergencyDetector');
    // Ensure we start fresh for this test
    (detectEmergency as jest.Mock).mockReturnValue({ isEmergency: false, matchedKeywords: [] });
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockQuestions('age')));

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
