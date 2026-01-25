import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { detectEmergency } from '../src/services/emergencyDetector';
import { detectMentalHealthCrisis } from '../src/services/mentalHealthDetector';
import { calculateTriageScore } from '../src/utils/aiUtils';
import SymptomAssessmentScreen from '../src/screens/SymptomAssessmentScreen';
import { geminiClient } from '../src/api/geminiClient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { navigationReducer, settingsReducer } from '../src/store';
import goldenSet from './fixtures/emergency_golden_set.json';

// --- MOCKS ---

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('../src/services/emergencyDetector', () => {
  const actual = jest.requireActual('../src/services/emergencyDetector');
  return {
    ...actual,
    detectEmergency: jest.fn(actual.detectEmergency),
  };
});

jest.mock('../src/services/mentalHealthDetector', () => {
  const actual = jest.requireActual('../src/services/mentalHealthDetector');
  return {
    ...actual,
    detectMentalHealthCrisis: jest.fn(actual.detectMentalHealthCrisis),
  };
});

let planSpy: jest.SpyInstance;
let profileSpy: jest.SpyInstance;
let streamSpy: jest.SpyInstance;
let responseSpy: jest.SpyInstance;

// Mock components to simplify screen rendering
jest.mock('../src/components/common', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    InputCard: React.forwardRef(() => <View testID="input-card" />),
    TypingIndicator: () => <View testID="typing-indicator" />,
    ProgressBar: () => <View testID="progress-bar" />,
    MultiSelectChecklist: () => <View testID="multi-select-checklist" />,
  };
});

jest.mock('../src/components/common/StandardHeader', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="header" />,
  };
});

// --- TYPES ---

interface ExpectedResult {
  isEmergency?: boolean;
  isCrisis?: boolean;
  minScore?: number;
  maxScore?: number;
}

interface TestCase {
  description: string;
  input: string;
  detector: 'emergency' | 'mental_health';
  expected: ExpectedResult;
}

// --- SUITE ---

