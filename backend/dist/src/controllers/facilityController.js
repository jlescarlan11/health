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
exports.listFacilitiesByType = exports.listFacilitiesNearby = exports.getFacility = exports.listFacilities = void 0;
const facilityService = __importStar(require("../services/facilityService"));
const mapToFacility = (f) => {
    const operatingHours = f.operating_hours;
    const hours = operatingHours && typeof operatingHours === 'object'
        ? operatingHours.description || ''
        : '';
    const primaryPhone = f.contacts && f.contacts.length > 0 ? f.contacts[0].phoneNumber : null;
    return {
        id: f.id,
        name: f.name,
        type: f.type,
        services: f.services,
        address: f.address,
        latitude: f.latitude,
        longitude: f.longitude,
        phone: primaryPhone,
        contacts: f.contacts || [],
        yakapAccredited: f.yakap_accredited,
        hours: hours,
        operatingHours: f.operating_hours,
        photoUrl: f.photos && f.photos.length > 0 ? f.photos[0] : null,
        distance: f.distance,
        specialized_services: f.specialized_services,
        is_24_7: f.is_24_7,
        busyness_score: f.busyness_score || 0,
        live_metrics: f.live_metrics,
    };
};
const listFacilities = async (req, res) => {
    try {
        const { type, yakap_accredited, limit, offset } = req.query;
        const result = await facilityService.getAllFacilities({
            type: type,
            yakap_accredited: yakap_accredited === 'true' ? true : yakap_accredited === 'false' ? false : undefined,
            limit: limit === undefined || limit === '' ? undefined : Number(limit),
            offset: offset === undefined || offset === '' ? undefined : Number(offset),
        });
        res.json({
            ...result,
            facilities: result.facilities.map(mapToFacility),
        });
    }
    catch (error) {
        console.error('Error listing facilities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.listFacilities = listFacilities;
const getFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const facility = await facilityService.getFacilityById(id);
        if (!facility) {
            res.status(404).json({ error: 'Facility not found' });
            return;
        }
        res.json(mapToFacility(facility));
    }
    catch (error) {
        console.error('Error getting facility:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getFacility = getFacility;
const listFacilitiesNearby = async (req, res) => {
    try {
        const { lat, lng, radius, type } = req.query;
        if (!lat || !lng) {
            res.status(400).json({ error: 'Missing latitude or longitude' });
            return;
        }
        const facilities = await facilityService.getFacilitiesNearby({
            latitude: Number(lat),
            longitude: Number(lng),
            radiusInKm: radius ? Number(radius) : 5,
            type: type,
        });
        res.json(facilities.map(mapToFacility));
    }
    catch (error) {
        console.error('Error finding nearby facilities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.listFacilitiesNearby = listFacilitiesNearby;
const listFacilitiesByType = async (req, res) => {
    try {
        const { type } = req.params;
        const { limit, offset } = req.query;
        const result = await facilityService.getFacilitiesByType(type, limit ? Number(limit) : undefined, offset ? Number(offset) : undefined);
        res.json({
            ...result,
            facilities: result.facilities.map(mapToFacility),
        });
    }
    catch (error) {
        console.error('Error listing facilities by type:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.listFacilitiesByType = listFacilitiesByType;
//# sourceMappingURL=facilityController.js.map