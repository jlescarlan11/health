"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriageArbiter = void 0;
const clinicalUtils_1 = require("../../utils/clinicalUtils");
const stringUtils_1 = require("../../utils/stringUtils");
const aiUtils_1 = require("../../utils/aiUtils");
const ProtocolRegistry_1 = require("./ProtocolRegistry");
class TriageArbiter {
    constructor(initialStableTurnCount) {
        const parsed = Number(initialStableTurnCount);
        this.stableTurnCount = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }
    static evaluateAssessmentState(history, profile, currentTurn, totalPlannedQuestions, remainingQuestions = [], previousProfile, clarificationAttempts = 0, initialSymptom = '', sessionContext) {
        const arbiter = new TriageArbiter(sessionContext?.stableTurnCount);
        return arbiter.evaluateAssessmentStateInternal(history, profile, currentTurn, totalPlannedQuestions, remainingQuestions, previousProfile, clarificationAttempts, initialSymptom);
    }
    evaluateAssessmentStateInternal(history, profile, currentTurn, totalPlannedQuestions, remainingQuestions, previousProfile, clarificationAttempts = 0, initialSymptom = '') {
        const isSaturated = this.calculateSaturation(profile, previousProfile, profile.triage_readiness_score ?? 0);
        const newSaturationCount = this.stableTurnCount;
        if (currentTurn >= TriageArbiter.MAX_QUESTIONS_HARD_CAP) {
            return {
                signal: 'TERMINATE',
                reason: `HARD CAP REACHED: Terminating at ${currentTurn} turns.`,
                saturation_count: newSaturationCount,
            };
        }
        const isVulnerable = TriageArbiter.isVulnerableGroup(history, profile);
        if (isVulnerable && !profile.is_vulnerable) {
            profile.is_vulnerable = true;
        }
        if (profile.denial_confidence === 'low') {
            if (clarificationAttempts < 2) {
                return {
                    signal: 'REQUIRE_CLARIFICATION',
                    reason: 'SAFETY GUARD: Low confidence denial detected.',
                    nextSteps: ['Execute mandatory re-verification protocol'],
                    saturation_count: newSaturationCount,
                };
            }
        }
        if (profile.red_flags_resolved === false) {
            const hasUnattemptedRedFlags = remainingQuestions.some((q) => q.is_red_flag);
            if (hasUnattemptedRedFlags) {
                return {
                    signal: 'PRIORITIZE_RED_FLAGS',
                    reason: 'MANDATORY SAFETY GATE: Unresolved red flags detected.',
                    nextSteps: ['Complete all red-flag verification questions immediately'],
                    saturation_count: newSaturationCount,
                };
            }
            return {
                signal: 'CONTINUE',
                reason: 'MANDATORY SAFETY GATE: Red flags remain unresolved',
                nextSteps: ['Confirm denial or presence of critical red flags'],
                saturation_count: newSaturationCount,
            };
        }
        const sanityResult = TriageArbiter.evaluateClinicalSanity(profile, remainingQuestions, previousProfile);
        if (sanityResult.signal === 'RESOLVE_AMBIGUITY' ||
            sanityResult.signal === 'REQUIRE_CLARIFICATION' ||
            sanityResult.signal === 'DRILL_DOWN') {
            return { ...sanityResult, saturation_count: newSaturationCount };
        }
        if (isSaturated) {
            return {
                signal: 'TERMINATE',
                reason: 'CLINICAL SATURATION: Readiness 1.0 and stability maintained.',
                saturation_count: newSaturationCount,
            };
        }
        const isComplexCategory = profile.symptom_category === 'complex' ||
            profile.symptom_category === 'critical' ||
            profile.is_complex_case ||
            profile.is_vulnerable;
        const minTurnsRequired = isComplexCategory
            ? TriageArbiter.MIN_TURNS_COMPLEX
            : TriageArbiter.MIN_TURNS_SIMPLE;
        if (currentTurn < minTurnsRequired) {
            return {
                signal: 'CONTINUE',
                reason: `GUARDRAIL: Turn floor not reached. (Current: ${currentTurn}, Required: ${minTurnsRequired})`,
                nextSteps: ['Continue gathering clinical context'],
                saturation_count: newSaturationCount,
            };
        }
        if (sanityResult.signal !== 'TERMINATE') {
            return { ...sanityResult, saturation_count: newSaturationCount };
        }
        if (isComplexCategory || profile.clinical_friction_detected) {
            const hasUnattemptedTier3 = remainingQuestions.some((q) => q.tier === 3);
            if (hasUnattemptedTier3) {
                return {
                    signal: 'CONTINUE',
                    reason: `DEPTH FAIL: Tier 3 exhaustion required.`,
                    nextSteps: ['Complete all remaining Tier 3 ambiguity resolution questions'],
                    saturation_count: newSaturationCount,
                };
            }
        }
        const completenessResult = TriageArbiter.evaluateDataCompleteness(profile, initialSymptom);
        if (completenessResult.signal === 'TERMINATE' &&
            profile.triage_readiness_score === 1.0 &&
            profile.internal_inconsistency_detected) {
            return {
                signal: 'REQUIRE_CLARIFICATION',
                reason: 'RESTRICTION: High readiness with contradictory history detected',
                needs_reset: true,
                nextSteps: ['Perform system-led reset of progress'],
                saturation_count: newSaturationCount,
            };
        }
        if (completenessResult.signal !== 'TERMINATE') {
            return { ...completenessResult, saturation_count: newSaturationCount };
        }
        const isExhausted = currentTurn >= totalPlannedQuestions;
        if (isExhausted || currentTurn >= 10) {
            return {
                signal: 'TERMINATE',
                reason: 'CLINICAL CLOSURE: Case is complete and verified.',
                saturation_count: newSaturationCount,
            };
        }
        return {
            signal: 'CONTINUE',
            reason: 'Continuing planned path to maximize clinical data density',
            saturation_count: newSaturationCount,
        };
    }
    calculateSaturation(current, previous, readinessScore) {
        if (!previous) {
            this.stableTurnCount = 0;
            return false;
        }
        const slotsIdentical = TriageArbiter.areClinicalSlotsIdentical(current, previous);
        const stableCount = slotsIdentical ? this.stableTurnCount + 1 : 0;
        this.stableTurnCount = stableCount;
        return readinessScore >= 1.0 && stableCount >= 2;
    }
    static areClinicalSlotsIdentical(a, b) {
        if (!this.semanticNumericCompare('age', a.age, b.age))
            return false;
        if (!this.strictTextCompare('duration', a.duration, b.duration))
            return false;
        if (!this.semanticNumericCompare('severity', a.severity, b.severity))
            return false;
        if (!this.strictTextCompare('progression', a.progression, b.progression))
            return false;
        if (!this.semanticDenialCompare('red_flag_denials', a.red_flag_denials, b.red_flag_denials, { allowNone: true }))
            return false;
        if (a.red_flags_resolved !== b.red_flags_resolved)
            return false;
        if (a.symptom_category !== b.symptom_category)
            return false;
        if (a.is_complex_case !== b.is_complex_case)
            return false;
        if (a.is_vulnerable !== b.is_vulnerable)
            return false;
        return true;
    }
    static semanticNumericCompare(_field, valueA, valueB) {
        const left = (0, aiUtils_1.normalizeSlot)(valueA);
        const right = (0, aiUtils_1.normalizeSlot)(valueB);
        if (!left && !right)
            return true;
        if (!left || !right)
            return false;
        const normalizedLeft = (0, stringUtils_1.normalizeNumericValue)(left);
        const normalizedRight = (0, stringUtils_1.normalizeNumericValue)(right);
        if (normalizedLeft !== null && normalizedRight !== null)
            return normalizedLeft === normalizedRight;
        return left.trim().toLowerCase() === right.trim().toLowerCase();
    }
    static strictTextCompare(_field, valueA, valueB, options = {}) {
        return (0, aiUtils_1.normalizeSlot)(valueA, options) === (0, aiUtils_1.normalizeSlot)(valueB, options);
    }
    static semanticDenialCompare(_field, valueA, valueB, options = {}) {
        const left = (0, aiUtils_1.normalizeSlot)(valueA, options);
        const right = (0, aiUtils_1.normalizeSlot)(valueB, options);
        if (left === right)
            return true;
        if (!left || !right)
            return false;
        const tokenize = (text) => new Set(text.toLowerCase().replace(/[.,;]/g, ' ').split(/\s+/).filter((s) => s.length > 2 && s !== 'denies' && s !== 'reports'));
        const setA = tokenize(left);
        const setB = tokenize(right);
        return setA.size === setB.size && [...setA].every((x) => setB.has(x));
    }
    static evaluateDataCompleteness(profile, initialSymptom) {
        const missingFields = [];
        if (!(0, aiUtils_1.normalizeSlot)(profile.age))
            missingFields.push('Age');
        if (!(0, aiUtils_1.normalizeSlot)(profile.duration))
            missingFields.push('Duration');
        if (!(0, aiUtils_1.normalizeSlot)(profile.severity))
            missingFields.push('Severity');
        if (!(0, aiUtils_1.normalizeSlot)(profile.red_flag_denials, { allowNone: true }))
            missingFields.push('Red Flag');
        if (missingFields.length > 0)
            return { signal: 'CONTINUE', reason: `Missing: ${missingFields.join(', ')}` };
        if (!profile.red_flags_resolved)
            return { signal: 'CONTINUE', reason: 'Red flags not resolved.' };
        const protocol = (0, ProtocolRegistry_1.detectProtocol)(profile.summary || '', initialSymptom);
        if (protocol) {
            const { missing, complete } = this.areProtocolSlotsComplete(profile, protocol);
            if (complete)
                return { signal: 'TERMINATE', reason: `${protocol.id} slots complete.` };
            return { signal: 'CONTINUE', reason: `Missing ${protocol.id} slots: ${missing.join(', ')}` };
        }
        if ((profile.triage_readiness_score ?? 0) < 0.9)
            return { signal: 'CONTINUE', reason: 'Readiness below threshold.' };
        return { signal: 'TERMINATE' };
    }
    static areProtocolSlotsComplete(profile, protocol) {
        const details = profile.specific_details || {};
        const missing = protocol.required_slots.filter(slot => {
            const value = details[slot];
            return !(0, aiUtils_1.normalizeSlot)(value, { allowNone: true });
        });
        return { missing, complete: missing.length === 0 };
    }
    static evaluateClinicalSanity(profile, remainingQuestions, previousProfile) {
        if (previousProfile && previousProfile.symptom_category !== 'critical' && profile.symptom_category === 'critical') {
            return { signal: 'DRILL_DOWN', reason: 'Criticality escalation.' };
        }
        if (profile.ambiguity_detected && !profile.uncertainty_accepted) {
            return { signal: 'RESOLVE_AMBIGUITY', reason: 'Unresolved ambiguity.' };
        }
        if (profile.clinical_friction_detected) {
            return { signal: 'DRILL_DOWN', reason: 'Clinical friction.' };
        }
        if (profile.internal_inconsistency_detected || (profile.internal_consistency_score ?? 1) < 0.85) {
            if (remainingQuestions.some((q) => q.tier === 3))
                return { signal: 'CONTINUE', reason: 'Inconsistency, check Tier 3.' };
            if ((profile.internal_consistency_score ?? 1) < 0.7)
                return { signal: 'REQUIRE_CLARIFICATION', reason: 'Severe inconsistency.', needs_reset: true };
        }
        if (!(0, aiUtils_1.normalizeSlot)(profile.progression))
            return { signal: 'CONTINUE', reason: 'Missing progression.' };
        return { signal: 'TERMINATE' };
    }
    static isVulnerableGroup(history, profile) {
        const numericAge = (0, clinicalUtils_1.normalizeAge)(profile.age);
        const isPediatric = numericAge !== null && numericAge < 5;
        const isGeriatric = numericAge !== null && numericAge >= 65;
        const fullText = history.map((h) => h.text).join(' ');
        return isPediatric || isGeriatric || (0, clinicalUtils_1.isMaternalContext)(fullText) || profile.is_vulnerable === true;
    }
}
exports.TriageArbiter = TriageArbiter;
TriageArbiter.MIN_TURNS_SIMPLE = 4;
TriageArbiter.MIN_TURNS_COMPLEX = 7;
TriageArbiter.MAX_QUESTIONS_HARD_CAP = 12;
//# sourceMappingURL=TriageArbiter.js.map