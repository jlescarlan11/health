import { TriageEngine } from '../src/services/triageEngine';
import { TriageFlow } from '../src/types/triage';

// Mock Triage Flow
const mockFlow: TriageFlow = {
  version: '1.0.0',
  name: 'Test Flow',
  description: 'A test flow',
  startNode: 'q1',
  nodes: {
    q1: {
      id: 'q1',
      type: 'question',
      text: 'Question 1?',
      options: [
        { label: 'Yes', next: 'q2' },
        { label: 'No', next: 'o1' },
      ],
    },
    q2: {
      id: 'q2',
      type: 'question',
      text: 'Question 2?',
      options: [
        { label: 'Yes', next: 'o2' },
        { label: 'No', next: 'o1' },
      ],
    },
    o1: {
      id: 'o1',
      type: 'outcome',
      recommendation: {
        level: 'self-care',
        reasoning: 'Reason 1',
        actions: ['Action 1'],
      },
    },
    o2: {
      id: 'o2',
      type: 'outcome',
      recommendation: {
        level: 'emergency',
        reasoning: 'Reason 2',
        actions: ['Action 2'],
      },
    },
  },
};

describe('TriageEngine', () => {
  test('should return start node', () => {
    const node = TriageEngine.getStartNode(mockFlow);
    expect(node.id).toBe('q1');
    expect(node.type).toBe('question');
  });

  test('should move to next question on "Yes"', () => {
    const result = TriageEngine.processStep(mockFlow, 'q1', 'Yes');
    expect(result.node.id).toBe('q2');
    expect(result.isOutcome).toBe(false);
  });

  test('should move to outcome on "No"', () => {
    const result = TriageEngine.processStep(mockFlow, 'q1', 'No');
    expect(result.node.id).toBe('o1');
    expect(result.isOutcome).toBe(true);
    expect(result.node.recommendation?.level).toBe('self-care');
  });

  test('should be case-insensitive to answers', () => {
    const result = TriageEngine.processStep(mockFlow, 'q1', 'yes');
    expect(result.node.id).toBe('q2');
  });

  test('should throw error for invalid node ID', () => {
    expect(() => TriageEngine.processStep(mockFlow, 'invalid', 'Yes')).toThrow(/not found/);
  });

  test('should throw error for invalid answer', () => {
    expect(() => TriageEngine.processStep(mockFlow, 'q1', 'Maybe')).toThrow(/Invalid answer/);
  });

  test('should throw error when processing answer for an outcome', () => {
    expect(() => TriageEngine.processStep(mockFlow, 'o1', 'Yes')).toThrow(/Cannot process answer/);
  });

  test('should support robust answer matching (Yes variations)', () => {
    const variations = ['y', 'yeah', 'yep', 'correct', 'true', 'YES '];
    variations.forEach(v => {
      const result = TriageEngine.processStep(mockFlow, 'q1', v);
      expect(result.node.id).toBe('q2');
    });
  });

  test('should support robust answer matching (No variations)', () => {
    const variations = ['n', 'nope', 'nah', 'incorrect', 'false', ' NO'];
    variations.forEach(v => {
      const result = TriageEngine.processStep(mockFlow, 'q1', v);
      expect(result.node.id).toBe('o1');
    });
  });

  test('should calculate estimated remaining steps', () => {
    expect(TriageEngine.getEstimatedRemainingSteps(mockFlow, 'q1')).toBe(2);
    expect(TriageEngine.getEstimatedRemainingSteps(mockFlow, 'q2')).toBe(1);
    expect(TriageEngine.getEstimatedRemainingSteps(mockFlow, 'o1')).toBe(0);
  });

  test('should validate a correct flow', () => {
    const errors = TriageEngine.validateFlow(mockFlow);
    expect(errors.length).toBe(0);
  });

  test('should detect errors in an invalid flow', () => {
    const invalidFlow: any = {
      version: '1.0.0',
      name: 'Invalid Flow',
      startNode: 'missing',
      nodes: {
        q1: {
          id: 'q1',
          type: 'question',
          options: [{ label: 'Yes', next: 'non-existent' }],
        },
        o1: {
          id: 'o1',
          type: 'outcome',
          // missing recommendation
        },
      },
    };
    const errors = TriageEngine.validateFlow(invalidFlow);
    expect(errors).toContain('Start node "missing" does not exist.');
    expect(errors).toContain('Question node "q1" points to non-existent node "non-existent".');
    expect(errors).toContain('Outcome node "o1" is missing a recommendation.');
  });
});
