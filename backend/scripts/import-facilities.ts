import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

// Define interface for CSV record
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
  photos: string;
  barangay: string;
}

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Fallback to local .env if root one not found (though unlikely in this structure)
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

// --- Parser Logic (from requirements) ---

function parseOperatingHours(hoursStr: string) {
  const schedule: Record<number, { open: string; close: string } | null> = {
    0: null, // Sunday
    1: null, // Monday
    2: null, // Tuesday
    3: null, // Wednesday
    4: null, // Thursday
    5: null, // Friday
    6: null, // Saturday
  };

  if (!hoursStr) {
    return {
      description: 'Not Available',
      is24x7: false,
      schedule,
    };
  }

  // 1. Check for simple "24/7" that applies to ALL days
  const simple247 = /^(open\s*)?(24\s*hours?|24\/7)$/i.test(hoursStr.trim());

  if (simple247) {
    for (let i = 0; i <= 6; i++) {
      schedule[i] = { open: '00:00', close: '23:59' };
    }
    return { description: hoursStr, is24x7: true, schedule };
  }

  // 2. Parse segments (e.g., "Mon-Fri: 8AM-12AM; Sat: 24 Hours")
  const segments = hoursStr.split(';');

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    // Split "Mon-Fri: 8AM-12AM" into ["Mon-Fri", "8AM-12AM"]
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const dayPart = trimmed.substring(0, colonIndex).trim();
    const timePart = trimmed.substring(colonIndex + 1).trim();

    if (!dayPart || !timePart) continue;

    let open = '',
      close = '';

    // Handle "24 Hours" in this specific segment
    if (/24\s*hours?|24\/7/i.test(timePart)) {
      open = '00:00';
      close = '23:59';
    } else {
      // Parse standard time format (e.g., "8AM-12AM" or "8:30AM-5:30PM")
      const timeMatch = timePart.match(
        /(\d{1,2}(?::\d{2})?)\s*(AM|PM)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i,
      );

      if (timeMatch) {
        const convertTo24Hour = (time: string, modifier: string): string => {
          const parts = time.split(':');
          let hours = parseInt(parts[0], 10);
          const minutes = parts[1] ? parseInt(parts[1], 10) : 0;

          const mod = modifier.toUpperCase();

          // Handle 12-hour to 24-hour conversion
          if (mod === 'AM') {
            if (hours === 12) {
              hours = 0; // 12AM is 00:00 (midnight)
            }
            // 1AM-11AM stay as is (1-11)
          } else if (mod === 'PM') {
            if (hours !== 12) {
              hours += 12; // 1PM-11PM become 13-23
            }
            // 12PM stays as 12 (noon)
          }

          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        };

        open = convertTo24Hour(timeMatch[1], timeMatch[2]);
        close = convertTo24Hour(timeMatch[3], timeMatch[4]);
      } else {
        // If time format doesn't match, warn but continue
        console.warn(`Warning: Could not parse time format: "${timePart}" in segment "${segment}"`);
        continue;
      }
    }

    const hoursObj = { open, close };

    // Parse day ranges (e.g., "Mon-Fri" or "Sat" or "Mon,Wed,Fri")
    const dayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    const dayTokens = dayPart
      .toLowerCase()
      .split(',')
      .map((d) => d.trim());

    for (const token of dayTokens) {
      if (token.includes('-')) {
        // Handle range like "Mon-Fri"
        const [start, end] = token.split('-').map((s) => s.trim());
        const startIdx = dayMap[start.substring(0, 3)];
        const endIdx = dayMap[end.substring(0, 3)];

        if (startIdx !== undefined && endIdx !== undefined) {
          // Apply hours to all days in range
          if (startIdx <= endIdx) {
            for (let i = startIdx; i <= endIdx; i++) {
              schedule[i] = hoursObj;
            }
          } else {
            // Handle wrap-around (e.g., "Sat-Mon")
            for (let i = startIdx; i <= 6; i++) {
              schedule[i] = hoursObj;
            }
            for (let i = 0; i <= endIdx; i++) {
              schedule[i] = hoursObj;
            }
          }
        }
      } else {
        // Handle single day like "Sat"
        const idx = dayMap[token.substring(0, 3)];
        if (idx !== undefined) {
          schedule[idx] = hoursObj;
        }
      }
    }
  }

  // 3. Calculate is24x7 flag - true ONLY if ALL 7 days are 00:00-23:59
  const is24x7 = Object.values(schedule).every(
    (s) => s !== null && s.open === '00:00' && s.close === '23:59',
  );

  return {
    description: hoursStr,
    is24x7,
    schedule,
  };
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
      const operatingHours = parseOperatingHours(record.operating_hours);

      // Convert comma/semicolon separated strings to arrays
      const services = record.services
        ? record.services.split(';').map((s: string) => s.trim())
        : [];
      const photos = record.photos
        ? record.photos
            .split(';')
            .map((p: string) => p.trim())
            .filter((p: string) => p.length > 0)
        : [];

      // Clean lat/long
      const latitude = parseFloat(record.latitude);
      const longitude = parseFloat(record.longitude);

      if (isNaN(latitude) || isNaN(longitude)) {
        console.warn(`Skipping ${record.name}: Invalid coordinates`);
        continue;
      }

      // Upsert facility
      // We use name as the unique identifier for upsert here, but schema might not have unique on name.
      // If name is not unique, we should check if it exists first.
      // Schema: id String @id, name String. No unique on name.
      // So we use findFirst.

      const existing = await prisma.facility.findFirst({
        where: { name: record.name },
      });

      const data = {
        name: record.name,
        type: record.type,
        address: record.address,
        latitude,
        longitude,
        phone: record.phone || null,
        yakap_accredited: record.yakap_accredited === 'true',
        services,
        operating_hours: operatingHours,
        photos,
        barangay: record.barangay || null,
      };

      if (existing) {
        await prisma.facility.update({
          where: { id: existing.id },
          data,
        });
        console.log(`Updated: ${record.name}`);
      } else {
        await prisma.facility.create({
          data,
        });
        console.log(`Created: ${record.name}`);
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
