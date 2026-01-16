import { AssessmentResponse } from '../api/geminiClient';
import { getLevenshteinDistance, findAllFuzzyMatches, FUZZY_THRESHOLD } from '../utils/stringUtils';

// Emergency keyword severity scores
const EMERGENCY_KEYWORDS: Record<string, number> = {
  // Critical (10) - Immediate life threat
  'chest pain': 10,
  'difficulty breathing': 10,
  'shortness of breath': 10,
  'severe bleeding': 10,
  unconscious: 10,
  fainted: 10,
  seizure: 10,
  stroke: 10,
  'slurred speech': 10,
  'sudden weakness': 10,
  'severe head injury': 10,
  'coughing blood': 10,
  'severe burns': 10,
  poisoning: 10,
  overdose: 10,
  anaphylaxis: 10,
  'severe allergic reaction': 10,
  'blue lips': 10,
  'crushing pain': 10,
  'heart attack': 10,
  'not breathing': 10,
  gasping: 10,
  choking: 10,
  'severe abdominal pain': 10,
  'suicide attempt': 10,
  dying: 10,
  'feel like dying': 10,
  'feeling like dying': 10,
  'facial drooping': 10,
  'arm weakness': 10,
  'cannot speak': 10,
  'chest tightness': 10,
  'active labor': 10,
  'water broke': 10,
  'electric shock': 10,
  drowning: 10,

  // High severity (8-9) - Serious, needs urgent care
  'broken bone': 8,
  'deep wound': 8,
  'vomiting blood': 8,
  'black stool': 8,
  'blood in stool': 8,
  'vision loss': 8,
  'sudden blindness': 8,
  'stiff neck': 8,
  confusion: 8,
  'high fever': 8,
  'severe dehydration': 8,
  jaundice: 8,
  'persistent vomiting': 8,

  // Bicolano / Local terms
  'hingalo': 10,
  'naghihingalo': 10,
  'kulog sa daghan': 10,
  'kulog sa dagan': 10,
  'garo gadan': 10,
  'nagkukumbulsion': 10,
  'kumbulsion': 10,
};

// Negation patterns - expanded
const NEGATION_KEYWORDS = [
  'no',
  'not',
  'never',
  'none',
  "don't",
  "doesn't",
  "didn't",
  "isn't",
  "aren't",
  'dont',
  'doesnt',
  'didnt',
  'isnt',
  'arent',
  'without',
  'denies',
  'denied',
  'negative',
  'absent',
  'ruled out',
  'free from',
  'wala',
  'hindi',
  'nope',
  'nah',
];

// Affirmative patterns that override negation
const AFFIRMATIVE_KEYWORDS = [
  'yes',
  'got',
  'currently',
  'ongoing',
  'nag',
  'may',
  'i am',
  "i'm",
  'iam',
  'im'
];

// **NEW: Question/System indicators** - Critical for filtering non-user input
const SYSTEM_INDICATORS = [
  'are you experiencing',
  'do you have',
  'have you had',
  'please tell me',
  'could you',
  'can you',
  'to confirm',
  'also,',
  'question:',
  'slot_ids',
  'initial symptom:',
  'context:',
  'nearest',
  '{"question"',
  'answers:',
];

interface EmergencyDetectionResult {
  isEmergency: boolean;
  score: number;
  matchedKeywords: string[];
  overrideResponse?: AssessmentResponse;
  debugLog: EmergencyDebugLog;
}

interface EmergencyDebugLog {
  inputText: string;
  sanitizedInput: string;
  filteredSegments: string[];
  rejectedSegments: Array<{ text: string; reason: string }>;
  segments: SegmentAnalysis[];
  finalScore: number;
  triggeredEmergency: boolean;
  reasoning: string;
}

interface SegmentAnalysis {
  text: string;
  isUserInput: boolean;
  potentialMatches: KeywordMatch[];
  activeMatches: KeywordMatch[];
  suppressedMatches: KeywordMatch[];
  maxScore: number;
}

interface KeywordMatch {
  keyword: string;
  severity: number;
  negated: boolean;
  contextWindow: string;
  affirmationFound: boolean;
}

