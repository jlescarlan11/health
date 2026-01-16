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

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput: RNTextInput } = require('react-native');
  return {
    Text: ({ children, style }: { children: React.ReactNode; style?: import('react-native').StyleProp<import('react-native').TextStyle> }) => <Text style={style}>{children}</Text>,
    ActivityIndicator: () => <View testID="loading" />,
    useTheme: () => ({
      colors: {
        primary: '#379777',
        background: '#F5F7F8',
        surface: '#FFFFFF',
        outline: '#45474B',
        primaryContainer: '#D1E7DD',
        onSurface: '#45474B',
        onPrimary: '#FFFFFF',
        error: '#B00020',
        surfaceVariant: '#EEEEEE',
        onSurfaceVariant: '#666666',
        outlineVariant: '#CCCCCC',
      },
    }),
    Chip: ({ children, onPress, disabled }: { children: React.ReactNode; onPress: () => void; disabled?: boolean }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID="chip">
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    TextInput: (props: import('react-native').TextInputProps) => <RNTextInput {...props} />,
    IconButton: (props: { onPress: () => void; disabled?: boolean; icon: string }) => (
      <TouchableOpacity onPress={props.onPress} disabled={props.disabled}>
        <Text>{props.icon}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../src/services/gemini', () => {
  const actual = jest.requireActual('../src/services/gemini');
  return {
    getGeminiResponse: jest.fn(),
    parseClarifyingQuestions: actual.parseClarifyingQuestions,
  };
});

jest.mock('expo-av', () => ({
  Audio: {
    Recording: { createAsync: jest.fn() },
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
  },
}));

// Mock components used in the screen
jest.mock('../src/components/common', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');

  return {
    InputCard: React.forwardRef(({ value, onChangeText, onSubmit, disabled }: { value: string; onChangeText: (t: string) => void; onSubmit: () => void; disabled?: boolean }, ref: React.Ref<unknown>) => {
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
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ onBackPress, title }: { onBackPress: () => void; title: string }) => (
      <View testID="header">
        <TouchableOpacity testID="header-back" onPress={onBackPress}>
          <Text>Back</Text>
        </TouchableOpacity>
        <Text>{title}</Text>
      </View>
    ),
  };
});

const mockThreeQuestions = {
  questions: [
    { id: 'duration', text: 'Question 1: Duration?', type: 'text' },
    { id: 'severity', text: 'Question 2: Severity?', type: 'choice', options: ['Mild', 'Severe'] },
    { id: 'progression', text: 'Question 3: Location?', type: 'text' },
  ],
};

describe('SymptomAssessmentScreen Step-Back Navigation', () => {
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
      params: { initialSymptom: 'Fever' },
    });
    (getGeminiResponse as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(mockThreeQuestions))
      .mockResolvedValue(JSON.stringify({ questions: [] }));

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

  const triggerBack = () => {
    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1];
    if (!lastCall) throw new Error('setOptions not called');
    const header = lastCall[0].header();
    // header is a JSX element (StandardHeader), we can trigger its onBackPress prop directly
    act(() => {
      header.props.onBackPress();
    });
  };

  const renderScreen = () =>
    render(
      <ReduxProvider store={store}>
        <SymptomAssessmentScreen />
      </ReduxProvider>,
    );

  test('comprehensive step-back test', async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByText(/Question 1: Duration\?/)).toBeTruthy());

    const input = screen.getByTestId('input-text');
    const submitBtn = screen.getByTestId('submit-button');

    // Answer Q1
    fireEvent.changeText(input, '2 days');
    fireEvent.press(submitBtn);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    await waitFor(() => expect(screen.getByText(/Question 2: Severity\?/)).toBeTruthy());

    // Answer Q2
    fireEvent.changeText(input, 'Mild');
    fireEvent.press(submitBtn);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    await waitFor(() => expect(screen.getByText(/Question 3: Location\?/)).toBeTruthy());

    // Answer Q3
    fireEvent.changeText(input, 'Chest');
    fireEvent.press(submitBtn);

    // Step back to Q3
    triggerBack();
    await waitFor(() => expect(screen.getByText(/Question 3: Location\?/)).toBeTruthy());
    expect(screen.getByTestId('input-text').props.value).toBe('Chest');

    // Step back to Q2
    triggerBack();
    await waitFor(() => expect(screen.getByText(/Question 2: Severity\?/)).toBeTruthy());
    expect(screen.getByTestId('input-text').props.value).toBe('Mild');

    // Correct Q2
    fireEvent.changeText(screen.getByTestId('input-text'), 'Severe');
    fireEvent.press(screen.getByTestId('submit-button'));
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    await waitFor(() => expect(screen.getByText(/Question 3: Location\?/)).toBeTruthy());

    // Answer Q3 again
    fireEvent.changeText(screen.getByTestId('input-text'), 'Abdomen');
    fireEvent.press(screen.getByTestId('submit-button'));
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'Recommendation',
        expect.objectContaining({
          assessmentData: {
            symptoms: 'Fever',
            answers: [
              { question: 'Question 1: Duration?', answer: '2 days' },
              { question: 'Question 2: Severity?', answer: 'Severe' },
              { question: 'Question 3: Location?', answer: 'Abdomen' },
            ],
          },
        }),
      );
    });
  });

  test('repeatedly stepping back', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText(/Question 1: Duration\?/)).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('input-text'), '1 week');
    fireEvent.press(screen.getByTestId('submit-button'));
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    await waitFor(() => expect(screen.getByText(/Question 2: Severity\?/)).toBeTruthy());

    triggerBack();
    await waitFor(() => expect(screen.getByText(/Question 1: Duration\?/)).toBeTruthy());
    expect(screen.getByTestId('input-text').props.value).toBe('1 week');
    expect(screen.queryByText('1 week')).toBeNull();
  });
});
