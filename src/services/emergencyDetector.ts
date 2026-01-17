import { AssessmentProfile } from '../types/triage';
import { AssessmentResponse } from '../api/geminiClient';
import { getLevenshteinDistance, findAllFuzzyMatches, FUZZY_THRESHOLD } from '../utils/stringUtils';

// Emergency keyword severity scores
const EMERGENCY_KEYWORDS: Record<string, number> = {
  // Critical (10) - Immediate life threat - ABSOLUTE EMERGENCIES
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

  // Bicolano / Local terms (Absolute)
  'hingalo': 10, // gasping for breath / near death
  'naghihingalo': 10, // actively dying / gasping
  'kulog sa daghan': 10, // chest pain
  'kulog sa dagan': 10, // chest pain (variant spelling)
  'garo gadan': 10, // feels like dying
  'nagkukumbulsion': 10, // actively seizing
  'kumbulsion': 10, // seizure
  'dai makahinga': 10, // cannot breathe
  'dugi': 10, // choking/foreign object in throat
  'malipot na ribok': 10, // cold sweat (often cardiac)
  'bakitog': 10, // difficulty breathing / wheezing
};

// Serious Symptoms (5-8) - ESCALATE ONLY WITH CONTEXT
const SERIOUS_KEYWORDS: Record<string, number> = {
  'broken bone': 8,
  'deep wound': 8,
  'vomiting blood': 9, // Absolute seriousness
  'black stool': 8,
  'blood in stool': 8,
  'vision loss': 9,
  'sudden blindness': 10,
  'stiff neck': 8,
  'confusion': 8,
  'high fever': 5, // RE-CALIBRATED: Base 5
  'severe dehydration': 7,
  'jaundice': 7,
  'persistent vomiting': 7,
  'headache': 5,
  'blurred vision': 6,
  'dizziness': 5,
  'fever': 4,
  'abdominal pain': 6,
  'nausea': 4,

  // Bicolano / Local terms (Serious)
  'nangungulog': 6,
  'grabeng lagnat': 5,
  'mainiton na marhay': 5,
  'nagkakalyo': 6,
  'nalulula': 5,
  'nalilibog': 5,
  'pusi-pusi': 6,
  'gadot': 5,
  'kulog sa tulak': 5,
  'nagpapanit an tulak': 7,
  'impacho': 4,
  'nagluluya': 6,
  'lupaypay': 7,
  'hapos': 6,
  'langkag': 5,
};

// **NEW: Contextual Modifiers**
const VIRAL_INDICATORS = ['cough', 'runny nose', 'nasal congestion', 'sore throat', 'sneezing'];
const DANGER_INDICATORS: Record<string, number> = {
    'stiff neck': 4,
    'confusion': 4,
    'seizure': 5,
    'difficulty breathing': 5,
    'chest pain': 5,
    'unconscious': 5,
    'persistent': 2,
    'worsening': 1,
};

const ALL_EMERGENCY_KEYWORDS = { ...EMERGENCY_KEYWORDS, ...SERIOUS_KEYWORDS };

/**
 * Critical symptom combinations that indicate high risk when occurring together.
 * These are used to upgrade severity when multiple symptoms are present simultaneously.
 */
const COMBINATION_RISKS = [
  {
    symptoms: ['headache', 'blurred vision'],
    severity: 10,
    reason: 'Neurological or hypertensive crisis',
  },
  {
    symptoms: ['headache', 'stiff neck'],
    severity: 10,
    reason: 'Potential meningitis',
  },
  {
    symptoms: ['chest pain', 'shortness of breath'],
    severity: 10,
    reason: 'Potential cardiac emergency',
  },
  {
    symptoms: ['fever', 'confusion'],
    severity: 10,
    reason: 'Potential sepsis or severe infection',
  },
  {
    symptoms: ['abdominal pain', 'dizziness'],
    severity: 10,
    reason: 'Potential internal bleeding or shock',
  },
  {
      symptoms: ['fever', 'stiff neck'],
      severity: 10,
      reason: 'High risk of meningitis',
  }
];

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
  'don-t',
  'doesn-t',
  'didn-t',
  'isn-t',
  'aren-t',
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
  'nothing',
  'not experiencing',
  'none of these',
  'not present',
  'bako', // Bicolano: not
  'dae', // Bicolano: no/not
  'dai', // Bicolano: no/not (variant)
  'wara', // Bicolano: none
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
  'im',
  'present',
  'experiencing',
  'meron',
  'iyo', // Bicolano: yes
  'igwa', // Bicolano: has/present
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
  'clinical profile:',
  'duration:',
  'severity:',
  'progression:',
  'red flag status:',
  'summary:'
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

