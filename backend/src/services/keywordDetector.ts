export class KeywordDetector {
  protected tokenizeSentences(text: string): string[] {
    if (!text) return [];
    // Basic sentence splitting
    return text
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  protected isNegated(
    segment: string,
    keyword: string,
  ): { negated: boolean; hasAffirmation: boolean; contextWindow: string } {
    const lowerSegment = segment.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    const negationWords = [
      'no',
      'none',
      'wala',
      'hindi',
      'dae',
      'dai',
      'not',
      "don't",
      "didn't",
      "won't",
      'never',
      'negative',
    ];
    const affirmationWords = ['yes', 'oo', 'meron', 'opon', 'do have', 'positive'];

    const index = lowerSegment.indexOf(lowerKeyword);
    if (index === -1) {
      return { negated: false, hasAffirmation: false, contextWindow: '' };
    }

    const windowSize = 30;
    const start = Math.max(0, index - windowSize);
    const contextWindow = lowerSegment.substring(start, index);

    const negated = negationWords.some((word) => {
      const regex = new RegExp(`\b${word}\b`, 'i');
      return regex.test(contextWindow);
    });

    const hasAffirmation = affirmationWords.some((word) => {
      const regex = new RegExp(`\b${word}\b`, 'i');
      return regex.test(contextWindow);
    });

    return { negated, hasAffirmation, contextWindow };
  }
}
