"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmergencyContactsByCategory = exports.getAllEmergencyContacts = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const getAllEmergencyContacts = async () => {
    return prisma_1.default.emergencyContact.findMany({
        orderBy: { name: 'asc' },
    });
};
exports.getAllEmergencyContacts = getAllEmergencyContacts;
const getEmergencyContactsByCategory = async (category) => {
    return prisma_1.default.emergencyContact.findMany({
        where: { category },
        orderBy: { name: 'asc' },
    });
};
exports.getEmergencyContactsByCategory = getEmergencyContactsByCategory;
//# sourceMappingURL=emergencyContactService.js.map