/**
 * Utility functions for string manipulation and fuzzy matching.
 */

export const FUZZY_THRESHOLD = 2;

/**
 * Calculates the Levenshtein distance between two strings.
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string into the other.
 * 
 * Memory-efficient implementation using O(min(m,n)) space.
 *
 * @param s1 The first string to compare.
 * @param s2 The second string to compare.
 * @returns The Levenshtein distance between s1 and s2.
 */
export const getLevenshteinDistance = (s1: string, s2: string): number => {
  // Ensure s1 is the shorter string for space optimization
  if (s1.length > s2.length) {
    return getLevenshteinDistance(s2, s1);
  }

  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;

  // We only need two rows: previous and current
  let previousRow = Array.from({ length: m + 1 }, (_, i) => i);
  let currentRow = new Array(m + 1);

  for (let j = 0; j < n; j++) {
    currentRow[0] = j + 1;
    for (let i = 0; i < m; i++) {
      const substitutionCost = s1[i] === s2[j] ? 0 : 1;
      currentRow[i + 1] = Math.min(
        previousRow[i + 1] + 1, // deletion
        currentRow[i] + 1,      // insertion
        previousRow[i] + substitutionCost // substitution
      );
    }
    // Swap arrays for next iteration (avoid allocation)
    const temp = previousRow;
    previousRow = currentRow;
    currentRow = temp;
  }

  return previousRow[m];
};

/**
 * Scans a text for fuzzy matches against a list of keywords using a sliding window approach.
 * Checks single words (unigrams), adjacent word pairs (bigrams), and three-word sequences (trigrams).
 * Returns the first match found.
 *
 * @param text The user input text to search.
 * @param keywords A list of keywords/phrases to match against.
 * @returns The matched keyword if found, otherwise null.
 */
export const findFuzzyInString = (text: string, keywords: string[]): string | null => {
  const matches = findAllFuzzyMatches(text, keywords);
  return matches.length > 0 ? matches[0] : null;
};

/**
 * Scans a text for ALL fuzzy matches against a list of keywords.
 * Prioritizes exact matches for performance, then falls back to fuzzy matching.
 *
 * @param text The user input text to search.
 * @param keywords A list of keywords/phrases to match against.
 * @returns An array of all unique matched keywords.
 */
export const findAllFuzzyMatches = (text: string, keywords: string[]): string[] => {
  if (!text || !keywords || keywords.length === 0) return [];

  const found = new Set<string>();
  
  // Normalize text: lowercase and remove punctuation (keep spaces)
  // We keep spaces to preserve word boundaries for tokenization
  const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  
  // 1. Exact Match Phase (Fast)
  // Check if the normalized text explicitly contains the keyword
  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    if (normalizedText.includes(normalizedKeyword)) {
      found.add(keyword);
    }
  }

  // If we found everything, we could stop, but keywords might overlap or be distinct.
  // We'll proceed to fuzzy matching only for keywords NOT yet found? 
  // Actually, finding "chest pain" exactly doesn't preclude finding "shortness of breath" fuzzily.
  // We should optimize: Only check fuzzy for keywords NOT already found?
  // Yes, that's safe.
  
  const remainingKeywords = keywords.filter(k => !found.has(k));
  if (remainingKeywords.length === 0) {
    return Array.from(found);
  }

  const tokens = normalizedText.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return Array.from(found);

  // 2. Fuzzy Match Phase (Sliding Window)
  for (const keyword of remainingKeywords) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    
    // Sliding window: check unigrams, bigrams, and trigrams
    for (let i = 0; i < tokens.length; i++) {
      // Check Unigram (Single word)
      const unigram = tokens[i];
      if (getLevenshteinDistance(unigram, normalizedKeyword) <= FUZZY_THRESHOLD) {
        found.add(keyword);
        break; // Found this keyword, move to next keyword
      }

      // Check Bigram (Adjacent word pair)
      if (i < tokens.length - 1) {
        const bigram = `${tokens[i]} ${tokens[i + 1]}`;
        if (getLevenshteinDistance(bigram, normalizedKeyword) <= FUZZY_THRESHOLD) {
          found.add(keyword);
          break;
        }
      }

      // Check Trigram (Three-word sequence)
      if (i < tokens.length - 2) {
        const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
        if (getLevenshteinDistance(trigram, normalizedKeyword) <= FUZZY_THRESHOLD) {
          found.add(keyword);
          break;
        }
      }
    }
  }

  return Array.from(found);
};
