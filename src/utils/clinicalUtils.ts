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
  timestamp: number
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
    if (sections.a) shareText += `ASSESSMENT (Triage):\n${sections.a}\n\n`;
    if (sections.p) shareText += `PLAN (Next Steps):\n${sections.p}\n`;
  } else {
    shareText += clinicalSoap;
  }

  return shareText.trim();
};

export interface ClinicalSlots {
  age?: string;
  duration?: string;
}

/**
 * Deterministically extracts clinical slots (age, duration) from text.
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
    /(\d+|a|an)\s*(?:hours?|mins?|minutes?|days?|weeks?|months?|years?)\s*(?:ago|now)?/i,
    /since\s+(?:yesterday|last\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+)/i,
    /for\s+(?:a|an|\d+)\s*(?:hours?|mins?|minutes?|days?|weeks?|months?|years?)/i,
    /started\s+(?:yesterday|\d+\s*\w+\s*ago)/i
  ];

  for (const pattern of durationPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      slots.duration = match[0].trim();
      break;
    }
  }

  return slots;
};
