export const generateAssessmentPlan = jest.fn();
export const extractClinicalProfile = jest.fn();
export const getGeminiResponse = jest.fn();

export const streamGeminiResponse = jest.fn().mockImplementation(async function* () {
  yield 'Mocked response part 1';
  yield 'Mocked response part 2';
});
