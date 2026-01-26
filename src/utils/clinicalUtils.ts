import { normalizeNumericValue } from './stringUtils';
import type { AssessmentProfile, QuestionSlotGoal } from '../types/triage';
import type { HealthProfile } from '../types';

export interface SoapSections {
  s?: string;
  o?: string;
  a?: string;
  p?: string;
}

/**
 * Parses a clinical SOAP note string into its constituent sections.
 * Supports both "S: O: A: P:" format and JSON format.
 */
export const parseSoap = (text: string): SoapSections => {
  // Basic regex to capture content between markers
  const sMatch = text.match(/S:\s*([\s\S]*?)(?=\s*O:|$)/);
  const oMatch = text.match(/O:\s*([\s\S]*?)(?=\s*A:|$)/);
  const aMatch = text.match(/A:\s*([\s\S]*?)(?=\s*P:|$)/);
  const pMatch = text.match(/P:\s*([\s\S]*?)$/);

  // If regex parsing fails, try parsing as JSON
  if (!sMatch && !oMatch && !aMatch && !pMatch) {
    try {
      const json = JSON.parse(text);
      if (json.subjective || json.objective) {
        return {
          s: json.subjective,
          o: json.objective,
          a: json.assessment,
          p: json.plan,
        };
      }
    } catch (_) {
      // Not JSON, fall back to undefined sections
    }
  }

  return {
    s: sMatch ? sMatch[1].trim() : undefined,
    o: oMatch ? oMatch[1].trim() : undefined,
    a: aMatch ? aMatch[1].trim() : undefined,
    p: pMatch ? pMatch[1].trim() : undefined,
  };
};

/**
 * Formats clinical data into a plain-text string for sharing.
 */
export const formatClinicalShareText = (
  clinicalSoap: string,
  timestamp: number,
  medicalJustification?: string,
): string => {
  const formattedDate = new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const sections = parseSoap(clinicalSoap);
  const hasSections = !!(sections.s || sections.o || sections.a || sections.p);

  let shareText = `CLINICAL HANDOVER REPORT\nDate: ${formattedDate}\n\n`;

  if (hasSections) {
    if (sections.s) shareText += `SUBJECTIVE (History):\n${sections.s}\n\n`;
    if (sections.o) shareText += `OBJECTIVE (Signs):\n${sections.o}\n\n`;

    const assessment = sections.a || '';
    if (assessment) shareText += `ASSESSMENT (Triage):\n${assessment}\n\n`;

    if (sections.p) shareText += `PLAN (Next Steps):\n${sections.p}\n`;
  } else {
    shareText += clinicalSoap;
  }

  return shareText.trim();
};

/**
 * Detects if the user context is maternal (pregnancy-related)
 */
export const isMaternalContext = (text: string): boolean => {
  const maternalKeywords = [
    /\bbuntis\b/i,
    /\bpregnant\b/i,
    /\bprenatal\b/i,
    /\bmaternity\b/i,
    /\bnaglilihi\b/i,
    /\bkabwanan\b/i,
  ];
  return maternalKeywords.some((regex) => regex.test(text));
};

const TRAUMA_KEYWORDS = {
  falls: [
    'fall',
    'fell',
    'slip',
    'slipped',
    'trip',
    'tripped',
    'stumble',
    'stumbled',
    'nahulog',
    'natumba',
    'nadulas',
    'natisod',
    'bumagsak',
  ],
  vehicleAccidents: [
    'accident',
    'vehicle accident',
    'car accident',
    'motorcycle accident',
    'road accident',
    'traffic accident',
    'hit by car',
    'hit by motorcycle',
    'aksidente sa sasakyan',
    'aksidente sa kalsada',
    'naaksidente',
    'bangga ng sasakyan',
    'nabundol',
    'nahagip',
    'bangga',
    'nabangga',
    'salpog',
  ],
  penetratingInjuries: [
    'stab',
    'stabbed',
    'stabbing',
    'gunshot',
    'shot',
    'penetrating wound',
    'puncture',
    'saksak',
    'sinaksak',
    'tama ng bala',
    'binarel',
    'butas',
    'penetrating na sugat',
  ],
  burns: [
    'burn',
    'burned',
    'burnt',
    'scald',
    'scalded',
    'thermal burn',
    'chemical burn',
    'paso',
    'napaso',
    'nasunog',
  ],
  fractures: [
    'fracture',
    'fractured',
    'broken bone',
    'broken arm',
    'broke arm',
    'bone break',
    'crack',
    'bali',
    'nabali',
    'bitak na buto',
    'nabiyak',
    'nabiyak na buto',
  ],
  sprains: [
    'sprain',
    'sprained',
    'twisted ankle',
    'ligament injury',
    'pilay',
    'napilay',
    'nabaliko',
  ],
  collisions: [
    'collision',
    'crash',
    'impact',
    'struck',
    'blunt trauma',
    'bangga',
    'nabangga',
    'salpok',
    'salpog',
    'tama',
    'tinamaan',
    'natamaan',
  ],
  generalTrauma: [
    'trauma',
    'injury',
    'wound',
    'laceration',
    'cut',
    'bleeding',
    'pinsala',
    'sugat',
    'hiwa',
    'pagdurugo',
    'nasugatan',
    'nasakit',
  ],
} as const;

