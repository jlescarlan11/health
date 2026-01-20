"use strict";
/**
 * Utility functions for string manipulation and fuzzy matching.
 * Optimized version with performance improvements.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllFuzzyMatches = exports.getLevenshteinDistance = exports.FUZZY_THRESHOLD = void 0;
exports.FUZZY_THRESHOLD = 2;
var FALSE_POSITIVES = {
    doing: ['dying'],
    laying: ['dying'],
    lying: ['dying'],
    trying: ['dying'],
    drying: ['dying'],
    'want to give': ['want to die'],
    // False positives for short Bicolano keywords
    bar: ['bari'], // 'bari' (broken)
    bare: ['bari'],
    bear: ['bari'],
    suck: ['suka'], // 'suka' (vomit)
    dug: ['dugi'], // 'dugi' (choking/fishbone)
    hopes: ['hapos'], // 'hapos' (asthma)
    hop: ['hapos'],
    pods: ['pudos'], // 'pudos' (shortness of breath)
};
/**
 * Calculates the Levenshtein distance between two strings.
 * Early termination when distance exceeds threshold.
 *
 * @param s1 The first string to compare.
 * @param s2 The second string to compare.
 * @param maxDistance Maximum distance threshold (early termination if exceeded).
 * @returns The Levenshtein distance, or Infinity if it exceeds maxDistance.
 */
var getLevenshteinDistance = function (s1, s2, maxDistance) {
    if (maxDistance === void 0) { maxDistance = Infinity; }
    if (s1.length > s2.length) {
        return (0, exports.getLevenshteinDistance)(s2, s1, maxDistance);
    }
    var m = s1.length;
    var n = s2.length;
    if (n - m > maxDistance)
        return Infinity;
    if (m === 0)
        return n;
    var previousRow = Array.from({ length: m + 1 }, function (_, i) { return i; });
    var currentRow = new Array(m + 1);
    for (var j = 0; j < n; j++) {
        currentRow[0] = j + 1;
        var minInRow = currentRow[0];
        for (var i = 0; i < m; i++) {
            var substitutionCost = s1[i] === s2[j] ? 0 : 1;
            currentRow[i + 1] = Math.min(previousRow[i + 1] + 1, currentRow[i] + 1, previousRow[i] + substitutionCost);
            minInRow = Math.min(minInRow, currentRow[i + 1]);
        }
        if (minInRow > maxDistance) {
            return Infinity;
        }
        var temp = previousRow;
        previousRow = currentRow;
        currentRow = temp;
    }
    return previousRow[m];
};
exports.getLevenshteinDistance = getLevenshteinDistance;
var normalizeAndTokenize = function (text) {
    var normalized = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .trim();
    var tokens = normalized ? normalized.split(/\s+/) : [];
    return {
        normalized: normalized,
        tokens: tokens,
        ngrams: new Map(),
    };
};
/**
 * Generate n-grams with caching.
 */
var getNgrams = function (textData, n) {
    if (textData.ngrams.has(n)) {
        return textData.ngrams.get(n);
    }
    var tokens = textData.tokens;
    var ngrams = [];
    for (var i = 0; i <= tokens.length - n; i++) {
        ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    textData.ngrams.set(n, ngrams);
    return ngrams;
};
/**
 * Scans a text for ALL fuzzy matches against a list of keywords.
 * Optimized with early exits, caching, and threshold-aware distance calculation.
 */
var findAllFuzzyMatches = function (text, keywords) {
    var _a;
    if (!text || !keywords || keywords.length === 0)
        return [];
    var found = new Set();
    var textData = normalizeAndTokenize(text);
    if (textData.tokens.length === 0)
        return [];
    var normalizedKeywords = keywords
        .map(function (kw) { return ({
        original: kw,
        normalized: kw.toLowerCase().trim(),
        wordCount: kw.trim().split(/\s+/).length,
    }); })
        .sort(function (a, b) { return b.normalized.length - a.normalized.length; });
    for (var _i = 0, normalizedKeywords_1 = normalizedKeywords; _i < normalizedKeywords_1.length; _i++) {
        var _b = normalizedKeywords_1[_i], original = _b.original, normalized = _b.normalized, wordCount = _b.wordCount;
        if (found.has(original))
            continue;
        if (normalized.length >= 5 && textData.normalized.includes(normalized)) {
            found.add(original);
            continue;
        }
        var len = normalized.length;
        var threshold = exports.FUZZY_THRESHOLD;
        if (len <= 3)
            threshold = 0;
        else if (len <= 6)
            threshold = 1;
        else
            threshold = 2;
        var maxNgram = Math.max(wordCount, 3);
        var matched = false;
        for (var n = 1; n <= maxNgram && !matched; n++) {
            var ngrams = getNgrams(textData, n);
            for (var _c = 0, ngrams_1 = ngrams; _c < ngrams_1.length; _c++) {
                var ngram = ngrams_1[_c];
                var lengthDiff = Math.abs(ngram.length - normalized.length);
                if (lengthDiff > (wordCount > 1 ? threshold + 1 : threshold)) {
                    continue;
                }
                if ((_a = FALSE_POSITIVES[ngram]) === null || _a === void 0 ? void 0 : _a.includes(original)) {
                    continue;
                }
                var distance = (0, exports.getLevenshteinDistance)(ngram, normalized, threshold);
                if (distance <= threshold) {
                    found.add(original);
                    matched = true;
                    break;
                }
            }
        }
    }
    return Array.from(found);
};
exports.findAllFuzzyMatches = findAllFuzzyMatches;
