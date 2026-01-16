import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
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

jest.mock('../src/services/gemini', () => ({
  generateAssessmentPlan: jest.fn(),
  extractClinicalProfile: jest.fn(),
}));

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
    MultiSelectChecklist: ({ options, selectedIds, onSelectionChange, title }: any) => (
      <View testID="multi-select-checklist">
        <Text>{title}</Text>
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
    Button: ({ title, onPress, variant }: { title: string; onPress: () => void; variant?: string }) => (
      <TouchableOpacity onPress={onPress} testID={`button-${title.replace(/\s+/g, '-').toLowerCase()}`}>
        <Text>{title} ({variant})</Text>
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

describe('SymptomAssessmentScreen Red Flags Checklist', () => {
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
      params: { initialSymptom: 'Chest Pain' },
    });

    store = configureStore({
      reducer: combineReducers({
        navigation: navigationReducer,
        settings: settingsReducer,
      }),
    });
  });

  test('renders checklist when question ID is red_flags', async () => {
    const redFlagQuestion = {
      id: 'red_flags',
      text: 'Do you have any of the following: Chest pain, Difficulty breathing, or Dizziness?',
    };

    (generateAssessmentPlan as jest.Mock).mockResolvedValue([redFlagQuestion]);

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>
    );

    // Wait for the question to appear
    await waitFor(() => expect(screen.getByTestId('multi-select-checklist')).toBeTruthy());

    // Verify parsed options
    expect(screen.getByText('Chest pain')).toBeTruthy();
    expect(screen.getByText('Difficulty breathing')).toBeTruthy();
    expect(screen.getByText('Dizziness')).toBeTruthy();

    // Verify buttons
    expect(screen.getByText(/None of these apply/)).toBeTruthy();
    // Confirm button only shows when selection > 0
    expect(screen.queryByText(/Confirm/)).toBeNull();

    // Select an option
    fireEvent.press(screen.getByTestId('option-Chest pain'));

    // Confirm button should now appear
    expect(screen.getByText(/Confirm/)).toBeTruthy();
  });

  test('None of these apply button sends "Denied"', async () => {
    const redFlagQuestion = { id: 'red_flags', text: 'Signs: Fever, Cough' };
    (generateAssessmentPlan as jest.Mock).mockResolvedValue([redFlagQuestion]);
    (extractClinicalProfile as jest.Mock).mockResolvedValue({ summary: 'Summary' });

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>
    );

    await waitFor(() => expect(screen.getByTestId('multi-select-checklist')).toBeTruthy());

    fireEvent.press(screen.getByTestId('button-none-of-these-apply'));

    await waitFor(() => {
      expect(extractClinicalProfile).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ text: 'Denied' })
      ]));
    });
  });

  test('Confirm button sends selected symptoms', async () => {
    const redFlagQuestion = { id: 'red_flags', text: 'Signs: Fever, Cough' };
    (generateAssessmentPlan as jest.Mock).mockResolvedValue([redFlagQuestion]);
    (extractClinicalProfile as jest.Mock).mockResolvedValue({ summary: 'Summary' });

    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>
    );

    await waitFor(() => expect(screen.getByTestId('multi-select-checklist')).toBeTruthy());

    fireEvent.press(screen.getByTestId('option-Fever'));
    fireEvent.press(screen.getByTestId('option-Cough'));
    fireEvent.press(screen.getByTestId('button-confirm'));

    await waitFor(() => {
      expect(extractClinicalProfile).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining('Fever, Cough') })
      ]));
    });
  });
});