describe('Safety Regression Suite', () => {
  const mockNavigate = jest.fn();
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    planSpy = jest.spyOn(geminiClient, 'generateAssessmentPlan').mockResolvedValue({
      questions: [{ id: 'red_flags', text: 'Do you have symptoms?' }],
      intro: 'Intro',
    });
    profileSpy = jest
      .spyOn(geminiClient, 'extractClinicalProfile')
      .mockResolvedValue({ triage_readiness_score: 0.5 } as any);
    streamSpy = jest
      .spyOn(geminiClient, 'streamGeminiResponse')
      .mockImplementation(async function* () {
        yield 'chunk';
      });
    responseSpy = jest.spyOn(geminiClient, 'getGeminiResponse').mockResolvedValue('Test response');
    (useNavigation as jest.Mock).mockReturnValue({
      replace: mockNavigate,
      goBack: jest.fn(),
    });
    store = configureStore({
      reducer: combineReducers({
        navigation: navigationReducer,
        settings: settingsReducer,
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Golden Set Detectors', () => {
    (goldenSet as TestCase[]).forEach((testCase) => {
      it(`${testCase.detector.toUpperCase()}: ${testCase.description} ("${testCase.input}")`, () => {
        if (testCase.detector === 'emergency') {
          const result = detectEmergency(testCase.input, { isUserInput: true });

          if (testCase.expected.isEmergency !== undefined) {
            expect(result.isEmergency).toBe(testCase.expected.isEmergency);
          }

          if (testCase.expected.minScore !== undefined) {
            expect(result.score).toBeGreaterThanOrEqual(testCase.expected.minScore);
          }

          if (testCase.expected.maxScore !== undefined) {
            expect(result.score).toBeLessThanOrEqual(testCase.expected.maxScore);
          }
        } else if (testCase.detector === 'mental_health') {
          const result = detectMentalHealthCrisis(testCase.input);

          if (testCase.expected.isCrisis !== undefined) {
            expect(result.isCrisis).toBe(testCase.expected.isCrisis);
          }

          if (testCase.expected.minScore !== undefined) {
            expect(result.score).toBeGreaterThanOrEqual(testCase.expected.minScore);
          }

          if (testCase.expected.maxScore !== undefined) {
            expect(result.score).toBeLessThanOrEqual(testCase.expected.maxScore);
          }
        }
      });
    });
  });

  describe('High Risk Bypass (Score 10)', () => {
    it('should bypass chat flow for high-risk emergency inputs (Score 10)', async () => {
      (useRoute as jest.Mock).mockReturnValue({
        params: { initialSymptom: 'I am having crushing chest pain' },
      });

      render(
        <ReduxProvider store={store}>
          <SymptomAssessmentScreen />
        </ReduxProvider>,
      );

      // Should immediately replace with Recommendation screen
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Recommendation', expect.any(Object));
      });
    });

    it('should bypass chat flow for high-risk mental health crisis (Score 10)', async () => {
      (useRoute as jest.Mock).mockReturnValue({
        params: { initialSymptom: 'I want to kill myself' },
      });

      render(
        <ReduxProvider store={store}>
          <SymptomAssessmentScreen />
        </ReduxProvider>,
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Recommendation', expect.any(Object));
      });
    });
  });

  describe('Triage Score Safety Assertions', () => {
    it('should never return a score > 0.9 when red_flags_resolved is false', () => {
      // Test with all other slots filled (would normally be 1.0)
      const slots = {
        age: '30',
        duration: '2 days',
        severity: 'mild',
        progression: 'stable',
        red_flags_resolved: false,
        symptom_category: 'simple' as const,
      };

      const { score } = calculateTriageScore(slots);
      expect(score).toBeLessThanOrEqual(0.9);
      expect(score).toBeLessThanOrEqual(0.4); // Specificity check for the current floor
    });

    it('should respect the red flags safety floor even with Adaptive Scoring', () => {
      // Adaptive scoring waives age/progression for simple low-risk cases
      const slots = {
        duration: '1 hour',
        severity: 'mild (2/10)',
        red_flags_resolved: false,
        symptom_category: 'simple' as const,
      };

      const { score } = calculateTriageScore(slots);
      expect(score).toBeLessThanOrEqual(0.9);
      expect(score).toBeLessThanOrEqual(0.4);
    });

    it('should cap score at 0.4 if red flags are NOT resolved', () => {
      const slots = {
        age: '45',
        duration: '1 week',
        severity: '5/10',
        progression: 'worsening',
        red_flags_resolved: false,
      };
      const { score } = calculateTriageScore(slots);
      expect(score).toBeLessThanOrEqual(0.4);
    });
  });

  describe('Red Flag Triage Flow', () => {
    it('should ensure Red Flag inputs are prioritized when identified', async () => {
      const { prioritizeQuestions } = require('../src/utils/aiUtils');
      const questions = [
        { id: 'age', text: 'How old are you?' },
        { id: 'duration', text: 'How long?' },
        { id: 'other', text: 'Something else' },
        { id: 'red_flags', text: 'Any chest pain?' },
      ];

      const prioritized = prioritizeQuestions(questions);
      // red_flags should be at index 1 (after first question usually)
      expect(prioritized[1].id).toBe('red_flags');
    });

    it('should inject default red_flags question if missing (Safety Fallback)', () => {
      const { prioritizeQuestions } = require('../src/utils/aiUtils');
      const questions = [{ id: 'age', text: 'How old are you?' }];

      const prioritized = prioritizeQuestions(questions);

      // Should have injected the question
      expect(prioritized.length).toBe(2);
      const redFlagQuestion = prioritized.find((q: any) => q.id === 'red_flags');
      expect(redFlagQuestion).toBeDefined();
      expect(redFlagQuestion.is_red_flag).toBe(true);
      // Check that it's the default one
      expect(redFlagQuestion.text).toContain('To ensure your safety');
    });
  });
});
