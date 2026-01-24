import { createClinicalSlotParser } from '../clinicalUtils';

describe('ClinicalSlotParser - Conflict Resolution', () => {
  let parser: ReturnType<typeof createClinicalSlotParser>;

  beforeEach(() => {
    parser = createClinicalSlotParser();
  });

  it('prioritizes later duration over earlier duration', () => {
    parser.parseTurn('I have had this for 2 days');
    let slots = parser.getSlots();
    expect(slots.duration).toBe('2 days');

    parser.parseTurn('Actually it has been 1 week');
    slots = parser.getSlots();
    expect(slots.duration).toBe('1 week');
  });

  it('prioritizes later severity over earlier severity', () => {
    parser.parseTurn('The pain is mild');
    let slots = parser.getSlots();
    expect(slots.severity).toBe('mild');

    parser.parseTurn('It is now 10/10 severe');
    slots = parser.getSlots();
    expect(slots.severity).toBe('10/10');
  });

  it('retains existing values if later message does not contain conflict', () => {
    parser.parseTurn('I am 30 years old');
    let slots = parser.getSlots();
    expect(slots.age).toBe('30');

    parser.parseTurn('I have a headache'); // No age mention
    slots = parser.getSlots();
    expect(slots.age).toBe('30');
  });

  it('updates multiple slots across turns correctly', () => {
    parser.parseTurn('Age 25, duration 2 hours');
    let slots = parser.getSlots();
    expect(slots.age).toBe('25');
    expect(slots.duration).toBe('2 hours');

    parser.parseTurn('Duration is actually 5 days');
    slots = parser.getSlots();
    expect(slots.age).toBe('25');
    expect(slots.duration).toBe('5 days');

    parser.parseTurn('I am 26');
    slots = parser.getSlots();
    expect(slots.age).toBe('26');
    expect(slots.duration).toBe('5 days');
  });
});
