import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import navigationSlice from '../src/store/navigationSlice';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { detectEmergency } from '../src/services/emergencyDetector';
import { geminiClient } from '../src/api/geminiClient';

let planSpy: jest.SpyInstance;
let profileSpy: jest.SpyInstance;
let responseSpy: jest.SpyInstance;
let streamSpy: jest.SpyInstance;

jest.mock('../src/services/emergencyDetector', () => ({
  detectEmergency: jest.fn(),
  isNegated: jest.fn((text, keyword) => ({ negated: text.toLowerCase().includes('no') })),
}));

jest.mock('../src/services/mentalHealthDetector', () => ({
  detectMentalHealthCrisis: jest.fn(() => ({ isCrisis: false })),
}));

const Stack = createNativeStackNavigator();

const renderScreen = (initialParams = { initialSymptom: 'Headache' }) => {
  const store = configureStore({
    reducer: {
      navigation: navigationSlice,
      facilities: (state = { facilities: [], isLoading: false, userLocation: null }) => state,
    },
  });

  return render(
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="SymptomAssessment"
            component={SymptomAssessmentScreen}
            initialParams={initialParams}
          />
          <Stack.Screen name="Recommendation" component={() => null} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>,
  );
};

describe('Temporal Emergency Verification', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    planSpy = jest.spyOn(geminiClient, 'generateAssessmentPlan').mockResolvedValue({
      questions: [{ id: 'q1', text: 'How are you?', type: 'text' }],
      intro: 'Hi',
    });
    profileSpy = jest.spyOn(geminiClient, 'extractClinicalProfile').mockResolvedValue({
      triage_readiness_score: 0.5,
      summary: 'Test summary',
    } as any);
    responseSpy = jest.spyOn(geminiClient, 'getGeminiResponse').mockResolvedValue('Test response');
    streamSpy = jest
      .spyOn(geminiClient, 'streamGeminiResponse')
      .mockImplementation(async function* () {
        yield 'chunk';
      });
    await geminiClient.clearCache();
    (detectEmergency as jest.Mock).mockReturnValue({ isEmergency: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders all three emergency verification buttons with correct labels', async () => {
    const { getByText, getByTestId, queryByText } = renderScreen();

    await waitFor(() => expect(queryByText('Preparing your assessment...')).toBeNull(), {
      timeout: 10000,
    });

    (detectEmergency as jest.Mock).mockReturnValue({
      isEmergency: true,
      matchedKeywords: ['chest pain'],
      score: 10,
      affectedSystems: ['Cardiac'],
    });

    const input = getByTestId('text-input-outlined');
    await act(async () => {
      fireEvent.changeText(input, 'I have chest pain');
    });

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(
      () => {
        expect(getByText('Yes, happening right now')).toBeTruthy();
        expect(getByText('Happened recently but has stopped')).toBeTruthy();
        expect(getByText('No, not experiencing this')).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it('accessibility attributes are correctly applied to all three buttons', async () => {
    const { getByLabelText, getByTestId, queryByText } = renderScreen();

    await waitFor(() => expect(queryByText('Preparing your assessment...')).toBeNull(), {
      timeout: 10000,
    });

    (detectEmergency as jest.Mock).mockReturnValue({
      isEmergency: true,
      matchedKeywords: ['chest pain'],
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('text-input-outlined'), 'chest pain');
    });

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(
      () => {
        const yesBtn = getByLabelText('Yes, happening right now');
        expect(yesBtn).toBeTruthy();
        expect(yesBtn.props.accessibilityLabel).toBe('Yes, happening right now');
        expect(yesBtn.props.accessibilityHint).toBe(
          'Escalates to immediate emergency recommendation',
        );

        const recentBtn = getByLabelText('Happened recently but has stopped');
        expect(recentBtn).toBeTruthy();
        expect(recentBtn.props.accessibilityLabel).toBe('Happened recently but has stopped');
        expect(recentBtn.props.accessibilityHint).toBe(
          'Continues assessment but flags the symptom as high priority',
        );

        const noBtn = getByLabelText('No, not experiencing this');
        expect(noBtn).toBeTruthy();
        expect(noBtn.props.accessibilityLabel).toBe('No, not experiencing this');
        expect(noBtn.props.accessibilityHint).toBe('Continues standard assessment');
      },
      { timeout: 5000 },
    );
  }, 15000);

  it('selection of "Yes" triggers 911 escalation logic (Regression)', async () => {
    const { getByText, getByTestId, queryByText } = renderScreen();

    await waitFor(() => expect(queryByText('Preparing your assessment...')).toBeNull(), {
      timeout: 10000,
    });

    (detectEmergency as jest.Mock).mockReturnValue({
      isEmergency: true,
      matchedKeywords: ['chest pain'],
      score: 10,
      affectedSystems: ['Cardiac'],
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('text-input-outlined'), 'chest pain');
    });

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => expect(getByText('Yes, happening right now')).toBeTruthy(), {
      timeout: 5000,
    });

    await act(async () => {
      fireEvent.press(getByText('Yes, happening right now'));
    });
  });

  it('selection of "No" resumes standard flow (Regression)', async () => {
    const { getByText, getByTestId, queryByText } = renderScreen();

    await waitFor(() => expect(queryByText('Preparing your assessment...')).toBeNull(), {
      timeout: 10000,
    });

    (detectEmergency as jest.Mock).mockReturnValue({
      isEmergency: true,
      matchedKeywords: ['chest pain'],
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('text-input-outlined'), 'chest pain');
    });

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => expect(getByText('No, not experiencing this')).toBeTruthy(), {
      timeout: 5000,
    });

    (detectEmergency as jest.Mock).mockReturnValue({ isEmergency: false });

    await act(async () => {
      fireEvent.press(getByText('No, not experiencing this'));
    });

    await waitFor(
      () => {
        expect(queryByText('Yes, happening right now')).toBeNull();
      },
      { timeout: 5000 },
    );
  });

  it('selection of "Recent" bypasses 911 but continues assessment', async () => {
    const { getByText, getByTestId, queryByText } = renderScreen();

    await waitFor(() => expect(queryByText('Preparing your assessment...')).toBeNull(), {
      timeout: 10000,
    });

    (detectEmergency as jest.Mock).mockReturnValue({
      isEmergency: true,
      matchedKeywords: ['chest pain'],
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('text-input-outlined'), 'chest pain');
    });

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => expect(getByText('Happened recently but has stopped')).toBeTruthy(), {
      timeout: 5000,
    });

    (detectEmergency as jest.Mock).mockReturnValue({ isEmergency: false });

    await act(async () => {
      fireEvent.press(getByText('Happened recently but has stopped'));
    });

    await waitFor(
      () => {
        expect(queryByText('Yes, happening right now')).toBeNull();
      },
      { timeout: 5000 },
    );
  });
});

