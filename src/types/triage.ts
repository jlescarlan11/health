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

export type SystemCategory = 'Cardiac' | 'Respiratory' | 'Neurological' | 'Acute Abdomen';

export interface SystemLockConfig {
  system: SystemCategory;
  keywords: string[];
  escalationCategory: 'complex' | 'critical';
}

/**
 * SYSTEM-BASED LOCK CONFIGURATION
 * 
 * This map defines the deterministic overrides for the triage system.
 * If any keyword within a system is detected in the user's symptom description,
 * the triage category is automatically escalated to the target category.
 * 
 * Safety Rationale: LLMs can occasionally under-triage systemic or internal 
 * symptoms as "simple" if they are described with low qualitative severity. 
 * These locks ensure that high-stakes anatomical systems always trigger 
 * high-resolution assessment protocols (longer turn floors, Tier 3 rule-outs).
 */
export const SYSTEM_LOCK_KEYWORD_MAP: Record<SystemCategory, SystemLockConfig> = {
  Cardiac: {
    system: 'Cardiac',
    escalationCategory: 'critical',
    keywords: [
      'chest pain', 'chest pressure', 'chest tightness', 'squeezing chest',
      'heart attack', 'myocardial infarction', 'palpitations', 'racing heart',
      'skipped beats', 'pain in left arm', 'pain in jaw', 'radiating pain',
    ],
  },
  Respiratory: {
    system: 'Respiratory',
    escalationCategory: 'critical',
    keywords: [
      'shortness of breath', 'difficulty breathing', 'hard to breathe',
      'cant breathe', 'struggling to breathe', 'gasping', 'breathless',
      'wheezing', 'choking', 'cyanosis', 'blue lips', 'asthma attack',
    ],
  },
  Neurological: {
    system: 'Neurological',
    escalationCategory: 'critical',
    keywords: [
      'numbness', 'tingling', 'weakness', 'facial drooping', 'slurred speech',
      'confusion', 'disorientation', 'seizure', 'convulsion', 'passed out',
      'fainted', 'loss of consciousness', 'vision loss', 'worst headache',
      'thunderclap headache', 'stiff neck', 'paralysis', 'unconscious',
      'unconsious',
    ],
  },
  'Acute Abdomen': {
    system: 'Acute Abdomen',
    escalationCategory: 'complex',
    keywords: [
      'severe stomach pain', 'abdominal pain', 'rigid abdomen', 'hard stomach',
      'abdominal guarding', 'appendicitis', 'peritonitis', 'intense belly pain',
    ],
  },
};

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
  affected_systems?: SystemCategory[];
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
