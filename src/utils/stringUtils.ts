/**
 * Utility functions for string manipulation and fuzzy matching.
 * Stricter version with performance improvements.
 */

const FALSE_POSITIVES: Record<string, string[]> = {
  doing: ['dying'],
  laying: ['dying'],
  lying: ['dying'],
  trying: ['dying'],
  drying: ['dying'],
  'want to give': ['want to die'],

  // False positives for short Bicolano keywords
  bar: ['bari'], // 'bari' (broken)
  bare: ['bari'],
  bear: ['bari'],
  suck: ['suka'], // 'suka' (vomit)
  dug: ['dugi'], // 'dugi' (choking/fishbone)
  hopes: ['hapos'], // 'hapos' (asthma)
  hop: ['hapos'],
  pods: ['pudos'], // 'pudos' (shortness of breath)

  // Choking collisions (common -ing words)
  coming: ['choking'],
  cooking: ['choking'],
  joking: ['choking'],
  checking: ['choking'],
  shocking: ['choking'],
  clocking: ['choking'],
  booking: ['choking'],
};

export const FUZZY_THRESHOLD = 2;

/**
 * Calculates the Levenshtein distance between two strings.
 * Early termination when distance exceeds threshold.
 *
 * @param s1 The first string to compare.
 * @param s2 The second string to compare.
 * @param maxDistance Maximum distance threshold (early termination if exceeded).
 * @returns The Levenshtein distance, or Infinity if it exceeds maxDistance.
 */
export const getLevenshteinDistance = (
  s1: string,
  s2: string,
  maxDistance: number = Infinity,
): number => {
  if (s1.length > s2.length) {
    return getLevenshteinDistance(s2, s1, maxDistance);
  }

  const m = s1.length;
  const n = s2.length;

  if (n - m > maxDistance) return Infinity;
  if (m === 0) return n;

  let previousRow = Array.from({ length: m + 1 }, (_, i) => i);
  let currentRow = new Array(m + 1);

  for (let j = 0; j < n; j++) {
    currentRow[0] = j + 1;
    let minInRow = currentRow[0];

    for (let i = 0; i < m; i++) {
      const substitutionCost = s1[i] === s2[j] ? 0 : 1;
      currentRow[i + 1] = Math.min(
        previousRow[i + 1] + 1,
        currentRow[i] + 1,
        previousRow[i] + substitutionCost,
      );
      minInRow = Math.min(minInRow, currentRow[i + 1]);
    }

    if (minInRow > maxDistance) {
      return Infinity;
    }

    const temp = previousRow;
    previousRow = currentRow;
    currentRow = temp;
  }

  return previousRow[m];
};

/**
 * Normalizes and tokenizes text once for reuse.
 */
interface NormalizedText {
  normalized: string;
  tokens: string[];
  ngrams: Map<number, string[]>;
}

const normalizeAndTokenize = (text: string): NormalizedText => {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim();
  const tokens = normalized ? normalized.split(/\s+/) : [];

  return {
    normalized,
    tokens,
    ngrams: new Map(),
  };
};

/**
 * Generate n-grams with caching.
 */
const getNgrams = (textData: NormalizedText, n: number): string[] => {
  if (textData.ngrams.has(n)) {
    return textData.ngrams.get(n)!;
  }

  const { tokens } = textData;
  const ngrams: string[] = [];

  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }

  textData.ngrams.set(n, ngrams);
  return ngrams;
};

/**
 * Calculate threshold based on string length using percentage-based approach.
 * Stricter thresholds for better precision.
 */
const getThreshold = (length: number): number => {
  if (length <= 4) return 0; // Exact match only for very short words
  if (length <= 7) return 1; // 1 edit for medium words
  return Math.floor(length * 0.2); // 20% error rate for longer words
};

/**
 * Scans a text for ALL fuzzy matches against a list of keywords.
 * Stricter matching with performance optimizations.
 */
export const findAllFuzzyMatches = (text: string, keywords: string[]): string[] => {
  if (!text || !keywords || keywords.length === 0) return [];

  const found = new Set<string>();
  const textData = normalizeAndTokenize(text);

  if (textData.tokens.length === 0) return [];

  const normalizedKeywords = keywords
    .map((kw) => ({
      original: kw,
      normalized: kw.toLowerCase().trim(),
      wordCount: kw.trim().split(/\s+/).length,
    }))
    .sort((a, b) => b.normalized.length - a.normalized.length);

  for (const { original, normalized, wordCount } of normalizedKeywords) {
    if (found.has(original)) continue;

    const len = normalized.length;
    const threshold = getThreshold(len);

    // Calculate valid length range for potential matches
    const minLen = Math.max(1, len - threshold);
    const maxLen = len + threshold;

    // Only generate n-grams for the actual word count needed
    const ngrams = getNgrams(textData, wordCount);
    let matched = false;

    for (const ngram of ngrams) {
      // Early exit: length filter
      if (ngram.length < minLen || ngram.length > maxLen) {
        continue;
      }

      // Early exit: first character must match (stricter matching)
      if (ngram[0] !== normalized[0]) {
        continue;
      }

      // Early exit: check false positives
      if (FALSE_POSITIVES[ngram]?.includes(original)) {
        continue;
      }

      // Calculate distance with threshold limit
      const distance = getLevenshteinDistance(ngram, normalized, threshold);

      if (distance <= threshold) {
        found.add(original);
        matched = true;
        break;
      }
    }
  }

  return Array.from(found);
};
