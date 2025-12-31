// Load environment variables FIRST using require (executes immediately, before imports)
// This ensures DATABASE_URL is available when prisma module is imported
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scripts/import-facilities.ts:7',message:'Script entry - before dotenv',data:{cwd:process.cwd(),__dirname,hasDatabaseUrl:!!process.env.DATABASE_URL,databaseUrlLength:process.env.DATABASE_URL?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
// #endregion

// Load environment variables BEFORE importing prisma (which checks DATABASE_URL on import)
// Try backend/.env first, then parent directory .env
const envPath = path.resolve(__dirname, '../.env');
const parentEnvPath = path.resolve(__dirname, '../../.env');
// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scripts/import-facilities.ts:13',message:'Checking .env file locations',data:{envPath,parentEnvPath,exists1:fs.existsSync(envPath),exists2:fs.existsSync(parentEnvPath)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
// #endregion
dotenv.config({ path: envPath });
// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scripts/import-facilities.ts:16',message:'After dotenv.config backend/.env',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,databaseUrlLength:process.env.DATABASE_URL?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
// #endregion
if (!process.env.DATABASE_URL) {
  // If DATABASE_URL not found, try parent directory
  dotenv.config({ path: parentEnvPath });
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scripts/import-facilities.ts:20',message:'After dotenv.config parent/.env',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,databaseUrlLength:process.env.DATABASE_URL?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
}
// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scripts/import-facilities.ts:23',message:'Before importing prisma',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,databaseUrlLength:process.env.DATABASE_URL?.length||0,databaseUrlPrefix:process.env.DATABASE_URL?.substring(0,20)||'N/A'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
// #endregion

// Now safe to import modules that depend on DATABASE_URL
import { parse } from 'csv-parse';
import prisma from '../src/lib/prisma';

// Interface matching the CSV structure
interface FacilityCSV {
  name: string;
  type: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  yakap_accredited: string;
  services: string; // semicolon separated
  operating_hours: string;
  barangay: string;
  photos: string; // semicolon separated
}

async function importFacilities() {
  // Resolve path relative to this script
  const csvPath = path.resolve(__dirname, '../../backend/data/data-collection-template.csv');
  console.log(`Reading CSV from ${csvPath}...`);

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const facilities: FacilityCSV[] = [];

  const parser = fs.createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  for await (const record of parser) {
    facilities.push(record as FacilityCSV);
  }

  console.log(`Found ${facilities.length} facilities to process.`);

  for (const facility of facilities) {
    try {
      console.log(`Processing ${facility.name}...`);

      const services = facility.services ? facility.services.split(';').map(s => s.trim()).filter(Boolean) : [];
      const photos = facility.photos ? facility.photos.split(';').map(p => p.trim()).filter(Boolean) : [];
      const latitude = parseFloat(facility.latitude);
      const longitude = parseFloat(facility.longitude);
      const yakap_accredited = facility.yakap_accredited.toLowerCase() === 'true';
      
      // Parse operating hours - assuming simple string for now, but DB expects JSON.
      const operating_hours = { description: facility.operating_hours };

      const existing = await prisma.facility.findFirst({
        where: { name: facility.name }
      });

      const facilityData = {
        name: facility.name,
        type: facility.type,
        address: facility.address,
        latitude,
        longitude,
        phone: facility.phone || null,
        yakap_accredited,
        services,
        operating_hours,
        photos,
        barangay: facility.barangay || null,
      };

      if (existing) {
        await prisma.facility.update({
          where: { id: existing.id },
          data: facilityData,
        });
        console.log(`Updated ${facility.name}`);
      } else {
        await prisma.facility.create({
          data: facilityData,
        });
        console.log(`Created ${facility.name}`);
      }
    } catch (error) {
      console.error(`Error processing ${facility.name}:`, error);
    }
  }
  
  console.log('Import completed.');
}

importFacilities()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
