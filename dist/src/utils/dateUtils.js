"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGE_REQUIREMENT_MESSAGE = exports.RANGE_DATE_MESSAGE = exports.FUTURE_DATE_MESSAGE = exports.DATE_ERROR_MESSAGE = exports.meetsMinimumAgeRequirement = exports.isDateInFuture = exports.isValidDobForRange = exports.formatIsoDateWithAge = exports.formatAgeDescription = exports.calculateAge = exports.coerceIsoDate = exports.parseIsoDateString = exports.formatIsoDate = exports.HAS_MINIMUM_AGE_REQUIREMENT = exports.MINIMUM_AGE_YEARS = exports.MINIMUM_DOB_YEAR = void 0;
const pad = (value) => String(value).padStart(2, '0');
const parseYear = (value) => {
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
exports.MINIMUM_DOB_YEAR = typeof rawMinimumDobYear === 'number' ? Math.max(0, rawMinimumDobYear) : 1900;
const rawMinimumAgeYears = parseYear(process.env.MINIMUM_AGE_YEARS);
exports.MINIMUM_AGE_YEARS = typeof rawMinimumAgeYears === 'number' ? Math.max(0, rawMinimumAgeYears) : 0;
exports.HAS_MINIMUM_AGE_REQUIREMENT = exports.MINIMUM_AGE_YEARS > 0;
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const getTodayUtc = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};
const getMinimumDateUtc = () => new Date(Date.UTC(exports.MINIMUM_DOB_YEAR, 0, 1));
const formatIsoDate = (date) => {
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    return `${year}-${month}-${day}`;
};
exports.formatIsoDate = formatIsoDate;
const parseIsoDateString = (value) => {
    const trimmed = value.trim();
    const match = ISO_DATE_REGEX.exec(trimmed);
    if (!match) {
        return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (Number.isNaN(year) ||
        Number.isNaN(month) ||
        Number.isNaN(day) ||
        month < 1 ||
        month > 12) {
        return null;
    }
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > daysInMonth) {
        return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
};
exports.parseIsoDateString = parseIsoDateString;
const coerceIsoDate = (value) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    }
    if (typeof value === 'string') {
        return (0, exports.parseIsoDateString)(value) ?? undefined;
    }
    return undefined;
};
exports.coerceIsoDate = coerceIsoDate;
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const getUtcDateParts = (date) => ({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
});
const calculateAge = (dob, reference = new Date()) => {
    const normalizedReference = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
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
exports.calculateAge = calculateAge;
const formatAgeDescription = (age) => {
    if (age.years > 0) {
        return `${age.years} year${age.years === 1 ? '' : 's'}`;
    }
    if (age.months > 0) {
        return `${age.months} month${age.months === 1 ? '' : 's'}`;
    }
    return `${age.days} day${age.days === 1 ? '' : 's'}`;
};
exports.formatAgeDescription = formatAgeDescription;
const formatIsoDateWithAge = (value, reference = new Date()) => {
    const parsed = (0, exports.parseIsoDateString)(value);
    if (!parsed) {
        return value;
    }
    const age = (0, exports.calculateAge)(parsed, reference);
    return `${value} (${(0, exports.formatAgeDescription)(age)})`;
};
exports.formatIsoDateWithAge = formatIsoDateWithAge;
const isValidDobForRange = (date) => {
    const reference = getTodayUtc();
    return date.getTime() >= getMinimumDateUtc().getTime() && date.getTime() <= reference.getTime();
};
exports.isValidDobForRange = isValidDobForRange;
const isDateInFuture = (date) => {
    return date.getTime() > getTodayUtc().getTime();
};
exports.isDateInFuture = isDateInFuture;
const meetsMinimumAgeRequirement = (date) => {
    if (!exports.HAS_MINIMUM_AGE_REQUIREMENT) {
        return true;
    }
    const age = (0, exports.calculateAge)(date);
    return age.years >= exports.MINIMUM_AGE_YEARS;
};
exports.meetsMinimumAgeRequirement = meetsMinimumAgeRequirement;
exports.DATE_ERROR_MESSAGE = 'Date of Birth must use YYYY-MM-DD and represent a real past date.';
exports.FUTURE_DATE_MESSAGE = 'Date of Birth cannot be in the future.';
exports.RANGE_DATE_MESSAGE = `Date of Birth must be between ${exports.MINIMUM_DOB_YEAR}-01-01 and today.`;
exports.AGE_REQUIREMENT_MESSAGE = exports.HAS_MINIMUM_AGE_REQUIREMENT
    ? `You must be at least ${exports.MINIMUM_AGE_YEARS} years old.`
    : undefined;
//# sourceMappingURL=dateUtils.js.map