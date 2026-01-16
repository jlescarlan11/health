/**
 * Utility functions for string manipulation and fuzzy matching.
 * Optimized version with performance improvements.
 */

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
  // Ensure s1 is the shorter string
  if (s1.length > s2.length) {
    return getLevenshteinDistance(s2, s1, maxDistance);
  }

  const m = s1.length;
  const n = s2.length;

  // Early exit: if length difference exceeds threshold, no need to calculate
  if (n - m > maxDistance) return Infinity;
  if (m === 0) return n;

  // We only need two rows: previous and current
  let previousRow = Array.from({ length: m + 1 }, (_, i) => i);
  let currentRow = new Array(m + 1);

  for (let j = 0; j < n; j++) {
    currentRow[0] = j + 1;
    let minInRow = currentRow[0];

    for (let i = 0; i < m; i++) {
      const substitutionCost = s1[i] === s2[j] ? 0 : 1;
      currentRow[i + 1] = Math.min(
        previousRow[i + 1] + 1, // deletion
        currentRow[i] + 1, // insertion
        previousRow[i] + substitutionCost, // substitution
      );
      minInRow = Math.min(minInRow, currentRow[i + 1]);
    }

    // Early termination: if minimum value in current row exceeds threshold, abort
    if (minInRow > maxDistance) {
      return Infinity;
    }

    // Swap arrays for next iteration
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
  ngrams: Map<number, string[]>; // Cache for n-grams
}

const normalizeAndTokenize = (text: string): NormalizedText => {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);

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
 * Scans a text for fuzzy matches against a list of keywords using a sliding window approach.
 * Returns the first match found.
 */
export const findFuzzyInString = (text: string, keywords: string[]): string | null => {
  const matches = findAllFuzzyMatches(text, keywords);
  return matches.length > 0 ? matches[0] : null;
};

/**
 * Scans a text for ALL fuzzy matches against a list of keywords.
 * Optimized with early exits, caching, and threshold-aware distance calculation.
 */
export const findAllFuzzyMatches = (text: string, keywords: string[]): string[] => {
  if (!text || !keywords || keywords.length === 0) return [];

  const found = new Set<string>();
  const textData = normalizeAndTokenize(text);

  if (textData.tokens.length === 0) return [];

  // Pre-normalize keywords and sort by length (process longer ones first)
  // Longer keywords are more specific and less likely to match
  const normalizedKeywords = keywords
    .map((kw) => ({
      original: kw,
      normalized: kw.toLowerCase().trim(),
      wordCount: kw.trim().split(/\s+/).length,
    }))
    .sort((a, b) => b.normalized.length - a.normalized.length);

  for (const { original, normalized, wordCount } of normalizedKeywords) {
    if (found.has(original)) continue;

    // 1. Exact substring match for longer keywords (≥5 chars)
    if (normalized.length >= 5 && textData.normalized.includes(normalized)) {
      found.add(original);
      continue;
    }

    // Dynamic threshold based on keyword length
    // <= 3 chars: Exact match required (Threshold 0)
    // 4-6 chars: Allow 1 edit (Threshold 1)
    // > 6 chars: Allow 2 edits (Threshold 2)
    const len = normalized.length;
    let threshold = FUZZY_THRESHOLD;
    
    if (len <= 3) threshold = 0;
    else if (len <= 6) threshold = 1;
    else threshold = 2;

    // Explicitly exclude known distinct words that computationally look like keywords
    // This prevents "doing" (valid word) from triggering "dying" (emergency keyword)
    const FALSE_POSITIVES: Record<string, string[]> = {
        'doing': ['dying'],
        'laying': ['dying'],
        'lying': ['dying'],
        'trying': ['dying'],
        'drying': ['dying'],
    };

    // Only check n-grams up to the keyword's word count (optimization)
    const maxNgram = Math.min(wordCount + 1, 3); // Check up to trigrams
    let matched = false;

    for (let n = 1; n <= maxNgram && !matched; n++) {
      const ngrams = getNgrams(textData, n);

      for (const ngram of ngrams) {
        // Skip if length difference is too large (early exit)
        if (Math.abs(ngram.length - normalized.length) > threshold) {
          continue;
        }

        // Check false positives list
        if (FALSE_POSITIVES[ngram] && FALSE_POSITIVES[ngram].includes(original)) {
             continue;
        }

        const distance = getLevenshteinDistance(ngram, normalized, threshold);

        if (distance <= threshold) {
          found.add(original);
          matched = true;
          break;
        }
      }
    }
  }

  return Array.from(found);
};
