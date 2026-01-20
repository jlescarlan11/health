"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNegated = exports.tokenizeSentences = exports.detectEmergency = void 0;
var KeywordDetector_1 = require("./base/KeywordDetector");
// --- KEYWORD CATEGORIES ---
var CARDIAC_KEYWORDS = {
    'chest pain': 10,
    'crushing pain': 10,
    'heart attack': 10,
    'chest tightness': 10,
    'blue lips': 10,
    'palpitations': 6, // Added as requested
    'irregular heartbeat': 6,
    // Bicolano / Local
    'kulog sa daghan': 10, // chest pain
    'kulog sa dagan': 10, // chest pain (variant)
    'makulog na daghan': 10, // painful chest
    'malipot na ribok': 10, // cold sweat (often cardiac)
    'pumitik': 6, // palpitations/throbbing
};
var RESPIRATORY_KEYWORDS = {
    'difficulty breathing': 10,
    'shortness of breath': 10,
    'not breathing': 10,
    'gasping': 10,
    'choking': 10,
    'coughing blood': 10,
    // Bicolano / Local
    'hingalo': 10, // gasping for breath / near death
    'naghihingalo': 10, // actively dying / gasping
    'dai makahinga': 10, // cannot breathe
    'masakit an hinangos': 10, // difficulty breathing
    'masakit maghinga': 10, // hard to breathe
    'pudos': 10, // shortness of breath
    'dugi': 10, // choking/foreign object in throat
    'bakitog': 10, // difficulty breathing / wheezing
    'hapos': 6, // asthma/difficulty breathing
};
var NEURO_KEYWORDS = {
    'unconscious': 10,
    'fainted': 10,
    'seizure': 10,
    'stroke': 10,
    'slurred speech': 10,
    'sudden weakness': 10,
    'facial drooping': 10,
    'arm weakness': 10,
    'cannot speak': 10,
    'confusion': 8,
    'vision loss': 9,
    'sudden blindness': 10,
    'stiff neck': 8,
    'headache': 5,
    'blurred vision': 6,
    'dizziness': 5,
    // Bicolano / Local
    'nagkukumbulsion': 10, // actively seizing
    'kumbulsion': 10, // seizure
    'bontog': 10, // seizure/convulsion
    'bontogon': 10, // epileptic/seizing
    'nadismayo': 10, // fainted
    'nawaran malay': 10, // lost consciousness
    'nawara an malay': 10, // lost consciousness
    'dai makataram': 10, // cannot speak
    'ngaut': 10, // slurred speech
    'nalulula': 5, // dizzy/vertigo
    'ribong': 6, // dizzy/confused
    'nalilibog': 5, // confused/disoriented
};
var TRAUMA_KEYWORDS = {
    'severe bleeding': 10,
    'severe head injury': 10,
    'severe burns': 10,
    'broken bone': 8,
    'deep wound': 8,
    'electric shock': 10,
    'drowning': 10,
    // Bicolano / Local
    'nagdudugo': 10, // bleeding
    'dakulang dugo': 10, // heavy bleeding (lit. big blood)
    'nalapnos': 8, // burned/scalded
    'napaso': 8, // burned
    'bari': 8, // broken/fracture
    'naglulubog': 10, // drowning
};
var OTHER_EMERGENCY_KEYWORDS = {
    // Critical General
    'poisoning': 10,
    'overdose': 10,
    'anaphylaxis': 10,
    'severe allergic reaction': 10,
    'severe abdominal pain': 10,
    'suicide attempt': 10,
    'dying': 10,
    'feel like dying': 10,
    'feeling like dying': 10,
    'active labor': 10,
    'water broke': 10,
    // Serious General/GI
    'vomiting blood': 9,
    'black stool': 8,
    'blood in stool': 8,
    'high fever': 5,
    'severe dehydration': 7,
    'jaundice': 7,
    'persistent vomiting': 7,
    'fever': 4,
    'abdominal pain': 6,
    'nausea': 4,
    // Bicolano / Local
    'garo gadan': 10, // feels like dying
    'suka na dugo': 9, // vomiting blood
    'nagsusuka dugo': 9, // vomiting blood
    'nag-udo dugo': 8, // bloody stool
    'mangaki': 10, // giving birth
    'nagtutubig': 10, // water broke
    'nangungulog': 6, // general pain
    'grabeng lagnat': 5, // high fever
    'mainiton na marhay': 5, // very hot/feverish
    'nagkakalyo': 6, // stiffening? (context dependent, keeping score)
    'pusi-pusi': 6, // pale/anemic looking
    'gadot': 5, // muscle pain/cramps
    'kulog sa tulak': 5, // stomach ache
    'makulog na tulak': 6, // painful stomach
    'nagpapanit an tulak': 7, // peeling stomach (severe pain)
    'impacho': 4, // indigestion
    'nagluluya': 6, // weak
    'maluya': 6, // weak
    'lupaypay': 7, // prostrate/very weak
    'langkag': 5, // malaise
    'kalentura': 5, // fever
};
// Consolidated map for the base detector
var ALL_EMERGENCY_KEYWORDS = __assign(__assign(__assign(__assign(__assign({}, CARDIAC_KEYWORDS), RESPIRATORY_KEYWORDS), NEURO_KEYWORDS), TRAUMA_KEYWORDS), OTHER_EMERGENCY_KEYWORDS);
// **NEW: Contextual Modifiers**
var VIRAL_INDICATORS = ['cough', 'runny nose', 'nasal congestion', 'sore throat', 'sneezing'];
var DANGER_INDICATORS = {
    'stiff neck': 4,
    'confusion': 4,
    'seizure': 5,
    'difficulty breathing': 5,
    'chest pain': 5,
    'unconscious': 5,
    'persistent': 2,
    'worsening': 1,
};
/**
 * Critical symptom combinations that indicate high risk when occurring together.
 * These are used to upgrade severity when multiple symptoms are present simultaneously.
 */
