import { detectEmergency } from '../src/services/emergencyDetector';
import { detectMentalHealthCrisis } from '../src/services/mentalHealthDetector';

interface GuardFilterOptions {
  suppressedKeywords?: string[];
  pendingKeyword?: string | null;
}

const filterActiveKeywords = (
  keywords: string[] | undefined,
  options: GuardFilterOptions,
): string[] => {
  if (!keywords) return [];
  const suppressed = options.suppressedKeywords || [];
  const pending = options.pendingKeyword || null;
  return keywords.filter((keyword) => {
    if (!keyword) return false;
    if (suppressed.includes(keyword)) return false;
    if (pending && pending === keyword) return false;
    return true;
  });
};

const runEmergencyGuardLike = (
  text: string,
  options: GuardFilterOptions = {},
) => {
  const safetyCheck = detectEmergency(text, { isUserInput: true });
  const activeKeywords = filterActiveKeywords(safetyCheck.matchedKeywords, options);
  return {
    safetyCheck,
    activeKeywords,
    triggered: activeKeywords.length > 0,
  };
};

const runMentalHealthGuardLike = (
  text: string,
  options: GuardFilterOptions = {},
) => {
  const mentalResult = detectMentalHealthCrisis(text);
  const activeKeywords = filterActiveKeywords(mentalResult.matchedKeywords, options);
  return {
    mentalResult,
    activeKeywords,
    triggered: activeKeywords.length > 0,
  };
};

describe('Safety interceptor stress tests', () => {
  it('fires once per emergency keyword while streaming partial user chunks', () => {
    const streamingChunks = ['I have', 'I have chest', 'I have chest pain'];
    let pendingKeyword: string | null = null;
    let suppressedKeywords: string[] = [];

    const triggerSequence = streamingChunks.map((chunk) => {
      const { triggered, activeKeywords } = runEmergencyGuardLike(chunk, {
        suppressedKeywords,
        pendingKeyword,
      });
      if (triggered && !pendingKeyword) {
        pendingKeyword = activeKeywords[0];
      }
      return triggered;
    });

    expect(triggerSequence).toEqual([false, false, true]);
    expect(pendingKeyword).toBe('chest pain');

    const firstPostTrigger = runEmergencyGuardLike('chest pain is still here', {
      suppressedKeywords,
      pendingKeyword,
    });
    expect(firstPostTrigger.triggered).toBe(false);

    suppressedKeywords = [...suppressedKeywords, pendingKeyword!];
    pendingKeyword = null;

    const postDenial = runEmergencyGuardLike('No more chest pain', {
      suppressedKeywords,
      pendingKeyword,
    });
    expect(postDenial.triggered).toBe(false);

    const newThreat = runEmergencyGuardLike('Now there is shortness of breath', {
      suppressedKeywords,
      pendingKeyword,
    });
    expect(newThreat.triggered).toBe(true);
    expect(newThreat.activeKeywords).toContain('shortness of breath');
  });

  it('bubbles only once for a mental health crisis keyword that builds over streaming chunks', () => {
    const mentalChunks = ['I feel', 'I feel like', 'I feel like dying'];
    let pendingKeywords: string[] = [];
    const triggers: boolean[] = [];

    mentalChunks.forEach((chunk) => {
      const { triggered, activeKeywords, mentalResult } = runMentalHealthGuardLike(chunk, {
        suppressedKeywords: pendingKeywords,
      });
      if (triggered && pendingKeywords.length === 0) {
        pendingKeywords = activeKeywords;
        expect(mentalResult.score).toBeGreaterThanOrEqual(8);
      }
      triggers.push(triggered);
    });

    expect(triggers).toEqual([false, false, true]);

    const repeatedAlert = runMentalHealthGuardLike('I still feel like dying', {
      suppressedKeywords: pendingKeywords,
    });
    expect(repeatedAlert.triggered).toBe(false);
  });

  it('suppresses emergency re-alerting after a denial path mirrors the UI guard', () => {
    const suppressedKeywords = ['chest pain'];
    const { triggered } = runEmergencyGuardLike('There is chest pain again', {
      suppressedKeywords,
    });
    expect(triggered).toBe(false);
  });

  it('keeps follow-up flow unblocked when emergency score stays below 7', () => {
    const { safetyCheck } = runEmergencyGuardLike('I have a mild headache and a scratchy throat');
    expect(safetyCheck.score).toBeLessThan(7);
    expect(safetyCheck.isEmergency).toBe(false);
    expect(safetyCheck.matchedKeywords).toContain('headache');
  });
});
