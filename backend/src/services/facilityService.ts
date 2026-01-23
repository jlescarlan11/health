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

  if (fetchAll) {
    const facilities = await prisma.facility.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const total = facilities.length;
    return { facilities, total, limit: total, offset: 0 };
  }

  const normalizedOffset = offset ?? 0;

  const [facilities, total] = await Promise.all([
    prisma.facility.findMany({
      where,
      take: limit,
      skip: normalizedOffset,
      orderBy: { name: 'asc' },
    }),
    prisma.facility.count({ where }),
  ]);

  return { facilities, total, limit, offset: normalizedOffset };
};

export const getFacilityById = async (id: string): Promise<Facility | null> => {
  return prisma.facility.findUnique({
    where: { id },
  });
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
  return { facilities, total, limit, offset };
};

export const getFacilitiesNearby = async (params: GetNearbyFacilitiesParams) => {
  const { latitude, longitude, radiusInKm, type } = params;

  // Use raw query for Haversine distance calculation
  // PostgreSQL formula:
  // 6371 * acos(cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(long2) - radians(long1)) + sin(radians(lat1)) * sin(radians(lat2)))

  const typeFilter = type ? Prisma.sql`AND type = ${type}` : Prisma.sql``;

  const facilities = await prisma.$queryRaw<Facility[]>`
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

  return facilities;
};
