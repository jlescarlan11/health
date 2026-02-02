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
exports.deleteHistory = exports.getHistory = exports.createHistory = void 0;
const historyService = __importStar(require("../services/historyService"));
const historySchema_1 = require("../schemas/historySchema");
const createHistory = async (req, res) => {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'User context missing' });
        }
        const validatedData = historySchema_1.CreateClinicalHistorySchema.parse(req.body);
        const record = await historyService.createHistory(req.user.sub, validatedData.payload);
        const validatedResponse = historySchema_1.ClinicalHistoryResponseSchema.parse({
            ...record,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        });
        return res.status(201).json(validatedResponse);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        console.error('Create history error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createHistory = createHistory;
const getHistory = async (req, res) => {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'User context missing' });
        }
        const history = await historyService.getUserHistory(req.user.sub);
        const validatedResponse = historySchema_1.ClinicalHistoryListResponseSchema.parse(history.map(record => ({
            ...record,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
        })));
        return res.json(validatedResponse);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(500).json({ error: 'Response validation failed', details: error.errors });
        }
        console.error('Get history error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getHistory = getHistory;
const deleteHistory = async (req, res) => {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'User context missing' });
        }
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Record ID is required' });
        }
        await historyService.deleteHistory(req.user.sub, id);
        return res.status(204).send();
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Record not found or not owned by user' });
        }
        console.error('Delete history error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteHistory = deleteHistory;
//# sourceMappingURL=historyController.js.map