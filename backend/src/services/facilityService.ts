import prisma from '../lib/prisma';
import { Facility, Prisma } from '../../generated/prisma/client';

interface GetFacilitiesParams {
  type?: string;
  yakap_accredited?: boolean;
  limit?: number;
  offset?: number;
}

interface GetNearbyFacilitiesParams {
  latitude: number;
  longitude: number;
  radiusInKm: number;
  type?: string;
}

export const getAllFacilities = async (params: GetFacilitiesParams) => {
  const { type, yakap_accredited, limit, offset } = params;

  const where: Prisma.FacilityWhereInput = {};

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
    facilities = await prisma.facility.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    total = facilities.length;
  } else {
    const normalizedOffset = offset ?? 0;
    const [foundFacilities, count] = await Promise.all([
      prisma.facility.findMany({
        where,
        take: limit,
        skip: normalizedOffset,
        orderBy: { name: 'asc' },
      }),
      prisma.facility.count({ where }),
    ]);
    facilities = foundFacilities;
    total = count;
  }

  // Inject busyness_score derived from live_metrics
  const enrichedFacilities = facilities.map((f) => {
    const metrics = (f.live_metrics as any) || {};
    return {
      ...f,
      busyness_score: metrics.busyness_score || 0,
    };
  });

  return {
    facilities: enrichedFacilities,
    total,
    limit: fetchAll ? total : limit,
    offset: fetchAll ? 0 : offset ?? 0,
  };
};

export const updateLiveOccupancy = async (facilityId: string) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Count unique visitorHash records within a rolling 60-minute window
  const uniqueVisitors = await prisma.facilitySignal.findMany({
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

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { capacity: true, live_metrics: true },
  });

  if (!facility) return null;

  const capacity = facility.capacity || 50;
  const busynessScore = currentOccupancy / capacity;

  const previousMetrics = (facility.live_metrics as any) || {};
  const previousOccupancy = previousMetrics.current_occupancy || 0;

  let trend = 'stable';
  if (currentOccupancy > previousOccupancy) trend = 'increasing';
  else if (currentOccupancy < previousOccupancy) trend = 'decreasing';

  const newMetrics = {
    current_occupancy: currentOccupancy,
    last_update: new Date().toISOString(),
    trend,
    busyness_score: busynessScore,
  };

  return prisma.facility.update({
    where: { id: facilityId },
    data: {
      live_metrics: newMetrics,
    },
  });
};

export const getFacilityById = async (id: string): Promise<(Facility & { busyness_score: number }) | null> => {
  const facility = await prisma.facility.findUnique({
    where: { id },
  });

  if (!facility) return null;

  const metrics = (facility.live_metrics as any) || {};
  return {
    ...facility,
    busyness_score: metrics.busyness_score || 0,
  };
};

export const getFacilitiesByType = async (type: string, limit = 10, offset = 0) => {
  const where = { type };
  const [facilities, total] = await Promise.all([
    prisma.facility.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { name: 'asc' },
    }),
    prisma.facility.count({ where }),
  ]);

  const enrichedFacilities = facilities.map((f) => {
    const metrics = (f.live_metrics as any) || {};
    return {
      ...f,
      busyness_score: metrics.busyness_score || 0,
    };
  });

  return { facilities: enrichedFacilities, total, limit, offset };
};

export const getFacilitiesNearby = async (params: GetNearbyFacilitiesParams) => {
  const { latitude, longitude, radiusInKm, type } = params;

  // Use raw query for Haversine distance calculation
  // PostgreSQL formula:
  // 6371 * acos(cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(long2) - radians(long1)) + sin(radians(lat1)) * sin(radians(lat2)))

  const typeFilter = type ? Prisma.sql`AND type = ${type}` : Prisma.sql``;

  const facilities = await prisma.$queryRaw<(Facility & { distance: number })[]>`
    SELECT *,
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

  return facilities.map((f) => {
    const metrics = (f.live_metrics as any) || {};
    return {
      ...f,
      busyness_score: metrics.busyness_score || 0,
    };
  });
};
