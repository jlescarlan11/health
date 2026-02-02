"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractClinicalSlots = exports.normalizeAge = exports.isMaternalContext = exports.calculateAgeFromDob = exports.parseSoap = void 0;
const stringUtils_1 = require("./stringUtils");
const parseSoap = (text) => {
    const sMatch = text.match(/S:\s*([\s\S]*?)(?=\s*O:|$)/);
    const oMatch = text.match(/O:\s*([\s\S]*?)(?=\s*A:|$)/);
    const aMatch = text.match(/A:\s*([\s\S]*?)(?=\s*P:|$)/);
    const pMatch = text.match(/P:\s*([\s\S]*?)$/);
    if (!sMatch && !oMatch && !aMatch && !pMatch) {
        try {
            const json = JSON.parse(text);
            return {
                s: json.subjective,
                o: json.objective,
                a: json.assessment,
                p: json.plan,
            };
        }
        catch { }
    }
    return {
        s: sMatch ? sMatch[1].trim() : undefined,
        o: oMatch ? oMatch[1].trim() : undefined,
        a: aMatch ? aMatch[1].trim() : undefined,
        p: pMatch ? pMatch[1].trim() : undefined,
    };
};
exports.parseSoap = parseSoap;
const calculateAgeFromDob = (dob) => {
    if (!dob)
        return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime()))
        return null;
    const today = new Date();
    return today.getFullYear() - birthDate.getFullYear();
};
exports.calculateAgeFromDob = calculateAgeFromDob;
const isMaternalContext = (text) => {
    const maternalKeywords = [/\bbuntis\b/i, /\bpregnant\b/i, /\bprenatal\b/i, /\bmaternity\b/i, /\bnaglilihi\b/i, /\bkabwanan\b/i];
    return maternalKeywords.some((regex) => regex.test(text));
};
exports.isMaternalContext = isMaternalContext;
const normalizeAge = (age) => {
    const normalized = (0, stringUtils_1.normalizeNumericValue)(age);
    if (normalized === null || Number.isNaN(normalized))
        return null;
    return Math.floor(normalized);
};
exports.normalizeAge = normalizeAge;
const extractClinicalSlots = (text) => {
    const lowerText = text.toLowerCase();
    const slots = {};
    const ageRegex = /(\d+)\s*(?:years?\s*old|y\/?o|y\.?o\.?|yrs?\b|y\b)/i;
    const ageMatch = lowerText.match(ageRegex);
    if (ageMatch)
        slots.age = ageMatch[1];
    const durationPatterns = [
        /started\s+(yesterday|\d+\s*\w+\s*ago)/i,
        /since\s+(yesterday|last\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+)/i,
        /for\s+((?:a|an|\d+)\s*(?:hours?|mins?|minutes?|days?|weeks?|months?|years?))/i,
        /\b((?:\d+|a|an)\s*(?:hours?|mins?|minutes?|days?|weeks?|months?|years?)(?:\s*(?:ago|now))?)(?!\s*old)\b/i,
    ];
    for (const pattern of durationPatterns) {
        const match = lowerText.match(pattern);
        if (match) {
            slots.duration = (match[1] || match[0]).trim();
            break;
        }
    }
    const numericSeverityRegex = /\b([0-9]|10)\s*(\/|out of)\s*10\b/i;
    const numericSeverityMatch = lowerText.match(numericSeverityRegex);
    if (numericSeverityMatch) {
        slots.severity = numericSeverityMatch[0].trim();
    }
    else {
        const qualSeverityRegex = /\b(mild|moderate|severe|excruciating|unbearable)\b/i;
        const qualSeverityMatch = lowerText.match(qualSeverityRegex);
        if (qualSeverityMatch)
            slots.severity = qualSeverityMatch[0].trim();
    }
    const tempRegex = /\b(?:temperature|temp|mainit)\s*(?:is|of|na)?\s*(\d{2,3}(?:\.\d)?)\s*(?:c|f|degrees|degree)?\b/i;
    const tempMatch = lowerText.match(tempRegex);
    if (tempMatch)
        slots.temperature = tempMatch[1];
    return slots;
};
exports.extractClinicalSlots = extractClinicalSlots;
//# sourceMappingURL=clinicalUtils.js.map