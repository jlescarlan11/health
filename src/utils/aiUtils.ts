import { DEFAULT_RED_FLAG_QUESTION } from './aiConstants';
import { normalizeNumericValue } from './stringUtils';
import { SYSTEM_LOCK_KEYWORD_MAP } from '../types/triage';

export function normalizeSlot(
  value: any,
  options: { allowNone?: boolean } = {},
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value);
  const trimmed = stringValue.trim();
  if (trimmed === '') {
    return null;
  }

  const lower = trimmed.toLowerCase();
  const nullIndicators = ['null', 'n/a', 'unknown', 'not mentioned', 'unsure'];

  if (!options.allowNone) {
    nullIndicators.push('none');
  }

  if (nullIndicators.includes(lower)) {
    return null;
  }

  return value;
}

export function normalizeDenialConfidence(
  value: unknown,
): 'high' | 'medium' | 'low' | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-z\s]/g, ' ');

  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const hasToken = (target: string) =>
    tokens.some((token) => token === target || token.startsWith(target));

  if (hasToken('high')) {
    return 'high';
  }

  if (hasToken('medium') || hasToken('moderate')) {
    return 'medium';
  }

  if (hasToken('low')) {
    return 'low';
  }

  return undefined;
}

export function normalizeBooleanResponse(text: string | null | undefined): boolean | null {
  if (!text) return null;

  const lower = text.trim().toLowerCase();

  const negativePatterns = [
    /^no\b/, /^hindi\b/, /^wala\b/, /^none\b/, /don't have/, /do not have/, /not experiencing/, /negative/, /^hindi ko po/, /^no,/,
  ];

  if (negativePatterns.some((pattern) => pattern.test(lower))) {
    return false;
  }

  const positivePatterns = [
    /^yes\b/, /^oo\b/, /^meron\b/, /^opon\b/, /i have/, /experiencing/, /positive/,
  ];

  if (positivePatterns.some((pattern) => pattern.test(lower))) {
    return true;
  }

  return null;
}

export function checkCriticalSystemKeywords(input: string): 'critical' | 'complex' | null {
  if (!input) return null;

  const lowerInput = input.toLowerCase();
  let highestCategory: 'critical' | 'complex' | null = null;
  const categoryPriority = { complex: 1, critical: 2 };

  for (const systemKey in SYSTEM_LOCK_KEYWORD_MAP) {
    const config = SYSTEM_LOCK_KEYWORD_MAP[systemKey as keyof typeof SYSTEM_LOCK_KEYWORD_MAP];
    const hasMatch = config.keywords.some((keyword) => {
      const words = keyword.toLowerCase().split(' ');
      if (words.length > 1) {
        const pattern = words.map((w) => `(?=.*\\b${w}\\b)`).join('');
        const regex = new RegExp(`^${pattern}.*$`, 'i');
        return regex.test(lowerInput);
      }
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      return regex.test(lowerInput);
    });

    if (hasMatch) {
      const targetCat = config.escalationCategory;
      if (!highestCategory || categoryPriority[targetCat] > categoryPriority[highestCategory]) {
        highestCategory = targetCat;
      }
    }
  }

  return highestCategory;
}

export function calculateTriageScore(slots: {
  age?: string | null;
  duration?: string | null;
  severity?: string | null;
  progression?: string | null;
  red_flags_resolved?: boolean;
  uncertainty_accepted?: boolean;
  clinical_friction_detected?: boolean;
  ambiguity_detected?: boolean;
  internal_inconsistency_detected?: boolean;
  symptom_category?: 'simple' | 'complex' | 'critical';
  turn_count?: number;
  denial_confidence?: 'high' | 'medium' | 'low';
  symptom_text?: string;
}): { score: number; escalated_category: 'simple' | 'complex' | 'critical' } {
  let score = 1.0;
  let currentCategory = slots.symptom_category || 'simple';

  let coreSlots: ('age' | 'duration' | 'severity' | 'progression')[] = [
    'age', 'duration', 'severity', 'progression',
  ];

  if (currentCategory === 'simple') {
    const severityVal = normalizeSlot(slots.severity) || '';
    const descriptorRegex = /\b(mild|minor|slight|minimal)\b/i;
    const numericRegex = /\b([1-4])\s*(\/|out of)\s*10\b/i;
    const hasDescriptor = descriptorRegex.test(severityVal);
    const numericValue = normalizeNumericValue(severityVal);
    const hasNumeric = numericRegex.test(severityVal) || (numericValue !== null && numericValue >= 1 && numericValue <= 4);
    
    if (hasDescriptor && hasNumeric) {
      coreSlots = ['duration', 'severity'];
    }
  }

  const nullCount = coreSlots.filter((s) => !normalizeSlot(slots[s])).length;
  if (nullCount > 0) {
    if (slots.uncertainty_accepted) {
      score -= 0.05 + nullCount * 0.05;
    } else {
      score = 0.8 - nullCount * 0.1;
    }
  }

  if (!slots.red_flags_resolved) score = Math.min(score, 0.4);
  if (slots.clinical_friction_detected) score = Math.min(score, 0.6);
  if (slots.ambiguity_detected) score = Math.min(score, 0.7);
  if (currentCategory === 'complex' && (slots.turn_count || 0) < 7) score = Math.min(score, 0.85);
  if (slots.internal_inconsistency_detected) score -= 0.4;
  if (slots.denial_confidence === 'low') score -= 0.2;

  const escalatedCategory = checkCriticalSystemKeywords(slots.symptom_text || '');
  if (escalatedCategory) {
    const hierarchy = { simple: 0, complex: 1, critical: 2 };
    if (hierarchy[escalatedCategory] > hierarchy[currentCategory]) {
      currentCategory = escalatedCategory;
      if (currentCategory === 'complex' && (slots.turn_count || 0) < 7) score = Math.min(score, 0.85);
    }
  }

  return { score: Math.max(0, Math.min(1.0, score)), escalated_category: currentCategory };
}

export function parseAndValidateLLMResponse<T = unknown>(rawResponse: string): T {
  try {
    const cleaned = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        throw new Error('Failed to parse extracted JSON from LLM response');
      }
    }
    throw new Error(`Failed to parse LLM response`);
  }
}

export function prioritizeQuestions(questions: any[]): any[] {
  const redFlagIndex = questions.findIndex((q) => q.id === 'red_flags');
  const sortedQuestions = [...questions];

  if (redFlagIndex === -1) {
    const insertIndex = sortedQuestions.length > 0 ? 1 : 0;
    sortedQuestions.splice(insertIndex, 0, DEFAULT_RED_FLAG_QUESTION);
    return sortedQuestions;
  }

  if (redFlagIndex > 2) {
    const [redFlagQ] = sortedQuestions.splice(redFlagIndex, 1);
    sortedQuestions.splice(1, 0, redFlagQ);
  }

  return sortedQuestions;
}