var COMBINATION_RISKS = [
    {
        symptoms: ['headache', 'blurred vision'],
        severity: 10,
        reason: 'Neurological or hypertensive crisis',
    },
    {
        symptoms: ['headache', 'stiff neck'],
        severity: 10,
        reason: 'Potential meningitis',
    },
    {
        symptoms: ['chest pain', 'shortness of breath'],
        severity: 10,
        reason: 'Potential cardiac emergency',
    },
    {
        symptoms: ['fever', 'confusion'],
        severity: 10,
        reason: 'Potential sepsis or severe infection',
    },
    {
        symptoms: ['abdominal pain', 'dizziness'],
        severity: 10,
        reason: 'Potential internal bleeding or shock',
    },
    {
        symptoms: ['fever', 'stiff neck'],
        severity: 10,
        reason: 'High risk of meningitis',
    }
];
// **NEW: Contextual Exclusions**
var CONTEXTUAL_EXCLUSIONS = [
    'worried about',
    'history of',
    'father had',
    'mother had',
    'brother had',
    'sister had',
    'family history',
    'past history',
    'asking for',
    'just asking',
    'preventing',
    'preventative',
    'risk of',
    'concerned about',
    'thought about',
    'fear of',
    'worried regarding',
    'background of',
];
var EmergencyDetector = /** @class */ (function (_super) {
    __extends(EmergencyDetector, _super);
    function EmergencyDetector() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    EmergencyDetector.prototype.getKeywords = function () {
        return ALL_EMERGENCY_KEYWORDS;
    };
    /**
     * Helper to check if duration suggests chronic/non-acute or acute/urgent
     */
    EmergencyDetector.prototype.parseDurationUrgency = function (duration) {
        if (!duration)
            return 'unknown';
        var d = duration.toLowerCase();
        // Urgent indicators
        if (d.includes('today') || d.includes('hour') || d.includes('just') || d.includes('now') || d.includes('minute'))
            return 'acute';
        // Chronic indicators (less likely emergency on their own)
        if (d.includes('week') || d.includes('month') || d.includes('year') || d.includes('long time'))
            return 'chronic';
        // 1-3 days is "acute" but usually not "emergency" unless symptoms are severe
        if (d.includes('day') || d.includes('yesterday'))
            return 'acute';
        return 'unknown';
    };
    EmergencyDetector.prototype.identifySystems = function (matchedKeywords) {
        var systems = new Set();
        matchedKeywords.forEach(function (keyword) {
            if (keyword in CARDIAC_KEYWORDS)
                systems.add('Cardiac');
            if (keyword in RESPIRATORY_KEYWORDS)
                systems.add('Respiratory');
            if (keyword in NEURO_KEYWORDS)
                systems.add('Neurological');
            if (keyword in TRAUMA_KEYWORDS)
                systems.add('Trauma');
            if (keyword in OTHER_EMERGENCY_KEYWORDS)
                systems.add('Other');
        });
        return Array.from(systems);
    };
    EmergencyDetector.prototype.hasExclusionContext = function (contextWindow) {
        var lowerWindow = contextWindow.toLowerCase();
        return CONTEXTUAL_EXCLUSIONS.some(function (pattern) { return lowerWindow.includes(pattern); });
    };
    EmergencyDetector.prototype.evaluate = function (text, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        console.log("\n=== EMERGENCY DETECTION START ===");
        console.log("Input: \"".concat(text.substring(0, 100), "...\""));
        console.log("Input Type: ".concat(options.isUserInput === false ? 'SYSTEM/METADATA' : 'USER INPUT'));
        var profile = options.profile, questionId = options.questionId;
        // Use base class detection
        var detection = this.detect(text, options.isUserInput);
        var sanitized = detection.sanitized, rejected = detection.rejected, segmentAnalyses = detection.segments;
        var score = detection.score, matchedKeywords = detection.matchedKeywords;
        // --- APPLY CONTEXTUAL EXCLUSIONS ---
        var excludedKeywords = [];
        if (options.enableExclusions !== false && options.isUserInput !== false) {
            var _loop_1 = function (segment) {
                var originalCount = segment.activeMatches.length;
                segment.activeMatches = segment.activeMatches.filter(function (match) {
                    if (_this.hasExclusionContext(match.contextWindow)) {
                        excludedKeywords.push(match.keyword);
                        segment.suppressedMatches.push(match);
                        return false;
                    }
                    return true;
                });
                if (segment.activeMatches.length !== originalCount) {
                    segment.maxScore = segment.activeMatches.length > 0
                        ? Math.max.apply(Math, segment.activeMatches.map(function (m) { return m.severity; })) : 0;
                }
            };
            for (var _i = 0, segmentAnalyses_1 = segmentAnalyses; _i < segmentAnalyses_1.length; _i++) {
                var segment = segmentAnalyses_1[_i];
                _loop_1(segment);
            }
            // Recalculate global score and matched keywords based on filtered segments
            matchedKeywords = Array.from(new Set(segmentAnalyses.flatMap(function (s) { return s.activeMatches.map(function (m) { return m.keyword; }); })));
            score = segmentAnalyses.length > 0 ? Math.max.apply(Math, segmentAnalyses.map(function (s) { return s.maxScore; })) : 0;
            if (excludedKeywords.length > 0) {
                console.log("  [Exclusions] Removed keywords due to context: ".concat(excludedKeywords.join(', ')));
            }
        }
        var affectedSystems = this.identifySystems(matchedKeywords);
        console.log("\nSanitization:");
        if (rejected.length > 0) {
            console.log("  Rejected ".concat(rejected.length, " segments:"));
        }
        console.log("  Sanitized input: \"".concat(sanitized, "\""));
        // If explicitly marked as non-user input, skip analysis
        if (options.isUserInput === false) {
            var debugLog_1 = {
                inputText: text,
                sanitizedInput: sanitized,
                filteredSegments: [],
                rejectedSegments: rejected,
                segments: [],
                finalScore: 0,
                triggeredEmergency: false,
                affectedSystems: [],
                reasoning: 'Input marked as system-generated - skipped emergency analysis',
            };
            return {
                isEmergency: false,
                score: 0,
                matchedKeywords: [],
                affectedSystems: [],
                debugLog: debugLog_1,
            };
        }
        // --- CONTEXT-AWARE SCORE ADJUSTMENT ---
        var finalScore = score;
        var reasoningParts = [];
        // Check if we have an absolute emergency (10/10)
        var hasAbsoluteEmergency = matchedKeywords.some(function (k) { return ALL_EMERGENCY_KEYWORDS[k] === 10; });
        if (!hasAbsoluteEmergency && finalScore > 0) {
            var scoreModifier_1 = 0;
            // 1. Danger Indicators (Multipliers/Adders)
            var activeDanger = Object.keys(DANGER_INDICATORS).filter(function (dk) {
                // Find segment containing this danger indicator
                var segment = segmentAnalyses.find(function (s) { return s.text.toLowerCase().includes(dk); });
                if (!segment)
                    return false;
                // If it's a keyword match in this segment, check if it was suppressed (negated)
                var suppressed = segment.suppressedMatches.some(function (m) { return m.keyword.toLowerCase().includes(dk); });
                if (suppressed)
                    return false;
                return true;
            });
            activeDanger.forEach(function (dk) {
                scoreModifier_1 += DANGER_INDICATORS[dk];
                reasoningParts.push("Danger indicator (+".concat(DANGER_INDICATORS[dk], "): ").concat(dk, "."));
            });
            // 2. Viral Indicators (De-escalation)
            // Only de-escalate if the primary symptoms are "Serious" but not "Absolute"
            var hasViralSymptoms = VIRAL_INDICATORS.some(function (vk) { return sanitized.toLowerCase().includes(vk); });
            var isRedFlagQuestion = questionId === 'red_flags' || questionId === 'q_emergency_signs';
            if (hasViralSymptoms && finalScore <= 7 && !isRedFlagQuestion) {
                scoreModifier_1 -= 2;
                reasoningParts.push('Viral indicators detected (-2): cough/runny nose/cold symptoms.');
            }
            // 3. Duration/Profile Adjustments
            var urgency = this.parseDurationUrgency((profile === null || profile === void 0 ? void 0 : profile.duration) || null);
            if (urgency === 'chronic' && finalScore < 8) {
                scoreModifier_1 += 1; // Chronic is serious but often less acute
                reasoningParts.push('Chronic duration (+1).');
            }
            var initialScore = finalScore;
            finalScore = Math.max(0, Math.min(10, finalScore + scoreModifier_1));
            if (finalScore !== initialScore) {
                console.log("  [Scoring] Modified score from ".concat(initialScore, " to ").concat(finalScore, " based on context."));
            }
        }
        else if (hasAbsoluteEmergency) {
            finalScore = 10;
            reasoningParts.push('Absolute emergency detected.');
        }
        // 4. System Overlap Logic
        if (affectedSystems.includes('Cardiac') && affectedSystems.includes('Respiratory')) {
            finalScore = Math.min(10, finalScore + 3);
            reasoningParts.push('Multi-system risk (Cardiac + Respiratory).');
        }
        if (affectedSystems.includes('Neurological') && affectedSystems.includes('Trauma')) {
            finalScore = 10;
            reasoningParts.push('Critical multi-system risk (Neuro + Trauma).');
        }
        // 5. Combination Risks (Fallback/Secondary check)
        var combinationReason = '';
        // 6. Safety Check: If AI marked case as complex/critical, we slightly weight the score up,
        // but if red flags are RESOLVED/DENIED, we never force an emergency just based on serious keywords.
        if ((profile === null || profile === void 0 ? void 0 : profile.symptom_category) === 'critical' && finalScore < 8 && !hasAbsoluteEmergency) {
            // AI thinks it's critical, but detector didn't find absolute keywords.
            // We might upgrade to 8 if there are serious keywords.
            if (finalScore >= 6) {
                finalScore = 8;
                reasoningParts.push('Upgraded based on AI category assessment.');
            }
        }
        var isEmergency = finalScore > 7;
        // --- AUTHORITY ENFORCEMENT: Profile Constraints ---
        // If red flags are explicitly resolved and DENIED, block Emergency escalation 
        // unless there is an absolute (10/10) emergency keyword detected in user input.
        if ((profile === null || profile === void 0 ? void 0 : profile.red_flags_resolved) === true) {
            var denials_1 = (profile.red_flag_denials || '').toLowerCase();
            // 1. Check for explicit denial prefixes (safeguards)
            var explicitDenialPrefixes = ['no', 'none', 'wala', 'hindi', 'dae', 'dai', 'wara', 'nothing', 'bako'];
            var isExplicitDenial = explicitDenialPrefixes.some(function (prefix) {
                return denials_1 === prefix || denials_1.startsWith("".concat(prefix, " ")) || denials_1.startsWith("".concat(prefix, ",")) || denials_1.startsWith("".concat(prefix, "."));
            });
            // 2. Strengthened validation using isNegated for any matched keywords
            var areKeywordsNegated = matchedKeywords.length > 0 && matchedKeywords.every(function (k) { return _this.isNegated(denials_1, k).negated; });
            var hasValidatedDenial = isExplicitDenial || areKeywordsNegated;
            if (hasValidatedDenial && isEmergency && !hasAbsoluteEmergency) {
                console.log('  [Authority] Emergency blocked: Red flags were explicitly denied in structured profile.');
                isEmergency = false;
                finalScore = 7; // Cap at maximum non-emergency score
                reasoningParts.push("Authority block: Red flags denied in profile (Explicit: ".concat(isExplicitDenial, ", Negated: ").concat(areKeywordsNegated, "). Capping at non-emergency."));
            }
        }
        // Build reasoning
        var reasoning = '';
        if (isEmergency) {
            reasoning = "Emergency detected (score ".concat(finalScore, "/10). Symptoms: ").concat(matchedKeywords.join(', '), ".");
            if (affectedSystems.length > 0)
                reasoning += " Systems: ".concat(affectedSystems.join(', '), ".");
            if (combinationReason)
                reasoning += " RISK: ".concat(combinationReason, ".");
        }
        else {
            reasoning = matchedKeywords.length > 0
                ? "Non-emergency (score ".concat(finalScore, "/10). Symptoms: ").concat(matchedKeywords.join(', '), ".")
                : "No emergency symptoms detected.";
        }
        if (reasoningParts.length > 0) {
            reasoning += " [Context: ".concat(reasoningParts.join(' '), "]");
        }
        // Build medical justification
        var justificationParts = matchedKeywords.map(function (keyword) {
            var severity = ALL_EMERGENCY_KEYWORDS[keyword] || 0;
            var system = 'General';
            if (keyword in CARDIAC_KEYWORDS)
                system = 'Cardiac';
            else if (keyword in RESPIRATORY_KEYWORDS)
                system = 'Respiratory';
            else if (keyword in NEURO_KEYWORDS)
                system = 'Neurological';
            else if (keyword in TRAUMA_KEYWORDS)
                system = 'Trauma';
            else if (keyword in OTHER_EMERGENCY_KEYWORDS)
                system = 'Other';
            return "".concat(keyword, " (Severity: ").concat(severity, "/10 - ").concat(system, ")");
        });
        if (reasoningParts.length > 0) {
            justificationParts.push("Context: ".concat(reasoningParts.join('; ')));
        }
        var medical_justification = justificationParts.length > 0
            ? justificationParts.join('; ')
            : 'No emergency keywords detected.';
        console.log("\n--- FINAL RESULT ---");
        console.log("Score: ".concat(finalScore, "/10 | Emergency: ").concat(isEmergency ? 'YES' : 'NO'));
        console.log("Systems: ".concat(affectedSystems.join(', ')));
        console.log("Reasoning: ".concat(reasoning));
        console.log("Medical Justification: ".concat(medical_justification));
        console.log("=== EMERGENCY DETECTION END ===\n");
        var debugLog = {
            inputText: text,
            sanitizedInput: sanitized,
            filteredSegments: this.tokenizeSentences(sanitized.toLowerCase()),
            rejectedSegments: rejected,
            segments: segmentAnalyses,
            finalScore: finalScore,
            triggeredEmergency: isEmergency,
            affectedSystems: affectedSystems,
            reasoning: reasoning,
            contextualExclusions: excludedKeywords,
        };
        var overrideResponse;
        if (isEmergency) {
            var advice = combinationReason
                ? "CRITICAL: High risk combination detected (".concat(combinationReason, "). Go to the nearest emergency room immediately.")
                : 'CRITICAL: Potential life-threatening condition detected. Go to the nearest emergency room or call emergency services immediately.';
            overrideResponse = {
                recommended_level: 'emergency',
                user_advice: advice,
                clinical_soap: "S: Patient reports ".concat(matchedKeywords.join(', '), ". O: Emergency keywords detected (").concat(affectedSystems.join(', '), ")").concat(combinationReason ? " - Risk: ".concat(combinationReason) : '', ". A: Potential life-threatening condition. P: Immediate ED referral."),
                key_concerns: matchedKeywords.map(function (k) { return "Urgent symptom: ".concat(k); }),
                critical_warnings: ['Immediate medical attention required', 'Do not delay care'],
                relevant_services: ['Emergency'],
                red_flags: matchedKeywords,
                follow_up_questions: [],
            };
        }
        return {
            isEmergency: isEmergency,
            score: finalScore,
            matchedKeywords: matchedKeywords,
            affectedSystems: affectedSystems,
            overrideResponse: overrideResponse,
            debugLog: debugLog,
            hasExclusions: excludedKeywords.length > 0,
            excludedKeywords: excludedKeywords,
            medical_justification: medical_justification,
        };
    };
    return EmergencyDetector;
}(KeywordDetector_1.KeywordDetector));
// Singleton instance
var detector = new EmergencyDetector();
// Export wrapper function to maintain API compatibility
var detectEmergency = function (text, options) {
    if (options === void 0) { options = {}; }
    return detector.evaluate(text, options);
};
exports.detectEmergency = detectEmergency;
// Re-export helper for backward compatibility/testing if needed
var tokenizeSentences = function (text) {
    return detector.tokenizeSentences(text);
};
exports.tokenizeSentences = tokenizeSentences;
var isNegated = function (segment, keyword) {
    return detector.isNegated(segment, keyword);
};
exports.isNegated = isNegated;
