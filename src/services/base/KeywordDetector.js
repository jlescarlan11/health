'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.KeywordDetector =
  exports.SYSTEM_INDICATORS =
  exports.AFFIRMATIVE_KEYWORDS =
  exports.NEGATION_KEYWORDS =
    void 0;
var stringUtils_1 = require('../../utils/stringUtils');
// Constants shared across detectors
exports.NEGATION_KEYWORDS = [
  'no',
  'not',
  'never',
  'none',
  "don't",
  "doesn't",
  "didn't",
  "isn't",
  "aren't",
  'don-t',
  'doesn-t',
  'didn-t',
  'isn-t',
  'aren-t',
  'dont',
  'doesnt',
  'didnt',
  'isnt',
  'arent',
  'without',
  'denies',
  'denied',
  'negative',
  'absent',
  'ruled out',
  'free from',
  'wala',
  'hindi',
  'nope',
  'nah',
  'nothing',
  'not experiencing',
  'none of these',
  'not present',
  'bako',
  'dae',
  'dai',
  'wara',
];
exports.AFFIRMATIVE_KEYWORDS = [
  'yes',
  'got',
  'currently',
  'ongoing',
  'nag',
  'may',
  'i am',
  "i'm",
  'iam',
  'im',
  'present',
  'experiencing',
  'meron',
  'iyo',
  'igwa',
];
exports.SYSTEM_INDICATORS = [
  'are you experiencing',
  'do you have',
  'have you had',
  'please tell me',
  'could you',
  'can you',
  'to confirm',
  'also,',
  'question:',
  'slot_ids',
  'initial symptom:',
  'context:',
  'nearest',
  '{"question"',
  'answers:',
  'clinical profile:',
  'duration:',
  'severity:',
  'progression:',
  'red flag status:',
  'summary:',
];
var KeywordDetector = /** @class */ (function () {
  function KeywordDetector() {}
  /**
   * Enhanced sanitization to remove system labels and identifiers
   */
  KeywordDetector.prototype.sanitizeInput = function (text) {
    var rejected = [];
    // 1. Remove JSON structures and technical metadata while preserving content
    var cleaned = text
      .replace(/{"question":".*?","answer":"(.*?)"}/g, '$1') // Extract answer from JSON pairs
      .replace(/[\[\]\{\}]/g, ' ') // Remove brackets
      .replace(/"answer":/g, ' ')
      .replace(/"question":/g, ' ')
      .replace(/"/g, ' ');
    // 2. Remove system labels specifically (preserve content)
    for (
      var _i = 0, SYSTEM_INDICATORS_1 = exports.SYSTEM_INDICATORS;
      _i < SYSTEM_INDICATORS_1.length;
      _i++
    ) {
      var indicator = SYSTEM_INDICATORS_1[_i];
      if (indicator === 'summary:' || indicator === 'clinical profile:') {
        var regex_1 = new RegExp('\\b'.concat(indicator, '\\s*[^.?!\\n]*'), 'gi');
        cleaned = cleaned.replace(regex_1, ' ');
        continue;
      }
      var regex = new RegExp('\\b'.concat(indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'gi');
      cleaned = cleaned.replace(regex, ' ');
    }
    // 3. Tokenize into clean segments
    var segments = cleaned
      .split(/[.,?!;:\n]+/)
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s.length > 1;
      });
    // 4. Filter out purely numeric or short noise segments
    var validSegments = segments.filter(function (segment) {
      if (/^\d+$/.test(segment)) return false;
      if (segment.length < 2) return false;
      var lower = segment.toLowerCase();
      var systemWords = ['unknown', 'none', 'denied', 'none reported', 'not applicable', 'n/a'];
      if (systemWords.includes(lower)) return false;
      return true;
    });
    return {
      sanitized: validSegments.join('. '),
      rejected: rejected,
    };
  };
  /**
   * Tokenize text into sentences/segments
   */
  KeywordDetector.prototype.tokenizeSentences = function (text) {
    if (!text) return [];
    return text
      .split(/[.,?!;:\n]+/)
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s.length > 0;
      });
  };
  /**
   * Enhanced negation detection with context awareness
   */
  KeywordDetector.prototype.isNegated = function (segment, keyword) {
    var PROXIMITY_WINDOW = 5;
    var normalizedSegment = segment
      .toLowerCase()
      .replace(/'/g, '-')
      .replace(/[^a-z0-9-\s]/g, ' ');
    var words = normalizedSegment.split(/\s+/).filter(function (w) {
      return w.length > 0;
    });
    var keywordWords = keyword.toLowerCase().split(/\s+/);
    if (keywordWords.length === 0 || words.length === 0) {
      return { negated: false, hasAffirmation: false, contextWindow: '' };
    }
    // Find keyword position
    var keywordStart = -1;
    for (var i = 0; i <= words.length - keywordWords.length; i++) {
      var window_1 = words.slice(i, i + keywordWords.length).join(' ');
      var distance = (0, stringUtils_1.getLevenshteinDistance)(window_1, keyword.toLowerCase());
      if (distance <= Math.min(2, stringUtils_1.FUZZY_THRESHOLD)) {
        keywordStart = i;
        break;
      }
    }
    if (keywordStart === -1) {
      return { negated: false, hasAffirmation: false, contextWindow: '' };
    }
    // Check context window
    var start = Math.max(0, keywordStart - PROXIMITY_WINDOW - 5);
    var end = Math.min(words.length, keywordStart + keywordWords.length + PROXIMITY_WINDOW + 5);
    var contextWords = words.slice(start, end);
    var contextWindow = contextWords.join(' ');
    var hasNegation = false;
    var hasAffirmation = false;
    var _loop_1 = function (k) {
      var absolutePos = start + k;
      if (absolutePos >= keywordStart && absolutePos < keywordStart + keywordWords.length) {
        return 'continue';
      }
      var currentWord = contextWords[k];
      if (
        exports.NEGATION_KEYWORDS.some(function (neg) {
          return currentWord === neg;
        })
      ) {
        var distance = absolutePos - keywordStart;
        if (distance < 0 && Math.abs(distance) <= PROXIMITY_WINDOW) {
          hasNegation = true;
        } else if (distance > 0 && distance <= 4) {
          var intermediateWords = words.slice(keywordStart + keywordWords.length, absolutePos);
          var hasConjunction = intermediateWords.some(function (w) {
            return ['but', 'and', 'or', 'though'].includes(w);
          });
          if (!hasConjunction) {
            hasNegation = true;
          }
        }
      }
      if (
        exports.AFFIRMATIVE_KEYWORDS.some(function (aff) {
          return currentWord === aff;
        })
      ) {
        if (Math.abs(absolutePos - keywordStart) <= 2) {
          hasAffirmation = true;
        }
      }
    };
    for (var k = 0; k < contextWords.length; k++) {
      _loop_1(k);
    }
    if (segment.toLowerCase().includes('denied') || segment.toLowerCase().includes('wala')) {
      hasNegation = true;
    }
    var negated = hasNegation && !hasAffirmation;
    return { negated: negated, hasAffirmation: hasAffirmation, contextWindow: contextWindow };
  };
  /**
   * Analyze a single segment for keywords
   */
  KeywordDetector.prototype.analyzeSegment = function (segment, isUserInput) {
    var potentialMatches = [];
    var activeMatches = [];
    var suppressedMatches = [];
    if (!isUserInput) {
      return {
        text: segment,
        isUserInput: false,
        potentialMatches: [],
        activeMatches: [],
        suppressedMatches: [],
        maxScore: 0,
      };
    }
    var keywordMap = this.getKeywords();
    var keywordList = Object.keys(keywordMap);
    var matches = (0, stringUtils_1.findAllFuzzyMatches)(segment, keywordList);
    for (var _i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
      var keyword = matches_1[_i];
      var severity = keywordMap[keyword];
      var negationResult = this.isNegated(segment, keyword);
      var match = {
        keyword: keyword,
        severity: severity,
        negated: negationResult.negated,
        contextWindow: negationResult.contextWindow,
        affirmationFound: negationResult.hasAffirmation,
      };
      potentialMatches.push(match);
      if (negationResult.negated) {
        suppressedMatches.push(match);
      } else {
        activeMatches.push(match);
      }
    }
    var maxScore =
      activeMatches.length > 0
        ? Math.max.apply(
            Math,
            activeMatches.map(function (m) {
              return m.severity;
            }),
          )
        : 0;
    return {
      text: segment,
      isUserInput: true,
      potentialMatches: potentialMatches,
      activeMatches: activeMatches,
      suppressedMatches: suppressedMatches,
      maxScore: maxScore,
    };
  };
  /**
   * Base detection logic
   */
  KeywordDetector.prototype.detect = function (text, isUserInput) {
    if (isUserInput === void 0) {
      isUserInput = true;
    }
    var _a = this.sanitizeInput(text),
      sanitized = _a.sanitized,
      rejected = _a.rejected;
    if (!isUserInput) {
      return {
        sanitized: sanitized,
        rejected: rejected,
        segments: [],
        score: 0,
        matchedKeywords: [],
      };
    }
    var segments = this.tokenizeSentences(sanitized.toLowerCase());
    var segmentAnalyses = [];
    var allActiveKeywords = new Set();
    for (var _i = 0, segments_1 = segments; _i < segments_1.length; _i++) {
      var segment = segments_1[_i];
      var analysis = this.analyzeSegment(segment, true);
      segmentAnalyses.push(analysis);
      for (var _b = 0, _c = analysis.activeMatches; _b < _c.length; _b++) {
        var match = _c[_b];
        allActiveKeywords.add(match.keyword);
      }
    }
    var matchedKeywords = Array.from(allActiveKeywords);
    var score =
      segmentAnalyses.length > 0
        ? Math.max.apply(
            Math,
            segmentAnalyses.map(function (s) {
              return s.maxScore;
            }),
          )
        : 0;
    return {
      sanitized: sanitized,
      rejected: rejected,
      segments: segmentAnalyses,
      score: score,
      matchedKeywords: matchedKeywords,
    };
  };
  return KeywordDetector;
})();
exports.KeywordDetector = KeywordDetector;
