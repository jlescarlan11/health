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
  triage_readiness_score?: number;
  ambiguity_detected?: boolean;
  internal_inconsistency_detected?: boolean;
  internal_consistency_score?: number;
  red_flags_resolved?: boolean;
  uncertainty_accepted?: boolean; // True if user explicitly says "I don't know" for a core slot
  clinical_friction_detected?: boolean;
  clinical_friction_details?: string;
  is_complex_case?: boolean;
  is_vulnerable?: boolean;
  symptom_category?: 'simple' | 'complex' | 'critical';
  denial_confidence?: 'high' | 'medium' | 'low';
  turn_count?: number;
}

export interface GroupedOption {
  category: string;
  items: string[];
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  type?: 'text' | 'multi-select' | 'single-select' | 'number';
  options?: string[] | GroupedOption[];
  tier?: number;
  is_red_flag?: boolean;
}

export interface AssessmentData {
  symptoms: string;
  answers: { question: string; answer: string }[];
  offlineRecommendation?: TriageRecommendation;
  extractedProfile?: AssessmentProfile;
  affectedSystems?: string[];
}
