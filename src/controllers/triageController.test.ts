import { type Request, type Response } from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../services/geminiService', () => ({
  geminiService: {
    extractClinicalProfile: vi.fn(),
    assessSymptoms: vi.fn(),
    generateRecommendationNarratives: vi.fn(),
    generateBridgeMessage: vi.fn(),
  },
}));

vi.mock('../services/aiService', () => ({
  selectFacilitiesForRecommendation: vi.fn(),
}));

vi.mock('../services/triage/TriageArbiter', () => ({
  TriageArbiter: {
    evaluateAssessmentState: vi.fn(),
  },
}));

vi.mock('../utils/aiUtils', () => ({
  checkCriticalSystemKeywords: vi.fn(),
}));

import { assessV1 } from './triageController';
import { geminiService } from '../services/geminiService';
import { selectFacilitiesForRecommendation } from '../services/aiService';
import { TriageArbiter } from '../services/triage/TriageArbiter';
import { checkCriticalSystemKeywords } from '../utils/aiUtils';

const mockedGeminiService = vi.mocked(geminiService, true);
const mockedSelectFacilities = vi.mocked(selectFacilitiesForRecommendation);
const mockedArbiter = vi.mocked(TriageArbiter, true);
const mockedCheckCritical = vi.mocked(checkCriticalSystemKeywords);

const minimalRequestBody = {
  history: [{ role: 'user', text: 'I have a headache' }],
  currentTurn: 1,
  totalPlannedQuestions: 1,
  remainingQuestions: [],
  initialSymptom: 'headache',
};

const mockProfile = {
  age: 35,
  duration: null,
  severity: null,
  progression: null,
  red_flag_denials: null,
  summary: 'mock profile',
};

const finalAssessment = {
  recommended_level: 'self_care',
  user_advice: 'Continue hydration',
  follow_up_questions: [],
  clinical_soap: 'S: Headache. O: Normal. A: None. P: Rest.',
  key_concerns: [],
  critical_warnings: [],
  relevant_services: [],
  red_flags: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedGeminiService.extractClinicalProfile.mockResolvedValue(mockProfile);
  mockedCheckCritical.mockReturnValue(null);
  mockedArbiter.evaluateAssessmentState.mockReturnValue({
    signal: 'TERMINATE',
    reason: 'ready',
    nextSteps: [],
  });
  mockedGeminiService.assessSymptoms.mockResolvedValue(finalAssessment);
  mockedSelectFacilities.mockResolvedValue([]);
  mockedGeminiService.generateRecommendationNarratives.mockResolvedValue({
    recommendationNarrative: 'Plan ready',
    handoverNarrative: 'handover',
  });
});

const buildResponseMocks = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  const res = { json, status } as unknown as Response;
  return { res, json, status };
};

describe('triageController.assessV1', () => {
  it('accepts numeric updatedProfile.age without schema errors', async () => {
    const { res, json } = buildResponseMocks();
    const req = { body: minimalRequestBody } as Request;

    await assessV1(req, res);

    expect(json).toHaveBeenCalled();
    const payload = json.mock.calls[0][0];
    expect(payload).toHaveProperty('updatedProfile.age', 35);
    expect(res.status).not.toHaveBeenCalledWith(400);
  });
});
