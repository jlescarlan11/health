import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { generateAssessmentPlan, extractClinicalProfile } from '../src/services/gemini';
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

jest.mock('../src/utils/clinicalUtils', () => ({
  ...jest.requireActual('../src/utils/clinicalUtils'),
  extractClinicalSlots: jest.fn(() => ({})),
}));

jest.mock('../src/services/emergencyDetector', () => ({
  detectEmergency: jest.fn(() => ({ isEmergency: false, matchedKeywords: [] })),
}));

jest.mock('../src/services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: jest.fn(() => ({ isCrisis: false, matchedKeywords: [] })),
}));

// Mock components
jest.mock('../src/components/common', () => {
  const React = require('react');
  const { View, TextInput, TouchableOpacity } = require('react-native');
  
  const MockInputCard = React.forwardRef(({ onSubmit, onChangeText, value, disabled }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      focus: jest.fn(),
      blur: jest.fn(),
      isFocused: jest.fn(),
    }));
    return (
      <View testID="input-card">
        <TextInput testID="input-field" onChangeText={onChangeText} value={value} />
        {value.length > 0 && (
          <TouchableOpacity 
            testID="send-button" 
            onPress={onSubmit} 
            disabled={disabled}
          />
        )}
      </View>
    );
  });

  return {
    InputCard: MockInputCard,
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
  speechService: { stopListening: jest.fn(), destroy: jest.fn() },
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

describe('SymptomAssessmentScreen Dynamic Pruning', () => {
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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

  test('Dynamically prunes future Age question when Age is mentioned in early answer', async () => {
    const plan = [
      { id: 'location', text: 'Where does it hurt?', tier: 2 },
      { id: 'age', text: 'How old are you?', tier: 1 }, // This should be pruned
      { id: 'duration', text: 'How long has it been?', tier: 1 }, // This should remain
    ];

    (generateAssessmentPlan as jest.Mock).mockResolvedValue({ questions: plan, intro: 'Intro' });
    
    // Mock extraction for initial render (Call #1 in initializeAssessment - wait, that uses extractClinicalSlots)
    // Actually handleNext uses extractClinicalProfile.
    
    (extractClinicalProfile as jest.Mock).mockResolvedValueOnce({
      age: '30', // Populated slot!
      duration: null,
      severity: null,
      progression: 'Stable', // Added to avoid missing slot continue
      red_flags_resolved: true, // Added to avoid safety gate continue
      triage_readiness_score: 0.3,
      symptom_category: 'simple'
    });

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>
    );

    // 1. Initial render shows first question
    await waitFor(() => expect(screen.getByText(/Where does it hurt\?/)).toBeTruthy());

            // 2. Submit answer that triggers extraction
            const inputField = screen.getByTestId('input-field');
            fireEvent.changeText(inputField, 'It is in my head and I am 30 years old');
            
            const submitBtn = screen.getByTestId('send-button');
            
            await act(async () => {
              fireEvent.press(submitBtn);
            });    
        // Wait for extractClinicalProfile to be called
        await waitFor(() => expect(extractClinicalProfile).toHaveBeenCalled());
    
        // Fast-forward timers for the UI transitions
        await act(async () => {
          jest.advanceTimersByTime(1000); 
        });
    
        // 3. Verify that 'How old are you?' was SKIPPED and 'How long has it been?' is shown next
        await waitFor(() => {
          const messages = screen.toJSON();
          // Use queryByText to check for presence of next question
          return screen.queryByText(/How long has it been\?/) !== null;
        }, { timeout: 4000 });
    
        expect(screen.getByText(/How long has it been\?/)).toBeTruthy();
        
        // Ensure 'How old are you?' is not in the messages
        expect(screen.queryByText(/How old are you\?/)).toBeNull();  });
});
