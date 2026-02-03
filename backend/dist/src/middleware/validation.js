"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.validateFacilityType = exports.validateFacilityId = exports.validateNearbyParams = exports.validatePagination = exports.validateSchema = void 0;
const express_validator_1 = require("express-validator");
const zod_1 = require("zod");
const validateSchema = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            const issues = error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
            }));
            if (process.env.NODE_ENV !== 'production') {
                console.warn('Schema validation failed:', issues);
            }
            res.status(400).json({
                error: 'Validation failed',
                details: issues,
            });
            return;
        }
        res.status(500).json({ error: 'Internal server error during validation' });
    }
};
exports.validateSchema = validateSchema;
const validatePagination = (req, res, next) => {
    const { limit, offset } = req.query;
    if (limit && isNaN(Number(limit))) {
        res.status(400).json({ error: 'Limit must be a number' });
        return;
    }
    if (offset && isNaN(Number(offset))) {
        res.status(400).json({ error: 'Offset must be a number' });
        return;
    }
    next();
};
exports.validatePagination = validatePagination;
const validateNearbyParams = (req, res, next) => {
    const { lat, lng, radius } = req.query;
    if (!lat || isNaN(Number(lat))) {
        res.status(400).json({ error: 'Latitude (lat) is required and must be a number' });
        return;
    }
    if (!lng || isNaN(Number(lng))) {
        res.status(400).json({ error: 'Longitude (lng) is required and must be a number' });
        return;
    }
    if (radius && isNaN(Number(radius))) {
        res.status(400).json({ error: 'Radius must be a number' });
        return;
    }
    next();
};
exports.validateNearbyParams = validateNearbyParams;
const validateFacilityId = (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        res.status(400).json({ error: 'Facility ID is required' });
        return;
    }
    next();
};
exports.validateFacilityId = validateFacilityId;
const validateFacilityType = (req, res, next) => {
    const { type } = req.params;
    if (!type) {
        res.status(400).json({ error: 'Facility type is required' });
        return;
    }
    next();
};
exports.validateFacilityType = validateFacilityType;
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    next();
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map