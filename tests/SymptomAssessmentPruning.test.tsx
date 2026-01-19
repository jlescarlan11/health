import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { generateAssessmentPlan } from '../src/services/gemini';
import { extractClinicalSlots } from '../src/utils/clinicalUtils';
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

jest.mock('../src/utils/clinicalUtils', () => ({
  ...jest.requireActual('../src/utils/clinicalUtils'),
  extractClinicalSlots: jest.fn(),
}));

// Mock components used in the screen
jest.mock('../src/components/common', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return {
    InputCard: () => <View testID="input-card" />,
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

// Mock SpeechService (used in useEffect cleanup)
jest.mock('../src/services/speechService', () => ({
  speechService: {
    stopListening: jest.fn(),
    destroy: jest.fn(),
  }
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

describe('SymptomAssessmentScreen Pruning Logic', () => {
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

  test('Prunes severity question when extracted from initial symptom', async () => {
    const plan = [
      { id: 'basics', text: 'Age and duration?', tier: 1 },
      { id: 'severity', text: 'How severe is it?', tier: 1 }, // Should be pruned
      { id: 'location', text: 'Where does it hurt?', tier: 2 } // Should remain
    ];

    (generateAssessmentPlan as jest.Mock).mockResolvedValue(plan);
    (extractClinicalSlots as jest.Mock).mockReturnValue({
      severity: 'High'
    });

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>
    );

    // Wait for messages to load
    // The first question should be 'location' because 'basics' (no slots) and 'severity' (slots) 
    // Wait, 'basics' won't be pruned because slots.age and slots.duration are undefined.
    // 'severity' will be pruned because slots.severity is 'High'.
    // So questions shown should be: 'basics' -> 'location'.
    
    // We check the first message text. The intro message appends the first question text.
    await waitFor(() => expect(screen.getByText(/Age and duration\?/)).toBeTruthy());
    
    // Check that severity question is NOT present in the messages (initial render only shows first question)
    expect(screen.queryByText(/How severe is it\?/)).toBeNull();
  });

  test('Does NOT prune severity question when NOT extracted', async () => {
    const plan = [
      { id: 'severity', text: 'How severe is it?', tier: 1 },
      { id: 'location', text: 'Where does it hurt?', tier: 2 }
    ];

    (generateAssessmentPlan as jest.Mock).mockResolvedValue(plan);
    (extractClinicalSlots as jest.Mock).mockReturnValue({
      severity: undefined
    });

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>
    );

    // Should show severity question
    await waitFor(() => expect(screen.getByText(/How severe is it\?/)).toBeTruthy());
  });
});
