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
  const sMatch = text.match(/S:\s*(.*?)(?=\s*O:|$)/s);
  const oMatch = text.match(/O:\s*(.*?)(?=\s*A:|$)/s);
  const aMatch = text.match(/A:\s*(.*?)(?=\s*P:|$)/s);
  const pMatch = text.match(/P:\s*(.*?)$/s);

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

    let assessment = sections.a || '';
    if (medicalJustification) {
      assessment += (assessment ? '\n\n' : '') + `Emergency Justification: ${medicalJustification}`;
    }
    if (assessment) shareText += `ASSESSMENT (Triage):\n${assessment}\n\n`;

    if (sections.p) shareText += `PLAN (Next Steps):\n${sections.p}\n`;
  } else {
    shareText += clinicalSoap;
    if (medicalJustification) {
      shareText += `\n\nEmergency Justification: ${medicalJustification}`;
    }
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

/**
 * Normalizes age input to a number
 */
export const normalizeAge = (age: string | null): number | null => {
  if (!age) return null;
  const match = age.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
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
  // Matches: "35 years old", "35 yo", "age 35", "35y", "35 y/o"
  const ageRegex = /(\d+)\s*(?:years?\s*old|y\/?o|y\.?o\.?|yrs?\b|y\b)/i;
  const ageMatch = lowerText.match(ageRegex);

  const altAgeRegex = /age\s*(\d+)/i;
  const altAgeMatch = lowerText.match(altAgeRegex);

  if (ageMatch) {
    slots.age = ageMatch[0].trim();
  } else if (altAgeMatch) {
    slots.age = `Age ${altAgeMatch[1]}`;
  }

  // 2. Extract Duration
  // Matches: "3 days", "2 hours", "since yesterday", "for a week", "started 2 hours ago"
  const durationPatterns = [
    /started\s+(?:yesterday|\d+\s*\w+\s*ago)/i,
    /since\s+(?:yesterday|last\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+)/i,
    /for\s+(?:a|an|\d+)\s*(?:hours?|mins?|minutes?|days?|weeks?|months?|years?)/i,
    /(\d+|a|an)\s*(?:hours?|mins?|minutes?|days?|weeks?|months?|years?)\s*(?:ago|now)?/i,
  ];

  for (const pattern of durationPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      slots.duration = match[0].trim();
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

  // 4. Extract Temperature
  // Matches: "39C", "102F", "38.5 degrees celsius", "100.4 F"
  const tempRegex = /\b(\d{2,3}(?:\.\d)?)\s*(?:°|deg|degrees)?\s*(c|f|celsius|fahrenheit)\b/i;
  const tempMatch = lowerText.match(tempRegex);

  if (tempMatch) {
    slots.temperature = tempMatch[0].trim();
  }

  return slots;
};
