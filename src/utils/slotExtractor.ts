/**
 * Enhanced Slot Extraction Utility
 * Fixed severity capture and negation detection
 */

export interface SlotExtractionResult {
  age?: string;
  duration?: string;
  severity?: string;
  progression?: string;
  red_flag_denials?: string;
}

interface ExtractionDebugLog {
  slot: string;
  rawAnswer: string;
  matched: boolean;
  pattern?: string;
  extractedValue?: string;
  negationDetected?: boolean;
  contextWindow?: string;
}

// Enhanced negation keywords
const NEGATION_KEYWORDS = [
  'no',
  'not',
  'never',
  'none',
  'dont',
  "don't",
  'doesnt',
  "doesn't",
  'didnt',
  "didn't",
  'isnt',
  "isn't",
  'arent',
  "aren't",
  'without',
  'denies',
  'negative',
  'absent',
  'ruled out',
  'free from',
  'wala',
  'hindi',
];

// Severity modifiers
const SEVERITY_MODIFIERS = {
  minimizers: [
    'not that',
    'not very',
    'not so',
    'barely',
    'slightly',
    'a bit',
    'somewhat',
    'kind of',
    'kinda',
  ],
  maximizers: ['very', 'extremely', 'highly', 'really', 'super', 'incredibly', 'terribly'],
};

/**
 * Enhanced patterns with explicit numeric severity capture
 */
