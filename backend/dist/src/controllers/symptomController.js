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
exports.searchSymptoms = exports.getSymptoms = void 0;
const symptomService = __importStar(require("../services/symptomService"));
const getSymptoms = async (_req, res) => {
    try {
        const symptoms = await symptomService.getAllSymptoms();
        res.json(symptoms);
    }
    catch (error) {
        console.error('Error fetching symptoms:', error);
        res.status(500).json({ error: 'Failed to fetch symptoms' });
    }
};
exports.getSymptoms = getSymptoms;
const searchSymptoms = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            res.status(400).json({ error: 'Query parameter "q" is required' });
            return;
        }
        const symptoms = await symptomService.searchSymptoms(q);
        res.json(symptoms);
    }
    catch (error) {
        console.error('Error searching symptoms:', error);
        res.status(500).json({ error: 'Failed to search symptoms' });
    }
};
exports.searchSymptoms = searchSymptoms;
//# sourceMappingURL=symptomController.js.map