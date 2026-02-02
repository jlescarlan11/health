"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSymptoms = exports.getAllSymptoms = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const getAllSymptoms = async () => {
    return await prisma_1.default.symptom.findMany({
        orderBy: {
            name: 'asc',
        },
    });
};
exports.getAllSymptoms = getAllSymptoms;
const searchSymptoms = async (query) => {
    return await prisma_1.default.symptom.findMany({
        where: {
            OR: [
                {
                    name: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
                {
                    keywords: {
                        has: query.toLowerCase(),
                    },
                },
            ],
        },
        orderBy: {
            name: 'asc',
        },
    });
};
exports.searchSymptoms = searchSymptoms;
//# sourceMappingURL=symptomService.js.map