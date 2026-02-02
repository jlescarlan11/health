"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSlot = normalizeSlot;
exports.normalizeBooleanResponse = normalizeBooleanResponse;
exports.checkCriticalSystemKeywords = checkCriticalSystemKeywords;
exports.calculateTriageScore = calculateTriageScore;
exports.parseAndValidateLLMResponse = parseAndValidateLLMResponse;
exports.prioritizeQuestions = prioritizeQuestions;
const aiConstants_1 = require("./aiConstants");
const stringUtils_1 = require("./stringUtils");
const triage_1 = require("../types/triage");
function normalizeSlot(value, options = {}) {
    if (value === null || value === undefined) {
        return null;
    }
    const stringValue = String(value);
    const trimmed = stringValue.trim();
    if (trimmed === '') {
        return null;
    }
    const lower = trimmed.toLowerCase();
    const nullIndicators = ['null', 'n/a', 'unknown', 'not mentioned', 'unsure'];
    if (!options.allowNone) {
        nullIndicators.push('none');
    }
    if (nullIndicators.includes(lower)) {
        return null;
    }
    return value;
}
function normalizeBooleanResponse(text) {
    if (!text)
        return null;
    const lower = text.trim().toLowerCase();
    const negativePatterns = [
        /^no\b/, /^hindi\b/, /^wala\b/, /^none\b/, /don't have/, /do not have/, /not experiencing/, /negative/, /^hindi ko po/, /^no,/,
    ];
    if (negativePatterns.some((pattern) => pattern.test(lower))) {
        return false;
    }
    const positivePatterns = [
        /^yes\b/, /^oo\b/, /^meron\b/, /^opon\b/, /i have/, /experiencing/, /positive/,
    ];
    if (positivePatterns.some((pattern) => pattern.test(lower))) {
        return true;
    }
    return null;
}
function checkCriticalSystemKeywords(input) {
    if (!input)
        return null;
    const lowerInput = input.toLowerCase();
    let highestCategory = null;
    const categoryPriority = { complex: 1, critical: 2 };
    for (const systemKey in triage_1.SYSTEM_LOCK_KEYWORD_MAP) {
        const config = triage_1.SYSTEM_LOCK_KEYWORD_MAP[systemKey];
        const hasMatch = config.keywords.some((keyword) => {
            const words = keyword.toLowerCase().split(' ');
            if (words.length > 1) {
                const pattern = words.map((w) => `(?=.*\\b${w}\\b)`).join('');
                const regex = new RegExp(`^${pattern}.*$`, 'i');
                return regex.test(lowerInput);
            }
            const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
            return regex.test(lowerInput);
        });
        if (hasMatch) {
            const targetCat = config.escalationCategory;
            if (!highestCategory || categoryPriority[targetCat] > categoryPriority[highestCategory]) {
                highestCategory = targetCat;
            }
        }
    }
    return highestCategory;
}
function calculateTriageScore(slots) {
    let score = 1.0;
    let currentCategory = slots.symptom_category || 'simple';
    let coreSlots = [
        'age', 'duration', 'severity', 'progression',
    ];
    if (currentCategory === 'simple') {
        const severityVal = normalizeSlot(slots.severity) || '';
        const descriptorRegex = /\b(mild|minor|slight|minimal)\b/i;
        const numericRegex = /\b([1-4])\s*(\/|out of)\s*10\b/i;
        const hasDescriptor = descriptorRegex.test(severityVal);
        const numericValue = (0, stringUtils_1.normalizeNumericValue)(severityVal);
        const hasNumeric = numericRegex.test(severityVal) || (numericValue !== null && numericValue >= 1 && numericValue <= 4);
        if (hasDescriptor && hasNumeric) {
            coreSlots = ['duration', 'severity'];
        }
    }
    const nullCount = coreSlots.filter((s) => !normalizeSlot(slots[s])).length;
    if (nullCount > 0) {
        if (slots.uncertainty_accepted) {
            score -= 0.05 + nullCount * 0.05;
        }
        else {
            score = 0.8 - nullCount * 0.1;
        }
    }
    if (!slots.red_flags_resolved)
        score = Math.min(score, 0.4);
    if (slots.clinical_friction_detected)
        score = Math.min(score, 0.6);
    if (slots.ambiguity_detected)
        score = Math.min(score, 0.7);
    if (currentCategory === 'complex' && (slots.turn_count || 0) < 7)
        score = Math.min(score, 0.85);
    if (slots.internal_inconsistency_detected)
        score -= 0.4;
    if (slots.denial_confidence === 'low')
        score -= 0.2;
    const escalatedCategory = checkCriticalSystemKeywords(slots.symptom_text || '');
    if (escalatedCategory) {
        const hierarchy = { simple: 0, complex: 1, critical: 2 };
        if (hierarchy[escalatedCategory] > hierarchy[currentCategory]) {
            currentCategory = escalatedCategory;
            if (currentCategory === 'complex' && (slots.turn_count || 0) < 7)
                score = Math.min(score, 0.85);
        }
    }
    return { score: Math.max(0, Math.min(1.0, score)), escalated_category: currentCategory };
}
function parseAndValidateLLMResponse(rawResponse) {
    try {
        const cleaned = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleaned);
    }
    catch {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            }
            catch {
                throw new Error('Failed to parse extracted JSON from LLM response');
            }
        }
        throw new Error(`Failed to parse LLM response`);
    }
}
function prioritizeQuestions(questions) {
    const redFlagIndex = questions.findIndex((q) => q.id === 'red_flags');
    const sortedQuestions = [...questions];
    if (redFlagIndex === -1) {
        const insertIndex = sortedQuestions.length > 0 ? 1 : 0;
        sortedQuestions.splice(insertIndex, 0, aiConstants_1.DEFAULT_RED_FLAG_QUESTION);
        return sortedQuestions;
    }
    if (redFlagIndex > 2) {
        const [redFlagQ] = sortedQuestions.splice(redFlagIndex, 1);
        sortedQuestions.splice(1, 0, redFlagQ);
    }
    return sortedQuestions;
}
//# sourceMappingURL=aiUtils.js.map