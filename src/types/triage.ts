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

export interface AssessmentProfile {
  age: string | null;
  duration: string | null;
  severity: string | null;
  progression: string | null;
  red_flag_denials: string | null;
  summary: string;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  options?: string[];
}

export interface AssessmentData {
  symptoms: string;
  answers: { question: string; answer: string }[];
  offlineRecommendation?: TriageRecommendation;
  extractedProfile?: AssessmentProfile;
}
