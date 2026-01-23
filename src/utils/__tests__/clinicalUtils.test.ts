import { isMaternalContext, isTraumaContext } from '../clinicalUtils';

describe('isTraumaContext', () => {
  test('detects English trauma terms', () => {
    expect(isTraumaContext('I fell off a ladder.')).toBe(true);
    expect(isTraumaContext('car accident')).toBe(true);
    expect(isTraumaContext('broken arm')).toBe(true);
    expect(isTraumaContext('burn injury on my hand')).toBe(true);
  });

  test('detects Tagalog trauma terms', () => {
    expect(isTraumaContext('nahulog ako sa hagdan')).toBe(true);
    expect(isTraumaContext('naaksidente ako kanina')).toBe(true);
    expect(isTraumaContext('nabangga ako ng kotse')).toBe(true);
  });

  test('detects Bicol trauma terms', () => {
    expect(isTraumaContext('nabangga an motor')).toBe(true);
    expect(isTraumaContext('nasakit an paa ko pagkatapos mahulog')).toBe(true);
  });

  test('handles case variations', () => {
    expect(isTraumaContext('FELL off a chair')).toBe(true);
    expect(isTraumaContext('Accident on the road')).toBe(true);
    expect(isTraumaContext('NaHulog ako')).toBe(true);
  });

  test('detects compound phrases', () => {
    expect(isTraumaContext('I fell and hit my head.')).toBe(true);
  });

  test('detects mixed language input', () => {
    expect(isTraumaContext('I nahulog sa stairs')).toBe(true);
  });

  test('detects multiple trauma keywords in one sentence', () => {
    expect(isTraumaContext('fell off motorcycle and broke arm')).toBe(true);
  });

  test('handles special characters and punctuation', () => {
    expect(isTraumaContext('fell!')).toBe(true);
    expect(isTraumaContext('accident?')).toBe(true);
    expect(isTraumaContext('nahulog,')).toBe(true);
  });

  test('does not match non-trauma symptoms', () => {
    expect(isTraumaContext('headache')).toBe(false);
    expect(isTraumaContext('feeling dizzy')).toBe(false);
    expect(isTraumaContext('cough')).toBe(false);
  });

  test('prevents false positives from partial matches', () => {
    expect(isTraumaContext('butterfly')).toBe(false);
    expect(isTraumaContext('selling items online')).toBe(false);
    expect(isTraumaContext('I accidentally dropped my phone')).toBe(false);
  });

  test('handles boundary conditions', () => {
    expect(isTraumaContext('')).toBe(false);
    expect(isTraumaContext('   ')).toBe(false);
    expect(isTraumaContext((null as unknown) as string)).toBe(false);
    expect(isTraumaContext((undefined as unknown) as string)).toBe(false);
  });

  test('matches return value handling used by isMaternalContext', () => {
    const historyText = 'I fell off a ladder yesterday.';
    expect(isTraumaContext(historyText)).toBe(true);
    expect(isMaternalContext(historyText)).toBe(false);
  });
});
