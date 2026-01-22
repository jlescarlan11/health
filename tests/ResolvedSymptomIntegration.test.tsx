import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import RecommendationScreen from '../src/screens/RecommendationScreen';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import navigationSlice from '../src/store/navigationSlice';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { geminiClient } from '../src/api/geminiClient';
import { streamGeminiResponse, generateAssessmentPlan, extractClinicalProfile } from '../src/services/gemini';
import { detectEmergency } from '../src/services/emergencyDetector';

// Mock Gemini Services
jest.mock('../src/services/gemini', () => ({
  generateAssessmentPlan: jest.fn(() => Promise.resolve({
    questions: [
      { id: 'q1', text: 'Tell me more.', type: 'text' }
    ],
    intro: 'Hi'
  })),
  extractClinicalProfile: jest.fn(() => Promise.resolve({
    triage_readiness_score: 0.95, // High readiness to trigger termination
    summary: 'Test summary',
    is_recent_resolved: true,
    resolved_keyword: 'chest pain'
  })),
  getGeminiResponse: jest.fn(() => Promise.resolve('Test response')),
  streamGeminiResponse: jest.fn(() => ({
    [Symbol.asyncIterator]: () => {
      let done = false;
      return {
        next: () => {
          if (done) return Promise.resolve({ value: undefined, done: true });
          done = true;
          return Promise.resolve({ value: 'chunk', done: false });
        }
      };
    }
  })),
}));

// Mock Gemini Client
jest.mock('../src/api/geminiClient', () => ({
  geminiClient: {
    assessSymptoms: jest.fn(() => Promise.resolve({
      recommended_level: 'hospital',
      user_advice: 'Safety Note applied.',
      clinical_soap: 'SOAP',
      critical_warnings: [],
      key_concerns: [],
      relevant_services: [],
      red_flags: []
    })),
    clearCache: jest.fn()
  }
}));

jest.mock('../src/services/emergencyDetector', () => ({
  detectEmergency: jest.fn(),
  isNegated: jest.fn(() => ({ negated: false })),
  COMBINATION_RISKS: []
}));

const Stack = createNativeStackNavigator();

const renderAssessment = (initialParams = { initialSymptom: 'General Malaise' }) => {
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
          <Stack.Screen name="Recommendation" component={RecommendationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
};

describe('Resolved Symptom Prompt Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (detectEmergency as jest.Mock).mockReturnValue({ isEmergency: false });
  });

  it('prepends [RECENT_RESOLVED] tag to followUpPrompt during expansion', async () => {
    // Force the arbiter/termination check to fail so it goes into expansion
    (extractClinicalProfile as jest.Mock).mockResolvedValue({
      triage_readiness_score: 0.5,
      is_recent_resolved: true,
      resolved_keyword: 'chest pain',
      summary: 'Chest pain resolved'
    });

    const { getByText, getByTestId, queryByText } = renderAssessment();

    await waitFor(() => expect(queryByText('Preparing your assessment...')).toBeNull());

    // 1. Trigger verification by typing a keyword that triggers emergency check
    (detectEmergency as jest.Mock).mockReturnValue({ 
      isEmergency: true, 
      matchedKeywords: ['chest pain'],
      score: 10
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('text-input-outlined'), 'chest pain stopped');
    });
    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    // 2. Select "Recent"
    await waitFor(() => expect(getByText('Happened recently but has stopped')).toBeTruthy());
    
    (detectEmergency as jest.Mock).mockReturnValue({ isEmergency: false });
    await act(async () => {
      fireEvent.press(getByText('Happened recently but has stopped'));
    });

    // 3. Wait for expansion (since readiness is 0.5 and plan is short)
    await waitFor(() => {
      expect(streamGeminiResponse).toHaveBeenCalledWith(
        expect.stringContaining('[RECENT_RESOLVED: chest pain]')
      );
    }, { timeout: 10000 });
  }, 15000);

  it('prepends [RECENT_RESOLVED] tag to assessSymptoms context in RecommendationScreen', async () => {
    // Mock profile to trigger immediate termination
    (extractClinicalProfile as jest.Mock).mockResolvedValue({
      triage_readiness_score: 1.0,
      is_recent_resolved: true,
      resolved_keyword: 'chest pain',
      summary: 'Chest pain resolved'
    });

    const { getByText, getByTestId, queryByText } = renderAssessment();

    await waitFor(() => expect(queryByText('Preparing your assessment...')).toBeNull());

    // 1. Answer first question to trigger termination
    (detectEmergency as jest.Mock).mockReturnValue({ isEmergency: false });

    await act(async () => {
      fireEvent.changeText(getByTestId('text-input-outlined'), 'Happened 10 mins ago');
    });
    
    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    // 2. Wait for transition to RecommendationScreen
    await waitFor(() => {
      expect(geminiClient.assessSymptoms).toHaveBeenCalledWith(
        expect.stringContaining('[RECENT_RESOLVED: chest pain]'),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ is_recent_resolved: true })
      );
    }, { timeout: 10000 });
  }, 15000);
});
