/**
 * Calculates the Levenshtein distance between two strings.
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string into the other.
 *
 * @param s1 The first string to compare.
 * @param s2 The second string to compare.
 * @returns The Levenshtein distance between s1 and s2.
 */
export const getLevenshteinDistance = (s1: string, s2: string): number => {
  const m = s1.length;
  const n = s2.length;

  // Optimization: Ensure s1 is the longer string to use less space if we were using a 2D array,
  // or just to maintain consistency.
  if (m < n) return getLevenshteinDistance(s2, s1);
  if (n === 0) return m;

  // We only need the previous row of the distance matrix to calculate the current row.
  let previousRow = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 0; i < m; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < n; j++) {
      const insertions = previousRow[j + 1] + 1;
      const deletions = currentRow[j] + 1;
      const substitutions = previousRow[j] + (s1[i] === s2[j] ? 0 : 1);
      currentRow.push(Math.min(insertions, deletions, substitutions));
    }
    previousRow = currentRow;
  }

  return previousRow[n];
};