const EXTRACTION_PATTERNS = {
  age: [
    { pattern: /(?:i'?m|i am|am|age of|aged)\s*(\d{1,3})\s*(?:years?|yrs?|y\.?o\.?)?/i, group: 1 },
    { pattern: /(\d{1,3})\s*(?:years? old|yrs? old|y\.?o\.?)/i, group: 1 },
    {
      pattern: /\b(infant|baby|toddler|child|kid|teenager|teen|adolescent|adult|senior|elderly)\b/i,
      group: 1,
    },
  ],

  duration: [
    {
      pattern:
        /(?:for|since|about|around|approximately|past)\s*(\d+)\s*(second|minute|hour|day|week|month|year)s?/i,
      group: 0,
    },
    { pattern: /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*(?:ago|now)/i, group: 0 },
    {
      pattern:
        /\b(yesterday|today|this morning|last night|last week|last month|recently|just now)\b/i,
      group: 0,
    },
    {
      pattern:
        /started\s*(?:about|around|approximately)?\s*(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i,
      group: 0,
    },
  ],

  severity: [
    // **PRIORITY 1: Explicit numeric severity statements** (highest priority)
    {
      pattern: /(?:it'?s|its)\s*(\d{1,2})(?:\s*(?:in terms of|for))?\s*severity/i,
      group: 1,
      priority: 1,
      extractType: 'numeric',
    },
    {
      pattern: /severity\s*(?:is|of|level|at)?\s*(\d{1,2})(?:\s*(?:\/|out of)\s*10)?/i,
      group: 1,
      priority: 1,
      extractType: 'numeric',
    },

    // **PRIORITY 2: Standalone numeric scales**
    {
      pattern: /^(\d{1,2})(?:\s*(?:\/|out of)\s*10)?$/i,
      group: 1,
      priority: 2,
      extractType: 'numeric',
      requiresContext: true,
    },
    {
      pattern:
        /(?:pain|severity|intensity|discomfort)\s*(?:is|of|level|at)?\s*(\d{1,2})(?:\s*(?:\/|out of)\s*10)?/i,
      group: 1,
      priority: 2,
      extractType: 'numeric',
    },

    // **PRIORITY 3: Descriptive severity** (with negation check)
    {
      pattern: /\b(mild|moderate|severe|unbearable|excruciating|intense|major|minor|slight)\b/i,
      group: 1,
      priority: 3,
      extractType: 'descriptive',
      checkNegation: true,
    },
    {
      pattern: /(can'?t|cannot|unable to)\s*(walk|eat|sleep|work|move|stand|sit)/i,
      group: 0,
      priority: 3,
      extractType: 'functional',
      checkNegation: true,
    },

    // **PRIORITY 4: Impact statements** (fallback)
    {
      pattern: /(?:affects?|impact(?:s|ing)?)\s*(?:my|daily)?\s*(?:daily\s*)?activities/i,
      group: 0,
      priority: 4,
      extractType: 'impact',
    },
  ],

  progression: [
    { pattern: /(getting|becoming|growing)\s*(better|worse|more severe|less severe)/i, group: 0 },
    {
      pattern: /\b(improving|worsening|deteriorating|stable|unchanged|same|constant)\b/i,
      group: 1,
    },
    { pattern: /(better|worse)\s*(?:than|since|over time)/i, group: 0 },
    { pattern: /staying\s*the\s*same/i, group: 0 },
  ],

  red_flag_denials: [
    // Explicit denials
    {
      pattern:
        /no\s*(chest pain|difficulty breathing|bleeding|unconsciousness|severe symptoms|emergency)/i,
      group: 0,
    },
    {
      pattern:
        /(?:not|don'?t)\s*(?:experiencing|having|feeling|feel)\s*(?:any)?\s*(chest pain|difficulty breathing|emergency|red flags)/i,
      group: 0,
    },
    { pattern: /(none|negative)\s*for\s*(chest pain|red flags|emergency signs)/i, group: 0 },
    // Short affirmative denials
    { pattern: /^no\.?$/i, group: 0 },
    { pattern: /like i said,?\s*no/i, group: 0 },
  ],
};

/**
 * Debug logging
 */
const debugLogs: ExtractionDebugLog[] = [];

export const getExtractionDebugLogs = (): ExtractionDebugLog[] => {
  return [...debugLogs];
};

export const clearExtractionDebugLogs = () => {
  debugLogs.length = 0;
};

/**
 * Check if a match is negated within context window
 */
const isMatchNegated = (text: string, matchStart: number, matchEnd: number): boolean => {
  const WINDOW_SIZE = 30;
  const contextStart = Math.max(0, matchStart - WINDOW_SIZE);
  const contextWindow = text.substring(contextStart, matchEnd).toLowerCase();

  for (const negation of NEGATION_KEYWORDS) {
    if (contextWindow.includes(negation)) {
      const negationIndex = contextWindow.lastIndexOf(negation);
      const matchRelativeStart = matchStart - contextStart;

      if (negationIndex < matchRelativeStart) {
        console.log(
          `[SlotExtractor] Negation detected: "${negation}" before match in "${contextWindow}"`,
        );
        return true;
      }
    }
  }

  return false;
};

/**
 * Adjust severity based on modifiers
 */
const adjustSeverity = (text: string, matchedSeverity: string, matchStart: number): string => {
  const WINDOW_SIZE = 25;
  const contextStart = Math.max(0, matchStart - WINDOW_SIZE);
  const contextWindow = text
    .substring(contextStart, matchStart + matchedSeverity.length)
    .toLowerCase();

  for (const minimizer of SEVERITY_MODIFIERS.minimizers) {
    if (contextWindow.includes(minimizer)) {
      console.log(`[SlotExtractor] Severity minimizer detected: "${minimizer}"`);
      return `${minimizer} ${matchedSeverity}`.trim();
    }
  }

  for (const maximizer of SEVERITY_MODIFIERS.maximizers) {
    if (contextWindow.includes(maximizer)) {
      console.log(`[SlotExtractor] Severity maximizer detected: "${maximizer}"`);
      return `${maximizer} ${matchedSeverity}`.trim();
    }
  }

  return matchedSeverity;
};

/**
 * **FIXED: Extract severity with priority-based matching**
 */
const extractSeverity = (text: string): string | null => {
  const patterns = EXTRACTION_PATTERNS.severity;
  const lowerText = text.toLowerCase();

  // Sort by priority (1 = highest)
  const sortedPatterns = [...patterns].sort(
    (a: any, b: any) => (a.priority || 999) - (b.priority || 999),
  );

  for (const patternConfig of sortedPatterns) {
    const { pattern, group, checkNegation, extractType, priority } = patternConfig as any;
    const match = lowerText.match(pattern);

    if (match) {
      const matchedText = group !== undefined ? match[group] : match[0];
      const matchStart = match.index || 0;
      const matchEnd = matchStart + match[0].length;

      // Check for negation if required
      if (checkNegation && isMatchNegated(lowerText, matchStart, matchEnd)) {
        debugLogs.push({
          slot: 'severity',
          rawAnswer: text,
          matched: false,
          pattern: pattern.source,
          negationDetected: true,
          contextWindow: lowerText.substring(Math.max(0, matchStart - 30), matchEnd + 10),
        });
        continue;
      }

      let finalValue = matchedText.trim();

      // For numeric extractions, return just the number
      if (extractType === 'numeric') {
        // Extract just the digit(s)
        const numericMatch = finalValue.match(/\d{1,2}/);
        if (numericMatch) {
          finalValue = `${numericMatch[0]}/10`;
        }
      } else if (extractType === 'descriptive' || extractType === 'functional') {
        finalValue = adjustSeverity(lowerText, finalValue, matchStart);
      }

      debugLogs.push({
        slot: 'severity',
        rawAnswer: text,
        matched: true,
        pattern: pattern.source,
        extractedValue: finalValue,
        negationDetected: false,
      });

      console.log(
        `[SlotExtractor] Severity extracted (priority ${priority}, type ${extractType}): "${finalValue}"`,
      );
      return finalValue;
    }
  }

  debugLogs.push({
    slot: 'severity',
    rawAnswer: text,
    matched: false,
  });

  return null;
};

/**
 * Extract a single slot (non-severity)
 */
const extractSlot = (
  text: string,
  slotId: 'age' | 'duration' | 'progression' | 'red_flag_denials',
): string | null => {
  const patterns = EXTRACTION_PATTERNS[slotId];
  const lowerText = text.toLowerCase();

  for (const patternConfig of patterns) {
    const { pattern, group, checkNegation } = patternConfig as any;
    const match = lowerText.match(pattern);

    if (match) {
      const matchedText = group !== undefined ? match[group] : match[0];
      const matchStart = match.index || 0;
      const matchEnd = matchStart + match[0].length;

      if (checkNegation && isMatchNegated(lowerText, matchStart, matchEnd)) {
        debugLogs.push({
          slot: slotId,
          rawAnswer: text,
          matched: false,
          pattern: pattern.source,
          negationDetected: true,
          contextWindow: lowerText.substring(Math.max(0, matchStart - 30), matchEnd + 10),
        });
        continue;
      }

      const finalValue = matchedText.trim();

      debugLogs.push({
        slot: slotId,
        rawAnswer: text,
        matched: true,
        pattern: pattern.source,
        extractedValue: finalValue,
        negationDetected: false,
      });

      return finalValue;
    }
  }

  debugLogs.push({
    slot: slotId,
    rawAnswer: text,
    matched: false,
  });

  return null;
};

/**
 * **FIXED: Main extraction with explicit severity handling**
 */
export const extractSlotsFromAnswer = (
  answer: string,
  slotIds: ('age' | 'duration' | 'severity' | 'progression' | 'red_flag_denials')[],
): SlotExtractionResult => {
  const result: SlotExtractionResult = {};

  console.log(`\n=== SLOT EXTRACTION START ===`);
  console.log(`Input: "${answer}"`);
  console.log(`Target slots: [${slotIds.join(', ')}]`);

  for (const slotId of slotIds) {
    let extracted: string | null = null;

    // Special handling for severity
    if (slotId === 'severity') {
      extracted = extractSeverity(answer);
    } else {
      extracted = extractSlot(answer, slotId);
    }

    if (extracted) {
      result[slotId] = extracted;
      console.log(`✓ ${slotId}: "${extracted}"`);
    } else {
      console.log(`✗ ${slotId}: not found`);
    }
  }

  // **CHANGED: Only store full answer if NO slots extracted AND it's a multi-slot question**
  if (Object.keys(result).length === 0 && slotIds.length > 1) {
    console.log(`[SlotExtractor] No patterns matched. Storing full answer in ${slotIds[0]}`);
    result[slotIds[0]] = answer;
  }

  console.log(`=== SLOT EXTRACTION END ===\n`);

  return result;
};

/**
 * Check if all required slots are filled
 */
export const areAllSlotsFilled = (slots: Record<string, string>): boolean => {
  const requiredSlots = ['age', 'duration', 'severity', 'progression', 'red_flag_denials'];
  const filled = requiredSlots.every((slot) => slots[slot] && slots[slot].trim() !== '');

  console.log(`[SlotValidator] All slots filled: ${filled}`);

  return filled;
};

/**
 * Get missing slot IDs
 */
export const getMissingSlots = (slots: Record<string, string>): string[] => {
  const requiredSlots = ['age', 'duration', 'severity', 'progression', 'red_flag_denials'];
  const missing = requiredSlots.filter((slot) => !slots[slot] || slots[slot].trim() === '');

  console.log(`[SlotValidator] Missing slots: [${missing.join(', ')}]`);

  return missing;
};