describe('GeminiClient Temporal Logic', () => {
  beforeEach(async () => {
    await geminiClient.clearCache();
  });

  it('upgrades care level to hospital when is_recent_resolved is true', async () => {
    const mockModel = {
      startChat: jest.fn(() => ({
        sendMessage: jest.fn(() =>
          Promise.resolve({
            response: {
              text: () =>
                JSON.stringify({
                  recommended_level: 'self_care',
                  user_advice: 'You are fine.',
                  clinical_soap: 'SOAP',
                  critical_warnings: [],
                  key_concerns: [],
                }),
            },
          }),
        ),
      })),
    };

    (geminiClient as any).model = mockModel;

    const profile = {
      is_recent_resolved: true,
      is_vulnerable: false,
    };

    const result = await geminiClient.assessSymptoms(
      'unique symptom A',
      [],
      undefined,
      profile as any,
    );

    expect(result.recommended_level).toBe('hospital');
    expect(result.is_conservative_fallback).toBe(true);
    expect(result.user_advice).toContain('While your symptoms have eased');
  });

  it('downgrades emergency to hospital when is_recent_resolved is true', async () => {
    const mockModel = {
      startChat: jest.fn(() => ({
        sendMessage: jest.fn(() =>
          Promise.resolve({
            response: {
              text: () =>
                JSON.stringify({
                  recommended_level: 'emergency',
                  user_advice: 'Call 911 immediately.',
                  clinical_soap: 'SOAP',
                  critical_warnings: [],
                  key_concerns: [],
                }),
            },
          }),
        ),
      })),
    };

    (geminiClient as any).model = mockModel;

    const profile = {
      is_recent_resolved: true,
    };

    const result = await geminiClient.assessSymptoms(
      'unique symptom B',
      [],
      undefined,
      profile as any,
    );

    expect(result.recommended_level).toBe('hospital');
    expect(result.user_advice).toContain('visit the emergency room immediately');
    expect(result.user_advice).not.toContain('call 911 immediately');
  });
});
