"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiController = __importStar(require("../controllers/aiController"));
const rateLimit_1 = require("../middleware/rateLimit");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
router.use(rateLimit_1.apiLimiter);
router.post('/navigate', (0, utils_1.asyncHandler)(aiController.navigate));
router.post('/plan', (0, utils_1.asyncHandler)(aiController.generateAssessmentPlan));
router.post('/profile', (0, utils_1.asyncHandler)(aiController.extractClinicalProfile));
router.post('/assess', (0, utils_1.asyncHandler)(aiController.assessSymptoms));
router.post('/narrative', (0, utils_1.asyncHandler)(aiController.generateRecommendationNarratives));
router.post('/follow-up', (0, utils_1.asyncHandler)(aiController.generateImmediateFollowUp));
router.post('/refine-plan', aiController.refineAssessmentPlan);
router.post('/expand-assessment', aiController.expandAssessment);
router.post('/bridge', aiController.generateBridgeMessage);
router.post('/refine-question', (0, utils_1.asyncHandler)(aiController.refineQuestion));
router.post('/evaluate-triage', (0, utils_1.asyncHandler)(aiController.evaluateTriageState));
router.post('/chat', (0, utils_1.asyncHandler)(aiController.chat));
exports.default = router;
//# sourceMappingURL=aiRoutes.js.map