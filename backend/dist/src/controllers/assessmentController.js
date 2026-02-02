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
exports.transferAssessment = void 0;
const historyService = __importStar(require("../services/historyService"));
const transferAssessment = async (req, res) => {
    try {
        const { targetUsername, targetPhoneNumber, assessmentData } = req.body;
        const rawPhoneNumber = typeof targetPhoneNumber === 'string'
            ? targetPhoneNumber
            : typeof targetUsername === 'string'
                ? targetUsername
                : undefined;
        if (!rawPhoneNumber || typeof rawPhoneNumber !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'targetPhoneNumber (string) is required',
            });
        }
        const normalizedPhone = rawPhoneNumber.trim();
        if (!normalizedPhone) {
            return res.status(400).json({
                success: false,
                error: 'targetPhoneNumber cannot be empty',
            });
        }
        if (assessmentData === undefined || assessmentData === null) {
            return res.status(400).json({
                success: false,
                error: 'assessmentData is required',
            });
        }
        const result = await historyService.transferAssessmentResult(normalizedPhone, assessmentData);
        if (!result.success) {
            return res.status(result.statusCode ?? 500).json({
                success: false,
                error: result.message,
            });
        }
        return res.status(201).json({
            success: true,
            recordId: result.recordId,
        });
    }
    catch (error) {
        console.error('Unexpected error transferring assessment:', error);
        return res.status(500).json({
            success: false,
            error: 'Unexpected error while transferring assessment result',
        });
    }
};
exports.transferAssessment = transferAssessment;
//# sourceMappingURL=assessmentController.js.map