const TRAUMA_KEYWORD_LIST = Object.values(TRAUMA_KEYWORDS).flat();

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildKeywordPattern = (keyword: string): string => {
  const parts = keyword.trim().split(/\s+/).map(escapeRegex);
  return parts.join('(?:-|\\s+)');
};

const TRAUMA_REGEX = new RegExp(
  `\\b(?:${TRAUMA_KEYWORD_LIST.map(buildKeywordPattern).join('|')})\\b`,
  'i',
);

/**
 * Detects if the user context is trauma-related (injury-related)
 */
export const isTraumaContext = (text: string): boolean => {
  if (!text) return false;
  return TRAUMA_REGEX.test(text);
};

/**
 * Normalizes age input to a number
 */
export const normalizeAge = (age: string | null): number | null => {
  const normalized = normalizeNumericValue(age);
  if (normalized === null || Number.isNaN(normalized)) return null;
  return Math.floor(normalized);
};

export interface ClinicalSlots {
  age?: string;
  duration?: string;
  severity?: string;
  temperature?: string;
}

/**
 * Deterministically extracts clinical slots (age, duration, severity, temperature) from text.
 * Used for dynamic question pruning in the symptom assessment flow.
 */
export const extractClinicalSlots = (text: string): ClinicalSlots => {
  const lowerText = text.toLowerCase();
  const slots: ClinicalSlots = {};

  // 1. Extract Age
  // Matches: "35 years old", "35 yo", "age 35", "35y", "35 y/o", "I am 35", "I'm 35"
  const ageRegex = /(\d+)\s*(?:years?\s*old|y\/?o|y\.?o\.?|yrs?\b|y\b)/i;
  const ageMatch = lowerText.match(ageRegex);

  const altAgeRegex = /\b(?:age|i am|i'm)\s*(\d+)\b/i;
  const altAgeMatch = lowerText.match(altAgeRegex);

  if (ageMatch) {
    slots.age = ageMatch[1];
  } else if (altAgeMatch) {
    slots.age = altAgeMatch[1];
  }

  // 2. Extract Duration
  // Matches: "3 days", "2 hours", "since yesterday", "for a week", "started 2 hours ago"
  // Added capture groups to return only the duration part.
  const durationPatterns = [
    /started\s+(yesterday|\d+\s*\w+\s*ago)/i,
    /since\s+(yesterday|last\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+)/i,
    /for\s+((?:a|an|\d+)\s*(?:hours?|mins?|minutes?|days?|weeks?|months?|years?))/i,
    // Negative lookahead to avoid matching "30 years" in "30 years old"
    /\b((?:\d+|a|an)\s*(?:hours?|mins?|minutes?|days?|weeks?|months?|years?)(?:\s*(?:ago|now))?)(?!\s*old)\b/i,
  ];

  for (const pattern of durationPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      slots.duration = (match[1] || match[0]).trim();
      break;
    }
  }

  // 3. Extract Severity
  // Priority: Numeric scales > Qualitative descriptors

  // Numeric: "7/10", "8 out of 10"
  const numericSeverityRegex = /\b([0-9]|10)\s*(\/|out of)\s*10\b/i;
  const numericSeverityMatch = lowerText.match(numericSeverityRegex);

  if (numericSeverityMatch) {
    slots.severity = numericSeverityMatch[0].trim();
  } else {
    // Qualitative: "mild", "moderate", "severe", "excruciating"
    const qualSeverityRegex = /\b(mild|moderate|severe|excruciating|unbearable)\b/i;
    const qualSeverityMatch = lowerText.match(qualSeverityRegex);
    if (qualSeverityMatch) {
      slots.severity = qualSeverityMatch[0].trim();
    }
  }

  return slots;
};

const mergeClinicalSlots = (current: ClinicalSlots, next: ClinicalSlots): ClinicalSlots => ({
  age: next.age ?? current.age,
  duration: next.duration ?? current.duration,
  severity: next.severity ?? current.severity,
  temperature: next.temperature ?? current.temperature,
});

export interface ClinicalSlotParser {
  parseTurn(text: string): { parsed: ClinicalSlots; aggregated: ClinicalSlots };
  getSlots(): ClinicalSlots;
  reset(): void;
}

const EMPTY_ASSESSMENT_PROFILE: AssessmentProfile = {
  age: null,
  duration: null,
  severity: null,
  progression: null,
  red_flag_denials: null,
  summary: '',
};

const SLOT_METADATA_CANDIDATES: QuestionSlotGoal[] = [
  { slotId: 'age', label: 'Age' },
  { slotId: 'duration', label: 'Duration' },
  { slotId: 'severity', label: 'Severity' },
  { slotId: 'progression', label: 'Progression' },
  { slotId: 'red_flag_denials', label: 'Red flag denials' },
];

const cloneSlots = (slots: ClinicalSlots): ClinicalSlots => ({ ...slots });

