export type TriageLevel = 'self-care' | 'health-center' | 'hospital' | 'emergency';

export interface TriageOption {
  label: string;
  next: string; // ID of the next node
}

export interface TriageRecommendation {
  level: TriageLevel;
  reasoning: string;
  actions: string[];
}

export interface TriageNode {
  id: string;
  type: 'question' | 'outcome';
  text?: string; // Only for 'question' type
  options?: TriageOption[]; // Only for 'question' type
  recommendation?: TriageRecommendation; // Only for 'outcome' type
}

export interface TriageFlow {
  version: string;
  name: string;
  description: string;
  startNode: string;
  nodes: Record<string, TriageNode>;
}
