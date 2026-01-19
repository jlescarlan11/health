import { TriageArbiter, ChatHistoryItem } from '../triageArbiter';
import { AssessmentProfile } from '../../types/triage';

describe('TriageArbiter Coherence & Completeness', () => {
  const mockHistory: ChatHistoryItem[] = [
    { role: 'assistant', text: 'Tell me about your symptoms' },
    { role: 'user', text: 'I have a fever' },
  ];

  const baseProfile: AssessmentProfile = {
    age: '25',
    duration: '2 days',
    severity: 'moderate',
    progression: 'worsening',
    red_flag_denials: 'none',
    uncertainty_accepted: false,
    summary: 'Testing',
    triage_readiness_score: 0.95,
    ambiguity_detected: false,
    internal_consistency_score: 1.0,
    red_flags_resolved: true
  };

  describe('Mandatory Safety Gates', () => {
    it('should deny termination if red flags are not resolved', () => {
      const profile = { ...baseProfile, red_flags_resolved: false };
      const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 5, []);
      expect(result.signal).toBe('CONTINUE');
      expect(result.reason).toContain('MANDATORY SAFETY GATE: Red flags remain unresolved');
    });

    it('should force red-flag prioritization if flags are not resolved and unattempted checks remain', () => {
      const profile = { ...baseProfile, red_flags_resolved: false };
      const remaining = [{ is_red_flag: true }];
      const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 5, remaining);
      expect(result.signal).toBe('PRIORITIZE_RED_FLAGS');
    });
  });

  describe('Clinical Coherence (Stage B)', () => {
    it('should return RESOLVE_AMBIGUITY if ambiguity_detected is true regardless of readiness', () => {
      const profile = { ...baseProfile, ambiguity_detected: true, triage_readiness_score: 1.0, uncertainty_accepted: false };
      const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 5, []);
      expect(result.signal).toBe('RESOLVE_AMBIGUITY');
      expect(result.reason).toContain('COHERENCE FAIL: Unresolved clinical ambiguity');
    });

    it('should allow TERMINATE if ambiguity_detected is true but uncertainty_accepted is true', () => {
      const profile = { ...baseProfile, ambiguity_detected: true, uncertainty_accepted: true };
      const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 4, []);
      expect(result.signal).toBe('TERMINATE');
    });

    it('should block termination if symptom progression is missing', () => {
      const profile = { ...baseProfile, progression: null };
      const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 5, []);
      expect(result.signal).toBe('CONTINUE');
      expect(result.reason).toContain('COHERENCE FAIL: Symptom progression');
    });

    it('should deny termination if internal consistency is low', () => {
      const profile = { ...baseProfile, internal_consistency_score: 0.80 };
      const remaining = [{ tier: 3 }];
      const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 5, remaining);
      expect(result.signal).toBe('CONTINUE');
      expect(result.reason).toContain('COHERENCE FAIL: Inconsistency detected');
    });
  });

  describe('Data Completeness (Stage A)', () => {
    it('should deny termination if critical slots are missing', () => {
      const profile = { ...baseProfile, age: null };
      const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 5, []);
      expect(result.signal).toBe('CONTINUE');
      expect(result.reason).toContain('COMPLETENESS FAIL: Missing critical slots');
    });

    it('should deny termination if triage_readiness_score < 0.90', () => {
      const profile = { ...baseProfile, triage_readiness_score: 0.85 };
      const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 5, []);
      expect(result.signal).toBe('CONTINUE');
      expect(result.reason).toContain('READINESS FAIL: Triage readiness score');
    });
  });

  it('should deny termination if turn floor not reached for simple category (Turn 3)', () => {
    const profile = { ...baseProfile, symptom_category: 'simple' as const };
    const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 3, 3, []);
    expect(result.signal).toBe('CONTINUE');
    expect(result.reason).toContain('GUARDRAIL: Turn floor not reached');
  });

  it('should allow termination for simple category at Turn 4', () => {
    const profile = { ...baseProfile, symptom_category: 'simple' as const };
    const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 4, []);
    expect(result.signal).toBe('TERMINATE');
  });

  it('should deny termination if turn floor not reached for complex category (Turn 5)', () => {
    const profile = { ...baseProfile, symptom_category: 'complex' as const };
    const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 5, 5, []);
    expect(result.signal).toBe('CONTINUE');
    expect(result.reason).toContain('GUARDRAIL: Turn floor not reached for complex');
  });

  it('should terminate only if both Coherence and Completeness pass and turn floor is reached (Turn 7 complex)', () => {
    const profile = { ...baseProfile, symptom_category: 'complex' as const };
    const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 7, 7, []);
    expect(result.signal).toBe('TERMINATE');
    expect(result.reason).toContain('CLINICAL CLOSURE');
  });
});