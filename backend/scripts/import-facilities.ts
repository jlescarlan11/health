import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

// Define interface for CSV record matching the template headers
interface FacilityRecord {
  name: string;
  type: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  yakap_accredited: string;
  services: string;
  operating_hours: string;
  barangay: string;
  photos: string;
  specialized_services: string;
  is_24_7: string;
  capacity: string;
  live_metrics: string;
  busy_patterns: string;
  signals: string;
}

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Database setup
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set in environment variables.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- Parser Helpers ---

/**
 * Extracts numeric capacity from strings like "1000 Bed Capacity"
 */
function parseCapacity(capacityStr: string): number {
  if (!capacityStr || capacityStr.toLowerCase().includes('to be added')) return 50;
  const match = capacityStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 50;
}

/**
 * Parses complex phone strings into structured contact records
 * Handles formats like: "Person Name: 09123456789; Other Name: 09123456789"
 */
function parseContacts(phoneStr: string) {
  if (
    !phoneStr ||
    phoneStr.toLowerCase().includes('to be updated') ||
    phoneStr.toLowerCase().includes('to be filled')
  )
    return [];

  return phoneStr.split(';').map((part) => {
    const colonIndex = part.indexOf(':');
    if (colonIndex !== -1) {
      const nameAndRole = part.substring(0, colonIndex).trim();
      const number = part.substring(colonIndex + 1).trim();
      return {
        contactName: nameAndRole,
        phoneNumber: number,
        platform: 'phone',
        role: 'Personnel',
      };
    }
    return {
      phoneNumber: part.trim(),
      platform: 'phone',
      role: 'Primary',
      contactName: null,
    };
  });
}

/**
 * Safely parses JSON strings with a default fallback
 */
function parseJson(jsonStr: string, defaultValue: any = {}) {
  try {
    return jsonStr && jsonStr.trim() !== '' ? JSON.parse(jsonStr) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Parses operating hours strings into a structured JSON schedule
 */
function parseOperatingHours(hoursStr: string) {
  const schedule: Record<number, { open: string; close: string } | null> = {
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
  };

  if (!hoursStr) return { description: 'Not Available', is24x7: false, schedule };

  const simple247 = /^(open\s*)?(24\s*hours?|24\/7)$/i.test(hoursStr.trim());
  if (simple247) {
    for (let i = 0; i <= 6; i++) schedule[i] = { open: '00:00', close: '23:59' };
    return { description: hoursStr, is24x7: true, schedule };
  }

  const segments = hoursStr.split(';');
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const dayPart = trimmed.substring(0, colonIndex).trim();
    const timePart = trimmed.substring(colonIndex + 1).trim();

    let open = '',
      close = '';
    if (/24\s*hours?|24\/7/i.test(timePart)) {
      open = '00:00';
      close = '23:59';
    } else {
      const timeMatch = timePart.match(
        /(\d{1,2}(?::\d{2})?)\s*(AM|PM)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i,
      );
      if (timeMatch) {
        const convertTo24Hour = (time: string, modifier: string): string => {
          const parts = time.split(':');
          let hours = parseInt(parts[0], 10);
          const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
          const mod = modifier.toUpperCase();
          if (mod === 'AM' && hours === 12) hours = 0;
          else if (mod === 'PM' && hours !== 12) hours += 12;
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        };
        open = convertTo24Hour(timeMatch[1], timeMatch[2]);
        close = convertTo24Hour(timeMatch[3], timeMatch[4]);
      } else continue;
    }

    const dayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    dayPart
      .toLowerCase()
      .split(',')
      .map((d) => d.trim())
      .forEach((token) => {
        if (token.includes('-')) {
          const [start, end] = token.split('-').map((s) => s.trim().substring(0, 3));
          const startIdx = dayMap[start];
          const endIdx = dayMap[end];
          if (startIdx !== undefined && endIdx !== undefined) {
            // Correct range handling including wrap-around
            let curr = startIdx;
            while (curr !== (endIdx + 1) % 7) {
              schedule[curr] = { open, close };
              curr = (curr + 1) % 7;
              if (curr === startIdx) break; // Safety break
            }
          }
        } else {
          const idx = dayMap[token.substring(0, 3)];
          if (idx !== undefined) schedule[idx] = { open, close };
        }
      });
  }

  const is24x7 = Object.values(schedule).every(
    (s) => s !== null && s.open === '00:00' && s.close === '23:59',
  );
  return { description: hoursStr, is24x7, schedule };
}

// --- Import Logic ---

async function main() {
  const csvPath = path.join(__dirname, '../data/data-collection-template.csv');
  console.log(`Reading CSV from: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found!');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as FacilityRecord[];

  console.log(`Found ${records.length} records. Processing...`);

  for (const record of records) {
    try {
      // Process coordinates, defaulting to 0.0 if "to be filled" or missing
      const lat =
        record.latitude && !record.latitude.includes('to be filled')
          ? parseFloat(record.latitude)
          : 0.0;
      const lng =
        record.longitude && !record.longitude.includes('to be filled')
          ? parseFloat(record.longitude)
          : 0.0;

      const operatingHours = parseOperatingHours(record.operating_hours);

      const data = {
        name: record.name,
        type: record.type,
        address: record.address,
        latitude: lat,
        longitude: lng,
        yakap_accredited: record.yakap_accredited.toLowerCase() === 'true',
        services: record.services ? record.services.split(';').map((s) => s.trim()) : [],
        specialized_services: record.specialized_services
          ? record.specialized_services.split(';').map((s) => s.trim())
          : [],
        photos: record.photos
          ? record.photos
              .split(';')
              .map((p) => p.trim())
              .filter((p) => p.length > 0)
          : [],
        operating_hours: operatingHours,
        is_24_7: record.is_24_7.toLowerCase() === 'true' || operatingHours.is24x7,
        capacity: parseCapacity(record.capacity),
        barangay:
          record.barangay && !record.barangay.includes('to be filled') ? record.barangay : null,
        live_metrics: parseJson(record.live_metrics),
        busy_patterns: parseJson(record.busy_patterns),
      };

      // Search by name for upsert
      const existing = await prisma.facility.findFirst({
        where: { name: record.name },
      });

      let facilityId: string;

      if (existing) {
        await prisma.facility.update({
          where: { id: existing.id },
          data,
        });
        facilityId = existing.id;

        // Clear old contacts before re-syncing
        await prisma.facilityContact.deleteMany({
          where: { facilityId },
        });

        console.log(`Updated: ${record.name}`);
      } else {
        const created = await prisma.facility.create({
          data,
        });
        facilityId = created.id;
        console.log(`Created: ${record.name}`);
      }

      // Add contacts
      const contacts = parseContacts(record.phone);
      if (contacts.length > 0) {
        await prisma.facilityContact.createMany({
          data: contacts.map((c) => ({
            ...c,
            facilityId,
          })),
        });
      }
    } catch (err) {
      console.error(`Error processing ${record.name}:`, err);
    }
  }

  console.log('Import completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
