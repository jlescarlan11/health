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

  test('concludes assessment automatically at turn 5', async () => {
    // Turn 1: Initial
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockQuestions('age')));
    // Turn 2
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockQuestions('duration')));
    // Turn 3
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockQuestions('severity')));
    // Turn 4
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockQuestions('progression')));
    // Turn 5 (should not be called, but we mock it just in case)
    (getGeminiResponse as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockQuestions('red_flag_denials')));

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>
    );

    // Wait for Turn 1 Q
    await waitFor(() => expect(screen.getByText(/Question age/)).toBeTruthy());
    
    // Answer Turn 1 -> Triggers Turn 2 fetch
    fireEvent.press(screen.getByText("I'm not sure"));
    act(() => { jest.advanceTimersByTime(1500); });
    await waitFor(() => expect(screen.getByText(/Question duration/)).toBeTruthy());

    // Answer Turn 2 -> Triggers Turn 3 fetch
    fireEvent.press(screen.getAllByText("I'm not sure")[1]);
    act(() => { jest.advanceTimersByTime(1500); });
    await waitFor(() => expect(screen.getByText(/Question severity/)).toBeTruthy());

    // Answer Turn 3 -> Triggers Turn 4 fetch
    fireEvent.press(screen.getAllByText("I'm not sure")[2]);
    act(() => { jest.advanceTimersByTime(1500); });
    await waitFor(() => expect(screen.getByText(/Question progression/)).toBeTruthy());

    // Answer Turn 4 -> Reaches Turn 5. Should finish.
    fireEvent.press(screen.getAllByText("I'm not sure")[3]);
    act(() => { jest.advanceTimersByTime(1500); });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Recommendation', expect.anything());
    });

    // Verify turn count limit prevented 5th AI call for questions
    // Call 1 (Turn 1), Call 2 (Turn 2), Call 3 (Turn 3), Call 4 (Turn 4)
    // The 5th turn check happens BEFORE fetchQuestions(..., 5) if we logic it right.
    expect(getGeminiResponse).toHaveBeenCalledTimes(4);
  });
});
