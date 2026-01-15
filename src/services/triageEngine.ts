import { TriageFlow, TriageNode, TriageOption } from '../types/triage';

export interface TriageStepResult {
  node: TriageNode;
  isOutcome: boolean;
}

export class TriageError extends Error {
  constructor(message: string, public code: 'INVALID_NODE' | 'INVALID_ANSWER' | 'FLOW_NOT_FOUND' | 'OUTCOME_REACHED') {
    super(message);
    this.name = 'TriageError';
  }
}

/**
 * TriageEngine handles the deterministic traversal of the "Killer Questions" triage tree.
 * It is designed to be stateless, accepting the current state and returning the next.
 */
export class TriageEngine {
  /**
   * Gets the starting node of a triage flow.
   */
  public static getStartNode(flow: TriageFlow): TriageNode {
    const node = flow.nodes[flow.startNode];
    if (!node) {
      throw new TriageError(`Start node "${flow.startNode}" not found in flow "${flow.name}".`, 'FLOW_NOT_FOUND');
    }
    return node;
  }

  /**
   * Processes a user's answer for the current question node and returns the next node.
   * 
   * @param flow The full triage flow definition
   * @param currentNodeId The ID of the question currently being asked
   * @param answer The user's response (e.g., "Yes" or "No")
   * @returns The next node (either another question or a final outcome)
   */
  public static processStep(flow: TriageFlow, currentNodeId: string, answer: string): TriageStepResult {
    const currentNode = flow.nodes[currentNodeId];

    if (!currentNode) {
      throw new TriageError(`Node with ID "${currentNodeId}" not found.`, 'INVALID_NODE');
    }

    if (currentNode.type === 'outcome') {
      throw new TriageError(`Cannot process answer for an outcome node "${currentNodeId}".`, 'OUTCOME_REACHED');
    }

    if (!currentNode.options) {
      throw new TriageError(`Question node "${currentNodeId}" has no options defined.`, 'INVALID_NODE');
    }

    // Case-insensitive search for the matching option label
    const selectedOption = currentNode.options.find(
      (opt: TriageOption) => opt.label.toLowerCase() === answer.toLowerCase()
    );

    if (!selectedOption) {
      throw new TriageError(`Invalid answer "${answer}" for question "${currentNodeId}".`, 'INVALID_ANSWER');
    }

    const nextNode = flow.nodes[selectedOption.next];
    if (!nextNode) {
      throw new TriageError(`Next node "${selectedOption.next}" not found in flow.`, 'INVALID_NODE');
    }

    return {
      node: nextNode,
      isOutcome: nextNode.type === 'outcome',
    };
  }

  /**
   * Helper to validate the entire flow structure (useful for development/tests).
   */
  public static validateFlow(flow: TriageFlow): string[] {
    const errors: string[] = [];
    
    if (!flow.nodes[flow.startNode]) {
      errors.push(`Start node "${flow.startNode}" does not exist.`);
    }

    Object.entries(flow.nodes).forEach(([id, node]) => {
      if (node.type === 'question') {
        if (!node.options || node.options.length === 0) {
          errors.push(`Question node "${id}" has no options.`);
        } else {
          node.options.forEach(opt => {
            if (!flow.nodes[opt.next]) {
              errors.push(`Question node "${id}" points to non-existent node "${opt.next}".`);
            }
          });
        }
      } else if (node.type === 'outcome') {
        if (!node.recommendation) {
          errors.push(`Outcome node "${id}" is missing a recommendation.`);
        }
      }
    });

    return errors;
  }
}
