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
const facilityController = __importStar(require("../controllers/facilityController"));
const validation_1 = require("../middleware/validation");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
router.get('/', validation_1.validatePagination, (0, utils_1.asyncHandler)(facilityController.listFacilities));
router.get('/nearby', validation_1.validateNearbyParams, (0, utils_1.asyncHandler)(facilityController.listFacilitiesNearby));
router.get('/by-type/:type', validation_1.validateFacilityType, validation_1.validatePagination, (0, utils_1.asyncHandler)(facilityController.listFacilitiesByType));
router.get('/:id', validation_1.validateFacilityId, (0, utils_1.asyncHandler)(facilityController.getFacility));
exports.default = router;
//# sourceMappingURL=facilityRoutes.js.map