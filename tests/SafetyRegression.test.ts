import { detectEmergency } from '../src/services/emergencyDetector';
import { detectMentalHealthCrisis } from '../src/services/mentalHealthDetector';
import goldenSet from './fixtures/emergency_golden_set.json';

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

describe('Safety Regression Golden Set', () => {
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
