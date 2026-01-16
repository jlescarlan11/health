import { TriageEngine } from '../src/services/triageEngine';
import triageFlowRaw from '../assets/triage-flow.json';
import { TriageFlow } from '../src/types/triage';

const triageFlow = triageFlowRaw as unknown as TriageFlow;

describe('Triage Flow Integrity', () => {
  test('should pass structural validation', () => {
    const errors = TriageEngine.validateFlow(triageFlow);
    if (errors.length > 0) {
      console.error('Triage Flow Errors:', errors);
    }
    expect(errors.length).toBe(0);
  });

  test('should have the new q_tropical_check node', () => {
    expect(triageFlow.nodes['q_tropical_check']).toBeDefined();
    expect(triageFlow.nodes['q_tropical_check'].type).toBe('question');
  });

  test('should have the new o_dengue_warning node', () => {
    expect(triageFlow.nodes['o_dengue_warning']).toBeDefined();
    expect(triageFlow.nodes['o_dengue_warning'].type).toBe('outcome');
  });

  test('should follow the correct path for Dengue symptoms', () => {
    // Start -> Emergency signs (No)
    let result = TriageEngine.processStep(triageFlow, 'q_emergency_signs', 'No');
    expect(result.node.id).toBe('q_cardiac_stroke');

    // Cardiac stroke (No)
    result = TriageEngine.processStep(triageFlow, 'q_cardiac_stroke', 'No');
    expect(result.node.id).toBe('q_mental_crisis');

    // Mental crisis (No)
    result = TriageEngine.processStep(triageFlow, 'q_mental_crisis', 'No');
    expect(result.node.id).toBe('q_high_urgency');

    // High urgency (No)
    result = TriageEngine.processStep(triageFlow, 'q_high_urgency', 'No');
    expect(result.node.id).toBe('q_tropical_check');

    // Tropical check (Yes)
    result = TriageEngine.processStep(triageFlow, 'q_tropical_check', 'Yes');
    expect(result.node.id).toBe('q_tropical_signs');

    // Tropical signs (Yes) -> o_dengue_warning
    result = TriageEngine.processStep(triageFlow, 'q_tropical_signs', 'Yes');
    expect(result.node.id).toBe('o_dengue_warning');
    expect(result.isOutcome).toBe(true);
  });
  
  test('should handle No for tropical check correctly', () => {
    // Tropical check (No) -> moderate symptoms
    const result = TriageEngine.processStep(triageFlow, 'q_tropical_check', 'No');
    expect(result.node.id).toBe('q_moderate_symptoms');
  });
});
