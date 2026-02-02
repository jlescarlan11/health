"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFacilitiesNearby = exports.getFacilitiesByType = exports.getFacilityById = exports.updateLiveOccupancy = exports.getAllFacilities = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const prisma_2 = require("../../generated/prisma");
const getAllFacilities = async (params) => {
    const { type, yakap_accredited, limit, offset } = params;
    const where = {};
    if (type) {
        where.type = type;
    }
    if (yakap_accredited !== undefined) {
        where.yakap_accredited = yakap_accredited;
    }
    const fetchAll = limit === undefined || limit === null || limit === -1;
    let facilities;
    let total;
    if (fetchAll) {
        facilities = await prisma_1.default.facility.findMany({
            where,
            include: { contacts: true },
            orderBy: { name: 'asc' },
        });
        total = facilities.length;
    }
    else {
        const normalizedOffset = offset ?? 0;
        const [foundFacilities, count] = await Promise.all([
            prisma_1.default.facility.findMany({
                where,
                take: limit,
                skip: normalizedOffset,
                include: { contacts: true },
                orderBy: { name: 'asc' },
            }),
            prisma_1.default.facility.count({ where }),
        ]);
        facilities = foundFacilities;
        total = count;
    }
    const enrichedFacilities = facilities.map((f) => {
        const metrics = f.live_metrics || {};
        const busyness_score = typeof metrics === 'object' && metrics !== null && 'busyness_score' in metrics
            ? metrics.busyness_score
            : 0;
        return {
            ...f,
            busyness_score,
        };
    });
    return {
        facilities: enrichedFacilities,
        total,
        limit: fetchAll ? total : limit,
        offset: fetchAll ? 0 : (offset ?? 0),
    };
};
exports.getAllFacilities = getAllFacilities;
const updateLiveOccupancy = async (facilityId) => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const uniqueVisitors = await prisma_1.default.facilitySignal.findMany({
        where: {
            facilityId,
            timestamp: {
                gte: oneHourAgo,
            },
        },
        distinct: ['visitorHash'],
        select: {
            visitorHash: true,
        },
    });
    const currentOccupancy = uniqueVisitors.length;
    const facility = await prisma_1.default.facility.findUnique({
        where: { id: facilityId },
        select: { capacity: true, live_metrics: true },
    });
    if (!facility)
        return null;
    const capacity = facility.capacity || 50;
    const busynessScore = currentOccupancy / capacity;
    const previousMetrics = facility.live_metrics || {};
    const previousOccupancy = typeof previousMetrics === 'object' &&
        previousMetrics !== null &&
        'current_occupancy' in previousMetrics
        ? previousMetrics.current_occupancy
        : 0;
    let trend = 'stable';
    if (currentOccupancy > previousOccupancy)
        trend = 'increasing';
    else if (currentOccupancy < previousOccupancy)
        trend = 'decreasing';
    const newMetrics = {
        current_occupancy: currentOccupancy,
        last_update: new Date().toISOString(),
        trend,
        busyness_score: busynessScore,
    };
    return prisma_1.default.facility.update({
        where: { id: facilityId },
        data: {
            live_metrics: newMetrics,
        },
    });
};
exports.updateLiveOccupancy = updateLiveOccupancy;
const getFacilityById = async (id) => {
    const facility = await prisma_1.default.facility.findUnique({
        where: { id },
        include: { contacts: true },
    });
    if (!facility)
        return null;
    const metrics = facility.live_metrics || {};
    const busyness_score = typeof metrics === 'object' && metrics !== null && 'busyness_score' in metrics
        ? metrics.busyness_score
        : 0;
    return {
        ...facility,
        busyness_score,
    };
};
exports.getFacilityById = getFacilityById;
const getFacilitiesByType = async (type, limit = 10, offset = 0) => {
    const where = { type };
    const [facilities, total] = await Promise.all([
        prisma_1.default.facility.findMany({
            where,
            take: limit,
            skip: offset,
            include: { contacts: true },
            orderBy: { name: 'asc' },
        }),
        prisma_1.default.facility.count({ where }),
    ]);
    const enrichedFacilities = facilities.map((f) => {
        const metrics = f.live_metrics || {};
        const busyness_score = typeof metrics === 'object' && metrics !== null && 'busyness_score' in metrics
            ? metrics.busyness_score
            : 0;
        return {
            ...f,
            busyness_score,
        };
    });
    return { facilities: enrichedFacilities, total, limit, offset };
};
exports.getFacilitiesByType = getFacilitiesByType;
const getFacilitiesNearby = async (params) => {
    const { latitude, longitude, radiusInKm, type } = params;
    const typeFilter = type ? prisma_2.Prisma.sql `AND type = ${type}` : prisma_2.Prisma.sql ``;
    const rawFacilities = await prisma_1.default.$queryRaw `
    SELECT id,
    (
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians(latitude))
      )
    ) AS distance
    FROM "Facility"
    WHERE 1=1
    ${typeFilter}
    AND (
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians(latitude))
      )
    ) <= ${radiusInKm}
    ORDER BY distance ASC
  `;
    if (rawFacilities.length === 0) {
        return [];
    }
    const ids = rawFacilities.map((f) => f.id);
    const facilities = await prisma_1.default.facility.findMany({
        where: { id: { in: ids } },
        include: { contacts: true },
    });
    const facilityMap = new Map(facilities.map((f) => [f.id, f]));
    return rawFacilities
        .map((raw) => {
        const f = facilityMap.get(raw.id);
        if (!f)
            return null;
        const metrics = f.live_metrics || {};
        const busyness_score = typeof metrics === 'object' && metrics !== null && 'busyness_score' in metrics
            ? metrics.busyness_score
            : 0;
        return {
            ...f,
            distance: raw.distance,
            busyness_score,
        };
    })
        .filter((f) => f !== null);
};
exports.getFacilitiesNearby = getFacilitiesNearby;
//# sourceMappingURL=facilityService.js.map