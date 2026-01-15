import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { getGeminiResponse } from '../src/services/gemini';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
jest.mock('react-native-paper', () => {
  const React = require('react');
  return {
    Text: ({ children }: any) => React.createElement('Text', {}, children),
    ActivityIndicator: () => React.createElement('ActivityIndicator'),
    useTheme: () => ({
      colors: {
        primary: '#379777',
        background: '#F5F7F8',
        surface: '#FFFFFF',
        outline: '#45474B',
        primaryContainer: '#D1E7DD',
        onSurface: '#45474B',
        onPrimary: '#FFFFFF',
      },
    }),
    Chip: ({ children, onPress, disabled }: any) =>
      React.createElement('View', { onPress, disabled }, React.createElement('Text', {}, children)),
    Provider: ({ children }: any) => children,
    DefaultTheme: {},
  };
});

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Provider as PaperProvider } from 'react-native-paper';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('../src/services/gemini', () => ({
  getGeminiResponse: jest.fn(),
}));

jest.mock('expo-av', () => ({
  Audio: {
    Recording: {
      createAsync: jest.fn(),
    },
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
  },
}));

// Mock components used in the screen
jest.mock('../src/components/common', () => ({
  InputCard: 'InputCard',
  TypingIndicator: 'TypingIndicator',
  Button: 'Button',
  StandardHeader: 'StandardHeader',
}));

const mockQuestions = {
  questions: [
    { id: 'q1', text: 'How long have you had this?', type: 'text' },
    { id: 'q2', text: 'Is it sharp or dull?', type: 'choice', options: ['Sharp', 'Dull'] },
  ],
};

describe('SymptomAssessmentScreen Skip Functionality', () => {
  const mockNavigate = jest.fn();
  const mockSetOptions = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      replace: mockNavigate,
    });
    (useRoute as jest.Mock).mockReturnValue({
      params: { initialSymptom: 'Headache' },
    });
    (getGeminiResponse as jest.Mock).mockResolvedValue(JSON.stringify(mockQuestions));
  });

  const renderScreen = () =>
    render(
      <SafeAreaProvider>
        <PaperProvider>
          <SymptomAssessmentScreen />
        </PaperProvider>
      </SafeAreaProvider>,
    );

  test('renders "I\'m not sure" chip for both text and choice questions', async () => {
    renderScreen();

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getByText(/How long have you had this?/)).toBeTruthy();
    });

    // Verify skip chip exists for text question
    expect(screen.getByText("I'm not sure")).toBeTruthy();

    // Advance to next question (choice)
    const skipChip = screen.getByText("I'm not sure");
    fireEvent.press(skipChip);

    // Wait for typing indicator and then next question
    await waitFor(
      () => {
        expect(screen.getByText(/Is it sharp or dull?/)).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // Verify skip chip exists for choice question along with other options
    expect(screen.getByText('Sharp')).toBeTruthy();
    expect(screen.getByText('Dull')).toBeTruthy();
    expect(screen.getAllByText("I'm not sure")).toBeTruthy();
  });

  test('selecting "I\'m not sure" records "User was not sure" in assessmentData', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/How long have you had this?/)).toBeTruthy();
    });

    // Skip the first question
    const skipChip = screen.getByText("I'm not sure");
    fireEvent.press(skipChip);

    // Skip the second question
    await waitFor(
      () => {
        expect(screen.getByText(/Is it sharp or dull?/)).toBeTruthy();
      },
      { timeout: 3000 },
    );

    const skipChips = screen.getAllByText("I'm not sure");
    // The last one is for the current question
    fireEvent.press(skipChips[skipChips.length - 1]);

    // Verify navigation to Recommendation screen with correct data
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith(
          'Recommendation',
          expect.objectContaining({
            assessmentData: {
              symptoms: 'Headache',
              answers: {
                q1: 'User was not sure',
                q2: 'User was not sure',
              },
            },
          }),
        );
      },
      { timeout: 3000 },
    );
  });

  test('chat history shows "I\'m not sure" when skip is used', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/How long have you had this?/)).toBeTruthy();
    });

    fireEvent.press(screen.getByText("I'm not sure"));

    // Verify user message in chat
    await waitFor(() => {
      const messages = screen.getAllByText("I'm not sure");
      expect(messages.length).toBeGreaterThanOrEqual(2); // One chip, one message
    });
  });
});
