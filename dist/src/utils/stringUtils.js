"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeNumericValue = exports.getLevenshteinDistance = void 0;
const getLevenshteinDistance = (s1, s2, maxDistance = Infinity) => {
    if (s1.length > s2.length) {
        return (0, exports.getLevenshteinDistance)(s2, s1, maxDistance);
    }
    const m = s1.length;
    const n = s2.length;
    if (n - m > maxDistance)
        return Infinity;
    if (m === 0)
        return n;
    let previousRow = Array.from({ length: m + 1 }, (_, i) => i);
    let currentRow = new Array(m + 1);
    for (let j = 0; j < n; j++) {
        currentRow[0] = j + 1;
        let minInRow = currentRow[0];
        for (let i = 0; i < m; i++) {
            const substitutionCost = s1[i] === s2[j] ? 0 : 1;
            currentRow[i + 1] = Math.min(previousRow[i + 1] + 1, currentRow[i] + 1, previousRow[i] + substitutionCost);
            minInRow = Math.min(minInRow, currentRow[i + 1]);
        }
        if (minInRow > maxDistance) {
            return Infinity;
        }
        const temp = previousRow;
        previousRow = currentRow;
        currentRow = temp;
    }
    return previousRow[m];
};
exports.getLevenshteinDistance = getLevenshteinDistance;
const NUMBER_WORDS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
const NUMBER_WORD_SET = new Set(Object.keys(NUMBER_WORDS));
const parseNumberWords = (text) => {
    const tokens = text.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(Boolean);
    let current = [];
    const flush = () => {
        if (current.length === 0)
            return null;
        let working = 0;
        for (const token of current) {
            if (token === 'and')
                continue;
            if (token === 'hundred') {
                working = (working || 1) * 100;
                continue;
            }
            const mapped = NUMBER_WORDS[token];
            if (mapped === undefined)
                return null;
            working += mapped;
        }
        return working;
    };
    for (const token of tokens) {
        const parts = token.split('-').filter(Boolean);
        const isNumberWord = parts.every((part) => NUMBER_WORD_SET.has(part) || part === 'and');
        if (isNumberWord) {
            current.push(...parts);
            continue;
        }
        const parsed = flush();
        if (parsed !== null)
            return parsed;
        current = [];
    }
    return flush();
};
const normalizeNumericValue = (text) => {
    if (!text)
        return null;
    const lowerText = text.trim().toLowerCase();
    const fractionMatch = lowerText.match(/\b(\d+(?:\.\d+)?)\s*\/\s*10\b/i);
    if (fractionMatch?.[1])
        return Number(fractionMatch[1]);
    const outOfMatch = lowerText.match(/\b(\d+(?:\.\d+)?)\s*out of\s*10\b/i);
    if (outOfMatch?.[1])
        return Number(outOfMatch[1]);
    const rangeMatch = lowerText.match(/\b(\d+(?:\.\d+)?)\s*(?:-|to|and)\s*(\d+(?:\.\d+)?)\b/i);
    if (rangeMatch?.[1] && rangeMatch?.[2]) {
        return (Number(rangeMatch[1]) + Number(rangeMatch[2])) / 2;
    }
    const numericMatch = lowerText.match(/\d+(?:\.\d+)?/g);
    if (numericMatch) {
        for (const m of numericMatch) {
            if (!lowerText.includes(`-${m}`))
                return Number(m);
        }
    }
    return parseNumberWords(lowerText);
};
exports.normalizeNumericValue = normalizeNumericValue;
//# sourceMappingURL=stringUtils.js.map