/**
 * Enhanced sanitization to remove system labels and identifiers
 */
const sanitizeInput = (
  text: string,
): { sanitized: string; rejected: Array<{ text: string; reason: string }> } => {
  const rejected: Array<{ text: string; reason: string }> = [];
  
  // 1. Remove JSON structures and technical metadata while preserving content
  let cleaned = text
    .replace(/\{"question":".*?","answer":"(.*?)"\}/g, '$1') // Extract answer from JSON pairs
    .replace(/\[|\]|\{|\}/g, ' ') // Remove brackets
    .replace(/"answer":/g, ' ')
    .replace(/"question":/g, ' ')
    .replace(/"/g, ' ');

  // 2. Remove system labels specifically (preserve content)
  // We use word boundaries and case-insensitive replacement for labels
  for (const indicator of SYSTEM_INDICATORS) {
      // Special case: Summary and Clinical Profile sections should be ignored entirely if they are system-generated summaries
      if (indicator === 'summary:' || indicator === 'clinical profile:') {
          // Remove the label and everything until the next line or major punctuation if it looks like a block
          const regex = new RegExp(`\\b${indicator}\\s*[^.?!\\n]*`, 'gi');
          cleaned = cleaned.replace(regex, ' ');
          continue;
      }
      
      const regex = new RegExp(`\\b${indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
      cleaned = cleaned.replace(regex, ' ');
  }
  
  // 3. Tokenize into clean segments
  const segments = cleaned
    .split(/[.,?!;:\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
    
  // 4. Filter out purely numeric or short noise segments
  const validSegments = segments.filter(segment => {
    // If it's just a number or very short, it's likely noise or a score (e.g. "6")
    if (/^\d+$/.test(segment)) return false;
    if (segment.length < 2) return false;
    
    // Check if segment is essentially empty or just system words
    const lower = segment.toLowerCase();
    const systemWords = ['unknown', 'none', 'denied', 'none reported', 'not applicable', 'n/a'];
    if (systemWords.includes(lower)) return false;
    
    return true;
  });

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
    .split(/[.,?!;:\n]+/)
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
  const PROXIMITY_WINDOW = 5; // Increased window for better recall

  const normalizedSegment = segment.toLowerCase().replace(/'/g, '-').replace(/[^a-z0-9-\s]/g, ' ');
  const words = normalizedSegment.split(/\s+/).filter((w) => w.length > 0);
  const keywordWords = keyword.toLowerCase().split(/\s+/);

  if (keywordWords.length === 0 || words.length === 0) {
    return { negated: false, hasAffirmation: false, contextWindow: '' };
  }

  // Find keyword position
  let keywordStart = -1;
  for (let i = 0; i <= words.length - keywordWords.length; i++) {
    const window = words.slice(i, i + keywordWords.length).join(' ');
    const distance = getLevenshteinDistance(window, keyword.toLowerCase());

    if (distance <= Math.min(2, FUZZY_THRESHOLD)) { // Increased for better recall on phrases
      keywordStart = i;
      break;
    }
  }

  if (keywordStart === -1) {
    return { negated: false, hasAffirmation: false, contextWindow: '' };
  }

  // Check context window
  const start = Math.max(0, keywordStart - PROXIMITY_WINDOW - 5);
  const end = Math.min(words.length, keywordStart + keywordWords.length + PROXIMITY_WINDOW + 5);

  const contextWords = words.slice(start, end);
  const contextWindow = contextWords.join(' ');

  let hasNegation = false;
  let hasAffirmation = false;

  for (let k = 0; k < contextWords.length; k++) {
    const absolutePos = start + k;
    // Skip words that are part of the keyword
    if (absolutePos >= keywordStart && absolutePos < keywordStart + keywordWords.length) {
      continue;
    }

    const currentWord = contextWords[k];
    
    // Check for negation keywords (strict whole-word match)
    if (NEGATION_KEYWORDS.some(neg => currentWord === neg)) {
       // Check if negation is directly related to the keyword (nearby)
       // REFINED: Negation usually precedes. If it follows, it must be close and not separated by conjunctions
       const distance = absolutePos - keywordStart;
       
       if (distance < 0 && Math.abs(distance) <= PROXIMITY_WINDOW) {
         hasNegation = true;
       } else if (distance > 0 && distance <= 4) {
         // Check if there is a conjunction like "but", "and", "or" between keyword and negation
         const intermediateWords = words.slice(keywordStart + keywordWords.length, absolutePos);
         const hasConjunction = intermediateWords.some(w => ['but', 'and', 'or', 'though'].includes(w));
         
         if (!hasConjunction) {
           hasNegation = true;
         }
       }
    }

    // Check for affirmative overrides
    if (AFFIRMATIVE_KEYWORDS.some(aff => currentWord === aff)) {
       if (Math.abs(absolutePos - keywordStart) <= 2) { // Affirmation must be very close
         hasAffirmation = true;
       }
    }
  }

  // Check for explicit "Denied" anywhere in the segment if it's a short segment
  if (segment.toLowerCase().includes('denied') || segment.toLowerCase().includes('wala')) {
    hasNegation = true;
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
    const severity = ALL_EMERGENCY_KEYWORDS[keyword as keyof typeof ALL_EMERGENCY_KEYWORDS];
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
 * Helper to check if duration suggests chronic/non-acute or acute/urgent
 */
const parseDurationUrgency = (duration: string | null): 'acute' | 'chronic' | 'unknown' => {
    if (!duration) return 'unknown';
    const d = duration.toLowerCase();
    
    // Urgent indicators
    if (d.includes('today') || d.includes('hour') || d.includes('just') || d.includes('now') || d.includes('minute')) return 'acute';
    
    // Chronic indicators (less likely emergency on their own)
    if (d.includes('week') || d.includes('month') || d.includes('year') || d.includes('long time')) return 'chronic';
    
    // 1-3 days is "acute" but usually not "emergency" unless symptoms are severe
    if (d.includes('day') || d.includes('yesterday')) return 'acute';
    
    return 'unknown';
};

/**
 * Main emergency detection with input sanitization and context awareness
 */
export const detectEmergency = (
  text: string,
  options: { 
      isUserInput?: boolean; 
      historyContext?: string;
      profile?: AssessmentProfile;
  } = {},
): EmergencyDetectionResult => {
  console.log(`\n=== EMERGENCY DETECTION START ===`);
  console.log(`Input: "${text.substring(0, 100)}..."`);
  console.log(`Input Type: ${options.isUserInput === false ? 'SYSTEM/METADATA' : 'USER INPUT'}`);

  const { profile } = options;

  // **NEW: Sanitize input to remove system text**
  const { sanitized, rejected } = sanitizeInput(text);

  console.log(`\nSanitization:`);
  if (rejected.length > 0) {
    console.log(`  Rejected ${rejected.length} segments:`);
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

    return {
      isEmergency: false,
      score: 0,
      matchedKeywords: [],
      debugLog,
    };
  }

  const segments = tokenizeSentences(sanitized.toLowerCase());
  const keywordList = Object.keys(ALL_EMERGENCY_KEYWORDS);

  const segmentAnalyses: SegmentAnalysis[] = [];
  const allActiveKeywords = new Set<string>();
  
  // Analyze each segment
  for (const segment of segments) {
    const analysis = analyzeSegment(segment, keywordList, true);
    segmentAnalyses.push(analysis);

    for (const match of analysis.activeMatches) {
      allActiveKeywords.add(match.keyword);
    }
  }

  const matchedKeywords = Array.from(allActiveKeywords);

  // --- CONTEXT-AWARE SCORE ADJUSTMENT ---
  let finalScore = segmentAnalyses.length > 0 ? Math.max(...segmentAnalyses.map((s) => s.maxScore)) : 0;
  let reasoningParts: string[] = [];

  // Check if we have an absolute emergency (10/10)
  const hasAbsoluteEmergency = matchedKeywords.some(k => EMERGENCY_KEYWORDS[k] === 10);
  
  if (!hasAbsoluteEmergency && finalScore > 0) {
      let scoreModifier = 0;
      
      // 1. Danger Indicators (Multipliers/Adders)
      const activeDanger = Object.keys(DANGER_INDICATORS).filter(dk => {
        // Find segment containing this danger indicator
        const segment = segmentAnalyses.find(s => s.text.toLowerCase().includes(dk));
        if (!segment) return false;
        
        // If it's a keyword match in this segment, check if it was suppressed (negated)
        const suppressed = segment.suppressedMatches.some(m => m.keyword.toLowerCase().includes(dk));
        if (suppressed) return false;
        
        return true;
      });
      
      activeDanger.forEach(dk => {
          scoreModifier += DANGER_INDICATORS[dk];
          reasoningParts.push(`Danger indicator (+${DANGER_INDICATORS[dk]}): ${dk}.`);
      });

      // 2. Viral Indicators (De-escalation)
      // Only de-escalate if the primary symptoms are "Serious" but not "Absolute"
      const hasViralSymptoms = VIRAL_INDICATORS.some(vk => sanitized.toLowerCase().includes(vk));
      if (hasViralSymptoms && finalScore <= 7) {
          scoreModifier -= 2;
          reasoningParts.push('Viral indicators detected (-2): cough/runny nose/cold symptoms.');
      }

      // 3. Duration/Profile Adjustments
      const urgency = parseDurationUrgency(profile?.duration || null);
      if (urgency === 'chronic' && finalScore < 8) {
          scoreModifier += 1; // Chronic is serious but often less acute
          reasoningParts.push('Chronic duration (+1).');
      }

      const initialScore = finalScore;
      finalScore = Math.max(0, Math.min(10, finalScore + scoreModifier));
      
      if (finalScore !== initialScore) {
          console.log(`  [Scoring] Modified score from ${initialScore} to ${finalScore} based on context.`);
      }
  } else if (hasAbsoluteEmergency) {
      finalScore = 10;
      reasoningParts.push('Absolute emergency detected.');
  }

  // 4. Combination Risks (Fallback/Secondary check)
  let combinationReason = '';

  // 4. Safety Check: If AI marked case as complex/critical, we slightly weight the score up,
  // but if red flags are RESOLVED/DENIED, we never force an emergency just based on serious keywords.
  if (profile?.symptom_category === 'critical' && finalScore < 8 && !hasAbsoluteEmergency) {
      // AI thinks it's critical, but detector didn't find absolute keywords.
      // We might upgrade to 8 if there are serious keywords.
      if (finalScore >= 6) {
          finalScore = 8;
          reasoningParts.push('Upgraded based on AI category assessment.');
      }
  }

  let isEmergency = finalScore > 7;

  // --- AUTHORITY ENFORCEMENT: Profile Constraints ---
  // If red flags are explicitly resolved and DENIED, block Emergency escalation 
  // unless there is an absolute (10/10) emergency keyword detected in user input.
  if (profile?.red_flags_resolved === true) {
      const denials = (profile.red_flag_denials || '').toLowerCase();
      const hasDenials = denials.includes('none') || denials.includes('no critical') || denials.includes('wala');
      
      if (hasDenials && isEmergency && !hasAbsoluteEmergency) {
          console.log('  [Authority] Emergency blocked: Red flags were explicitly denied in structured profile.');
          isEmergency = false;
          finalScore = 7; // Cap at maximum non-emergency score
          reasoningParts.push('Authority block: Red flags denied in profile. Capping at non-emergency.');
      }
  }

  // Build reasoning
  let reasoning = '';
  if (isEmergency) {
    reasoning = `Emergency detected (score ${finalScore}/10). Symptoms: ${matchedKeywords.join(', ')}.`;
    if (combinationReason) reasoning += ` RISK: ${combinationReason}.`;
  } else {
    reasoning = matchedKeywords.length > 0 
      ? `Non-emergency (score ${finalScore}/10). Symptoms: ${matchedKeywords.join(', ')}.`
      : `No emergency symptoms detected.`;
  }
  
  if (reasoningParts.length > 0) {
      reasoning += ` [Context: ${reasoningParts.join(' ')}]`;
  }

  console.log(`\n--- FINAL RESULT ---`);
  console.log(`Score: ${finalScore}/10 | Emergency: ${isEmergency ? 'YES' : 'NO'}`);
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
    const advice = combinationReason
      ? `CRITICAL: High risk combination detected (${combinationReason}). Go to the nearest emergency room immediately.`
      : 'CRITICAL: Potential life-threatening condition detected. Go to the nearest emergency room or call emergency services immediately.';

    overrideResponse = {
      recommended_level: 'emergency',
      user_advice: advice,
      clinical_soap: `S: Patient reports ${matchedKeywords.join(', ')}. O: Emergency keywords detected${combinationReason ? ` - Risk: ${combinationReason}` : ''}. A: Potential life-threatening condition. P: Immediate ED referral.`,
      key_concerns: matchedKeywords.map((k) => `Urgent symptom: ${k}`),
      critical_warnings: ['Immediate medical attention required', 'Do not delay care'],
      relevant_services: ['Emergency'],
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