const sanitizeInput = (
  text: string,
): { sanitized: string; rejected: Array<{ text: string; reason: string }> } => {
  const rejected: Array<{ text: string; reason: string }> = [];
  
  // We no longer strip JSON structures aggressively because they may contain user answers 
  // (e.g. in the final triage context string).
  // Instead, we focus on removing specific system prefixes/indicators.

  // Filter system indicators by removing the indicator text itself, 
  // rather than dropping the whole segment if it contains the indicator.
  let cleaned = text;
  
  for (const indicator of SYSTEM_INDICATORS) {
    const regex = new RegExp(indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(cleaned)) {
       // Check if it's a "whole segment" rejection scenario or just a label
       // For labels like "Initial Symptom:", we just want to remove the label.
       // For "slot_ids", it's likely debug noise, but let's just strip the keyword.
       cleaned = cleaned.replace(regex, '');
       // We don't log every removal as "rejected segment" anymore since we are keeping the content.
    }
  }

  // Split into segments for analysis
  const segments = cleaned
    .split(/[.,?!;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
    
  // Further filtering of purely technical segments if needed
  const validSegments: string[] = [];

  for (const segment of segments) {
     // If a segment is just punctuation or empty after stripping, ignore
     if (segment.length < 2) continue;
     
     // Check for JSON artifacts that might remain and are purely structural
     if (/^["}\]]+$/.test(segment)) continue;

     validSegments.push(segment);
  }

  return {
    sanitized: validSegments.join('. '),
    rejected,
  };
};

/**
 * Tokenize text into sentences/segments
 */
export const tokenizeSentences = (text: string): string[] => {
  if (!text) return [];

  return text
    .split(/[.,?!;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

/**
 * Enhanced negation detection with context awareness
 */
export const isNegated = (
  segment: string,
  keyword: string,
): { negated: boolean; hasAffirmation: boolean; contextWindow: string } => {
  const PROXIMITY_WINDOW = 5; // words before/after keyword

  const words = segment
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const keywordWords = keyword.toLowerCase().split(/\s+/);

  if (keywordWords.length === 0 || words.length === 0) {
    return { negated: false, hasAffirmation: false, contextWindow: '' };
  }

  // Find keyword position
  let keywordStart = -1;
  for (let i = 0; i <= words.length - keywordWords.length; i++) {
    const window = words.slice(i, i + keywordWords.length).join(' ');
    const distance = getLevenshteinDistance(window, keyword.toLowerCase());

    if (distance <= FUZZY_THRESHOLD) {
      keywordStart = i;
      break;
    }
  }

  if (keywordStart === -1) {
    return { negated: false, hasAffirmation: false, contextWindow: '' };
  }

  // Check context window
  const start = Math.max(0, keywordStart - PROXIMITY_WINDOW);
  const end = Math.min(words.length, keywordStart + keywordWords.length + PROXIMITY_WINDOW);

  const contextWords = words.slice(start, end);
  const contextWindow = contextWords.join(' ');

  let hasNegation = false;
  let hasAffirmation = false;

  for (let k = 0; k < contextWords.length; k++) {
    // Skip the keyword itself
    const absolutePos = start + k;
    if (absolutePos >= keywordStart && absolutePos < keywordStart + keywordWords.length) {
      continue;
    }

    if (NEGATION_KEYWORDS.includes(contextWords[k])) {
      hasNegation = true;
    }
    if (AFFIRMATIVE_KEYWORDS.includes(contextWords[k])) {
      hasAffirmation = true;
    }
  }

  // Affirmative overrides negation
  const negated = hasNegation && !hasAffirmation;

  return { negated, hasAffirmation, contextWindow };
};

/**
 * Analyze a single segment for emergency keywords
 */
const analyzeSegment = (
  segment: string,
  keywordList: string[],
  isUserInput: boolean,
): SegmentAnalysis => {
  const potentialMatches: KeywordMatch[] = [];
  const activeMatches: KeywordMatch[] = [];
  const suppressedMatches: KeywordMatch[] = [];

  // **CRITICAL: Skip analysis if not user input**
  if (!isUserInput) {
    return {
      text: segment,
      isUserInput: false,
      potentialMatches: [],
      activeMatches: [],
      suppressedMatches: [],
      maxScore: 0,
    };
  }

  // Find all fuzzy matches
  const matches = findAllFuzzyMatches(segment, keywordList);

  for (const keyword of matches) {
    const severity = EMERGENCY_KEYWORDS[keyword];
    const negationResult = isNegated(segment, keyword);

    const match: KeywordMatch = {
      keyword,
      severity,
      negated: negationResult.negated,
      contextWindow: negationResult.contextWindow,
      affirmationFound: negationResult.hasAffirmation,
    };

    potentialMatches.push(match);

    if (negationResult.negated) {
      suppressedMatches.push(match);
    } else {
      activeMatches.push(match);
    }
  }

  const maxScore = activeMatches.length > 0 ? Math.max(...activeMatches.map((m) => m.severity)) : 0;

  return {
    text: segment,
    isUserInput: true,
    potentialMatches,
    activeMatches,
    suppressedMatches,
    maxScore,
  };
};

/**
 * **FIXED: Main emergency detection with input sanitization**
 */
export const detectEmergency = (
  text: string,
  options: { isUserInput?: boolean } = {},
): EmergencyDetectionResult => {
  console.log(`\n=== EMERGENCY DETECTION START ===`);
  console.log(`Input: "${text}"`);
  console.log(`Input Type: ${options.isUserInput === false ? 'SYSTEM/METADATA' : 'USER INPUT'}`);

  // **NEW: Sanitize input to remove system text**
  const { sanitized, rejected } = sanitizeInput(text);

  console.log(`\nSanitization:`);
  if (rejected.length > 0) {
    console.log(`  Rejected ${rejected.length} segments:`);
    rejected.forEach((r) => console.log(`    - "${r.text.substring(0, 60)}..." (${r.reason})`));
  }
  console.log(`  Sanitized input: "${sanitized}"`);

  // If explicitly marked as non-user input, skip analysis
  if (options.isUserInput === false) {
    const debugLog: EmergencyDebugLog = {
      inputText: text,
      sanitizedInput: sanitized,
      filteredSegments: [],
      rejectedSegments: rejected,
      segments: [],
      finalScore: 0,
      triggeredEmergency: false,
      reasoning: 'Input marked as system-generated - skipped emergency analysis',
    };

    console.log(`\n--- SKIPPED (SYSTEM INPUT) ---`);
    console.log(`=== EMERGENCY DETECTION END ===\n`);

    return {
      isEmergency: false,
      score: 0,
      matchedKeywords: [],
      debugLog,
    };
  }

  const segments = tokenizeSentences(sanitized.toLowerCase());
  const keywordList = Object.keys(EMERGENCY_KEYWORDS);

  const segmentAnalyses: SegmentAnalysis[] = [];
  const allActiveKeywords = new Set<string>();
  const allSuppressedKeywords = new Set<string>();

  // Analyze each segment
  for (const segment of segments) {
    const isUserInput = true; // After sanitization, remaining text is user input
    const analysis = analyzeSegment(segment, keywordList, isUserInput);
    segmentAnalyses.push(analysis);

    // Collect active keywords
    for (const match of analysis.activeMatches) {
      allActiveKeywords.add(match.keyword);
    }

    // Collect suppressed keywords
    for (const match of analysis.suppressedMatches) {
      allSuppressedKeywords.add(match.keyword);
    }

    // Log segment analysis
    console.log(`\nSegment: "${segment}"`);
    if (analysis.potentialMatches.length > 0) {
      console.log(`  Potential matches: ${analysis.potentialMatches.length}`);
      for (const match of analysis.potentialMatches) {
        const status = match.negated ? '✗ SUPPRESSED (negated)' : '✓ ACTIVE';
        console.log(`    ${status} - "${match.keyword}" (severity: ${match.severity})`);
        console.log(`      Context: "${match.contextWindow}"`);
        if (match.affirmationFound) {
          console.log(`      Affirmation override detected`);
        }
      }
    } else {
      console.log(`  No emergency keywords found`);
    }
    console.log(`  Segment max score: ${analysis.maxScore}`);
  }

  // Calculate final score (highest score across all segments)
  const finalScore =
    segmentAnalyses.length > 0 ? Math.max(...segmentAnalyses.map((s) => s.maxScore)) : 0;

  const matchedKeywords = Array.from(allActiveKeywords);
  const suppressedKeywords = Array.from(allSuppressedKeywords);
  const isEmergency = finalScore > 7;

  // Build reasoning
  let reasoning = '';
  if (isEmergency) {
    reasoning = `Emergency detected with score ${finalScore}/10. Active symptoms: ${matchedKeywords.join(', ')}.`;
  } else if (matchedKeywords.length > 0) {
    reasoning = `Non-emergency symptoms detected (score ${finalScore}/10): ${matchedKeywords.join(', ')}.`;
  } else if (suppressedKeywords.length > 0) {
    reasoning = `Emergency keywords negated by user (score ${finalScore}/10): ${suppressedKeywords.join(', ')}.`;
  } else {
    reasoning = `No emergency keywords detected in user input.`;
  }

  console.log(`\n--- FINAL RESULT ---`);
  console.log(`Score: ${finalScore}/10`);
  console.log(`Emergency: ${isEmergency ? 'YES' : 'NO'}`);
  console.log(`Active keywords: [${matchedKeywords.join(', ')}]`);
  if (suppressedKeywords.length > 0) {
    console.log(`Suppressed keywords: [${suppressedKeywords.join(', ')}]`);
  }
  console.log(`Reasoning: ${reasoning}`);
  console.log(`=== EMERGENCY DETECTION END ===\n`);

  const debugLog: EmergencyDebugLog = {
    inputText: text,
    sanitizedInput: sanitized,
    filteredSegments: segments,
    rejectedSegments: rejected,
    segments: segmentAnalyses,
    finalScore,
    triggeredEmergency: isEmergency,
    reasoning,
  };

  let overrideResponse: AssessmentResponse | undefined;

  if (isEmergency) {
    overrideResponse = {
      recommended_level: 'emergency',
      user_advice:
        'CRITICAL: Potential life-threatening condition detected based on your symptoms. Go to the nearest emergency room immediately.',
      clinical_soap: `S: Patient reports ${matchedKeywords.join(', ')}. O: Emergency keywords detected. A: Potential life-threatening condition. P: Immediate ED referral.`,
      key_concerns: matchedKeywords.map((k) => `Urgent symptom: ${k}`),
      critical_warnings: ['Immediate medical attention required', 'Do not delay care'],
      relevant_services: ['Emergency', 'Trauma Care'],
      red_flags: matchedKeywords,
      follow_up_questions: [],
    };
  }

  return {
    isEmergency,
    score: finalScore,
    matchedKeywords,
    overrideResponse,
    debugLog,
  };
};
