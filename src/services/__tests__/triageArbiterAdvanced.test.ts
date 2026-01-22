import { TriageArbiter, ChatHistoryItem } from '../triageArbiter';
import { AssessmentProfile } from '../../types/triage';

describe('TriageArbiter Coherence & Safety Safeguards', () => {
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
    red_flags_resolved: true,
  };

  const remainingQuestions = [
    { id: 'q1', text: 'Normal Q' },
    { id: 'rf1', text: 'Red Flag Q', is_red_flag: true },
    { id: 't3', text: 'Tier 3 Q', tier: 3 },
  ];

  it('should block termination due to ambiguity even if extraction readiness is 100%', () => {
    const profile = {
      ...baseProfile,
      ambiguity_detected: true,
      triage_readiness_score: 1.0,
    };
    const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 5, []);
    expect(result.signal).toBe('RESOLVE_AMBIGUITY');
    expect(result.reason).toContain('Unresolved clinical ambiguity');
  });

  it('should block termination if symptom progression is missing (Incoherent Case)', () => {
    const profile = { ...baseProfile, progression: null };
    const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 5, []);
    expect(result.signal).toBe('CONTINUE');
    expect(result.reason).toContain('Symptom progression (worsening/improving) is missing');
  });

  it('should force red-flag prioritization regardless of turn count or completeness', () => {
    const profile = { ...baseProfile, red_flags_resolved: false };
    const result = TriageArbiter.evaluateAssessmentState(
      mockHistory,
      profile,
      1,
      10,
      remainingQuestions,
    );
    expect(result.signal).toBe('PRIORITIZE_RED_FLAGS');
    expect(result.reason).toContain('MANDATORY SAFETY GATE');
  });

  it('should deny termination and trigger reset if severe contradiction is found', () => {
    const profile = {
      ...baseProfile,
      internal_consistency_score: 0.5,
      internal_inconsistency_detected: true,
    };
    const result = TriageArbiter.evaluateAssessmentState(mockHistory, profile, 4, 5, []);
    expect(result.signal).toBe('REQUIRE_CLARIFICATION');
    expect(result.needs_reset).toBe(true);
  });
});
