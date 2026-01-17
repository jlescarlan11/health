/**
 * Utility functions for string manipulation and fuzzy matching.
 * Optimized version with performance improvements.
 */

export const FUZZY_THRESHOLD = 2;

const FALSE_POSITIVES: Record<string, string[]> = {
  doing: ['dying'],
  laying: ['dying'],
  lying: ['dying'],
  trying: ['dying'],
  drying: ['dying'],
};

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
 * Scans a text for ALL fuzzy matches against a list of keywords.
 * Optimized with early exits, caching, and threshold-aware distance calculation.
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

    if (normalized.length >= 5 && textData.normalized.includes(normalized)) {
      found.add(original);
      continue;
    }

    const len = normalized.length;
    let threshold = FUZZY_THRESHOLD;

    if (len <= 3) threshold = 0;
    else if (len <= 6) threshold = 1;
    else threshold = 2;

    const maxNgram = Math.max(wordCount, 3);
    let matched = false;

    for (let n = 1; n <= maxNgram && !matched; n++) {
      const ngrams = getNgrams(textData, n);

      for (const ngram of ngrams) {
        const lengthDiff = Math.abs(ngram.length - normalized.length);
        if (lengthDiff > (wordCount > 1 ? threshold + 1 : threshold)) {
          continue;
        }

        if (FALSE_POSITIVES[ngram]?.includes(original)) {
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