export const createClinicalSlotParser = (): ClinicalSlotParser => {
  let aggregatedSlots: ClinicalSlots = {};

  return {
    parseTurn(text: string) {
      if (!text || !text.trim()) {
        return { parsed: {}, aggregated: cloneSlots(aggregatedSlots) };
      }

      const parsed = extractClinicalSlots(text);
      aggregatedSlots = mergeClinicalSlots(aggregatedSlots, parsed);

      return { parsed, aggregated: cloneSlots(aggregatedSlots) };
    },
    getSlots: () => cloneSlots(aggregatedSlots),
    reset: () => {
      aggregatedSlots = {};
    },
  };
};

export const reconcileClinicalProfileWithSlots = (
  profile: AssessmentProfile,
  incrementalSlots: ClinicalSlots,
): AssessmentProfile => ({
  ...profile,
  age: profile.age ?? incrementalSlots.age ?? null,
  duration: profile.duration ?? incrementalSlots.duration ?? null,
  severity: profile.severity ?? incrementalSlots.severity ?? null,
});

export const computeUnresolvedSlotGoals = (
  profile: AssessmentProfile | undefined,
  incrementalSlots: ClinicalSlots,
  answers: Record<string, string>,
): QuestionSlotGoal[] => {
  const baseProfile = profile ?? EMPTY_ASSESSMENT_PROFILE;
  const incrementalRecord = incrementalSlots as Record<string, string | undefined>;

  return SLOT_METADATA_CANDIDATES.filter(({ slotId }) => {
    const hasProfileValue = Boolean(baseProfile[slotId]);
    const hasAnswerValue = Boolean(answers[slotId]);
    const hasIncrementalValue = Boolean(incrementalRecord[slotId]);
    return !hasProfileValue && !hasAnswerValue && !hasIncrementalValue;
  });
};

export interface ClinicalChange {
  field: keyof AssessmentProfile;
  oldValue: string | null;
  newValue: string | null;
}

/**
 * Detects semantic changes between two clinical profiles, ignoring superficial formatting.
 * Used to trigger reactive acknowledgements when a user corrects previously established info.
 */
export const detectProfileChanges = (
  prev: AssessmentProfile | undefined,
  next: AssessmentProfile,
): ClinicalChange[] => {
  if (!prev) return [];

  const fieldsToCheck: (keyof AssessmentProfile)[] = ['age', 'duration', 'severity'];
  const changes: ClinicalChange[] = [];

  for (const field of fieldsToCheck) {
    const oldVal = prev[field];
    const newVal = next[field];

    // Only detect corrections to previously established values
    if (!oldVal || !newVal) continue;

    const normOld = String(oldVal).trim().toLowerCase().replace(/\s+/g, ' ');
    const normNew = String(newVal).trim().toLowerCase().replace(/\s+/g, ' ');

    if (normOld !== normNew) {
      changes.push({ field, oldValue: oldVal as string, newValue: newVal as string });
    }
  }

  return changes;
};

/**
 * Calculates age from a date of birth string (YYYY-MM-DD).
 */
export const calculateAgeFromDob = (dob: string | null | undefined): number | null => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Formats the user's health profile into a deterministic, human-readable, and LLM-friendly string.
 * Used as a preamble for AI prompts to provide clinical context while omitting empty fields.
 */
export const formatProfileForAI = (profile: HealthProfile | undefined | null): string => {
  if (!profile) return '';

  const lines: string[] = [];

  // 1. Age (Clinically most important)
  if (profile.dob) {
    const age = calculateAgeFromDob(profile.dob);
    if (age !== null) {
      lines.push(`- Age: ${age} (DOB: ${profile.dob})`);
    } else {
      lines.push(`- DOB: ${profile.dob}`);
    }
  }

  // 2. Blood Type
  if (profile.bloodType) {
    lines.push(`- Blood Type: ${profile.bloodType}`);
  }

  // 3. Chronic Conditions
  if (profile.chronicConditions && profile.chronicConditions.length > 0) {
    const sorted = [...profile.chronicConditions].sort();
    lines.push(`- Chronic Conditions: ${sorted.join(', ')}`);
  }

  // 4. Allergies
  if (profile.allergies && profile.allergies.length > 0) {
    const sorted = [...profile.allergies].sort();
    lines.push(`- Allergies: ${sorted.join(', ')}`);
  }

  // 5. Current Medications
  if (profile.currentMedications && profile.currentMedications.length > 0) {
    const sorted = [...profile.currentMedications].sort();
    lines.push(`- Medications: ${sorted.join(', ')}`);
  }

  // 6. Surgical History
  if (profile.surgicalHistory?.trim()) {
    lines.push(`- Surgical History: ${profile.surgicalHistory.trim()}`);
  }

  // 7. Family History
  if (profile.familyHistory?.trim()) {
    lines.push(`- Family History: ${profile.familyHistory.trim()}`);
  }

  if (lines.length === 0) return '';

  return `USER HEALTH PROFILE:\n${lines.join('\n')}`;
};
