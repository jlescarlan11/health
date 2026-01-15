import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { getGeminiResponse } from '../src/services/gemini';
import { useRoute, useNavigation } from '@react-navigation/native';
import { View, Text, TouchableOpacity, TextInput as RNTextInput } from 'react-native';

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
    Text: ({ children, style }: any) => <Text style={style}>{children}</Text>,
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
    Chip: ({ children, onPress, disabled }: any) => (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID="chip">
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    TextInput: (props: any) => <RNTextInput {...props} />,
    IconButton: (props: any) => (
      <TouchableOpacity onPress={props.onPress} disabled={props.disabled}>
        <Text>{props.icon}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../src/services/gemini', () => ({
  getGeminiResponse: jest.fn(),
}));

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
    InputCard: React.forwardRef(({ value, onChangeText, onSubmit, disabled }: any, ref: any) => {
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
    Button: ({ title, onPress }: any) => (
      <TouchableOpacity onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    StandardHeader: ({ onBackPress, title }: any) => (
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
    { id: 'q1', text: 'Question 1: Duration?', type: 'text' },
    { id: 'q2', text: 'Question 2: Severity?', type: 'choice', options: ['Mild', 'Severe'] },
    { id: 'q3', text: 'Question 3: Location?', type: 'text' },
  ],
};

describe('SymptomAssessmentScreen Step-Back Navigation', () => {
  const mockNavigate = jest.fn();
  const mockSetOptions = jest.fn();

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
    (getGeminiResponse as jest.Mock).mockResolvedValue(JSON.stringify(mockThreeQuestions));
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

  test('comprehensive step-back test', async () => {
    render(<SymptomAssessmentScreen />);

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
            answers: { q1: '2 days', q2: 'Severe', q3: 'Abdomen' },
          },
        }),
      );
    });
  });

  test('repeatedly stepping back', async () => {
    render(<SymptomAssessmentScreen />);
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
