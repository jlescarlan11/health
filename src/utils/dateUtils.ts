const pad = (value: number) => String(value).padStart(2, '0');

const parseYear = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return Math.trunc(parsed);
};

const rawMinimumDobYear = parseYear(process.env.MINIMUM_DOB_YEAR);
export const MINIMUM_DOB_YEAR =
  typeof rawMinimumDobYear === 'number' ? Math.max(0, rawMinimumDobYear) : 1900;

const rawMinimumAgeYears = parseYear(process.env.MINIMUM_AGE_YEARS);
export const MINIMUM_AGE_YEARS =
  typeof rawMinimumAgeYears === 'number' ? Math.max(0, rawMinimumAgeYears) : 0;

export const HAS_MINIMUM_AGE_REQUIREMENT = MINIMUM_AGE_YEARS > 0;

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const getTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const getMinimumDateUtc = () => new Date(Date.UTC(MINIMUM_DOB_YEAR, 0, 1));

export const formatIsoDate = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  return `${year}-${month}-${day}`;
};

export const parseIsoDateString = (value: string): Date | null => {
  const trimmed = value.trim();
  const match = ISO_DATE_REGEX.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
};

export const coerceIsoDate = (value: unknown): Date | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value === 'string') {
    return parseIsoDateString(value) ?? undefined;
  }
  return undefined;
};

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const getUtcDateParts = (date: Date) => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
  day: date.getUTCDate(),
});

export interface AgeDelta {
  years: number;
  months: number;
  days: number;
}

export const calculateAge = (dob: Date, reference: Date = new Date()): AgeDelta => {
  const normalizedReference = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
  const dobParts = getUtcDateParts(dob);
  const refParts = getUtcDateParts(normalizedReference);

  let years = refParts.year - dobParts.year;
  let months = refParts.month - dobParts.month;
  let days = refParts.day - dobParts.day;

  if (days < 0) {
    months -= 1;
    const prevMonth = refParts.month - 1 || 12;
    const yearForPrevMonth = prevMonth === 12 ? refParts.year - 1 : refParts.year;
    days += daysInMonth(yearForPrevMonth, prevMonth);
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    years,
    months,
    days,
  };
};

export const formatAgeDescription = (age: AgeDelta): string => {
  if (age.years > 0) {
    return `${age.years} year${age.years === 1 ? '' : 's'}`;
  }
  if (age.months > 0) {
    return `${age.months} month${age.months === 1 ? '' : 's'}`;
  }
  return `${age.days} day${age.days === 1 ? '' : 's'}`;
};

export const formatIsoDateWithAge = (value: string, reference: Date = new Date()): string => {
  const parsed = parseIsoDateString(value);
  if (!parsed) {
    return value;
  }
  const age = calculateAge(parsed, reference);
  return `${value} (${formatAgeDescription(age)})`;
};

export const isValidDobForRange = (date: Date): boolean => {
  const reference = getTodayUtc();
  return date.getTime() >= getMinimumDateUtc().getTime() && date.getTime() <= reference.getTime();
};

export const isDateInFuture = (date: Date): boolean => {
  return date.getTime() > getTodayUtc().getTime();
};

export const meetsMinimumAgeRequirement = (date: Date): boolean => {
  if (!HAS_MINIMUM_AGE_REQUIREMENT) {
    return true;
  }
  const age = calculateAge(date);
  return age.years >= MINIMUM_AGE_YEARS;
};

export const DATE_ERROR_MESSAGE = 'Date of Birth must use YYYY-MM-DD and represent a real past date.';
export const FUTURE_DATE_MESSAGE = 'Date of Birth cannot be in the future.';
export const RANGE_DATE_MESSAGE = `Date of Birth must be between ${MINIMUM_DOB_YEAR}-01-01 and today.`;
export const AGE_REQUIREMENT_MESSAGE = HAS_MINIMUM_AGE_REQUIREMENT
  ? `You must be at least ${MINIMUM_AGE_YEARS} years old.`
  : undefined;
