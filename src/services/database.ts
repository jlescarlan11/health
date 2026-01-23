import * as SQLite from 'expo-sqlite';
import { Facility } from '../types';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

// Migration function to add missing columns
const migrateTableSchema = async (
  tableName: string,
  requiredColumns: { name: string; type: string }[],
) => {
  if (!db) return;

  try {
    // Get existing columns
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
    const existingColumnNames = tableInfo.map((col) => col.name);

    // Check and add missing columns
    for (const requiredColumn of requiredColumns) {
      if (!existingColumnNames.includes(requiredColumn.name)) {
        await db.execAsync(
          `ALTER TABLE ${tableName} ADD COLUMN ${requiredColumn.name} ${requiredColumn.type}`,
        );
      }
    }
  } catch (error: unknown) {
    console.error(`Error migrating ${tableName} schema:`, error);
    throw error;
  }
};

export const initDatabase = async () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync('health_app.db');

      // Create Facilities Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS facilities (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT,
          services TEXT,
          address TEXT,
          latitude REAL,
          longitude REAL,
          phone TEXT,
          yakapAccredited INTEGER,
          hours TEXT,
          photoUrl TEXT,
          lastUpdated INTEGER,
          data TEXT
        );
      `);

      // Migrate facilities table schema (add missing columns if table already existed)
      await migrateTableSchema('facilities', [
        { name: 'lastUpdated', type: 'INTEGER' },
        { name: 'specialized_services', type: 'TEXT' },
        { name: 'is_24_7', type: 'INTEGER' },
      ]);

      // Create Emergency Contacts Table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS emergency_contacts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          phone TEXT,
          available24x7 INTEGER,
          description TEXT,
          lastUpdated INTEGER,
          data TEXT
        );
      `);

      // Migrate emergency_contacts table schema (add missing columns if table already existed)
      await migrateTableSchema('emergency_contacts', [{ name: 'lastUpdated', type: 'INTEGER' }]);

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      initPromise = null; // Allow retry on failure
      throw error;
    }
  })();

  return initPromise;
};

export const saveFacilities = async (facilities: Facility[]) => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  const timestamp = Date.now();

  try {
    // Start manual transaction
    await db.execAsync('BEGIN TRANSACTION');

    const statement = await db.prepareAsync(
      `INSERT OR REPLACE INTO facilities (id, name, type, services, address, latitude, longitude, phone, yakapAccredited, hours, photoUrl, lastUpdated, specialized_services, is_24_7, data) VALUES ($id, $name, $type, $services, $address, $latitude, $longitude, $phone, $yakapAccredited, $hours, $photoUrl, $lastUpdated, $specialized_services, $is_24_7, $data)`,
    );

    try {
      for (const facility of facilities) {
        await statement.executeAsync({
          $id: facility.id,
          $name: facility.name,
          $type: facility.type,
          $services: JSON.stringify(facility.services || []),
          $address: facility.address,
          $latitude: facility.latitude,
          $longitude: facility.longitude,
          $phone: facility.phone || null,
          $yakapAccredited: facility.yakapAccredited ? 1 : 0,
          $hours: facility.hours || null,
          $photoUrl: facility.photoUrl || null,
          $lastUpdated: timestamp,
          $specialized_services: JSON.stringify(facility.specialized_services || []),
          $is_24_7: facility.is_24_7 ? 1 : 0,
          $data: JSON.stringify(facility),
        });
      }

      await db.execAsync('COMMIT');
      console.log(`Saved ${facilities.length} facilities to offline storage`);
    } catch (innerError) {
      console.error('Error during facility save loop:', innerError);
      try {
        await db.execAsync('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to rollback facility transaction:', rollbackError);
      }
      throw innerError;
    } finally {
      await statement.finalizeAsync();
    }
  } catch (error) {
    console.error('Error in saveFacilities:', error);
    throw error;
  }
};

const stableStringify = (value: unknown) =>
  JSON.stringify(value, (_key, nested) => {
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return nested;

    const record = nested as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = record[key];
    }
    return sorted;
  });

export const saveFacilitiesFull = async (facilities: Facility[]) => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  const timestamp = Date.now();

  try {
    await db.execAsync('BEGIN TRANSACTION');

    const existing = await db.getAllAsync<{ id: string; data: string | null }>(
      'SELECT id, data FROM facilities',
    );
    const existingDataById = new Map(existing.map((row) => [row.id, row.data ?? '']));

    const incomingIds = new Set<string>();
    if (facilities.length === 0) {
      await db.execAsync('DELETE FROM facilities');
      await db.execAsync('COMMIT');
      console.log('Cleared facilities offline storage (empty dataset)');
      return;
    }

    for (const facility of facilities) {
      if (!facility?.id) {
        throw new Error('Invalid facilities dataset: missing facility.id');
      }
      incomingIds.add(facility.id);
    }

    if (incomingIds.size === 0) {
      throw new Error('Invalid facilities dataset: no facility ids present');
    }

    const deleteStatement = await db.prepareAsync('DELETE FROM facilities WHERE id = $id');
    const upsertStatement = await db.prepareAsync(
      `INSERT OR REPLACE INTO facilities (id, name, type, services, address, latitude, longitude, phone, yakapAccredited, hours, photoUrl, lastUpdated, specialized_services, is_24_7, data) VALUES ($id, $name, $type, $services, $address, $latitude, $longitude, $phone, $yakapAccredited, $hours, $photoUrl, $lastUpdated, $specialized_services, $is_24_7, $data)`,
    );

    let deletedCount = 0;
    let upsertedCount = 0;
    let skippedCount = 0;

    try {
      for (const [id] of existingDataById) {
        if (!incomingIds.has(id)) {
          await deleteStatement.executeAsync({ $id: id });
          deletedCount += 1;
        }
      }

      for (const facility of facilities) {
        if (!facility?.id) continue;

        const serialized = stableStringify(facility);
        const existingSerialized = existingDataById.get(facility.id);
        if (existingSerialized === serialized) {
          skippedCount += 1;
          continue;
        }

        await upsertStatement.executeAsync({
          $id: facility.id,
          $name: facility.name,
          $type: facility.type,
          $services: JSON.stringify(facility.services || []),
          $address: facility.address,
          $latitude: facility.latitude,
          $longitude: facility.longitude,
          $phone: facility.phone || null,
          $yakapAccredited: facility.yakapAccredited ? 1 : 0,
          $hours: facility.hours || null,
          $photoUrl: facility.photoUrl || null,
          $lastUpdated: timestamp,
          $specialized_services: JSON.stringify(facility.specialized_services || []),
          $is_24_7: facility.is_24_7 ? 1 : 0,
          $data: serialized,
        });
        upsertedCount += 1;
      }

      await db.execAsync('COMMIT');
      console.log(
        `Synced facilities offline storage (upserted ${upsertedCount}, skipped ${skippedCount}, deleted ${deletedCount})`,
      );
    } catch (innerError) {
      console.error('Error during full facilities sync:', innerError);
      try {
        await db.execAsync('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to rollback full facilities transaction:', rollbackError);
      }
      throw innerError;
    } finally {
      await deleteStatement.finalizeAsync();
      await upsertStatement.finalizeAsync();
    }
  } catch (error) {
    console.error('Error in saveFacilitiesFull:', error);
    throw error;
  }
};

interface FacilityRow {
  id: string;
  name: string;
  type: string;
  services: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  yakapAccredited: number;
  hours: string | null;
  photoUrl: string | null;
  lastUpdated: number;
  specialized_services: string | null;
  is_24_7: number | null;
  data: string;
}

export const getFacilities = async (): Promise<Facility[]> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const result = await db.getAllAsync<FacilityRow>('SELECT * FROM facilities');

    return result
      .map((row) => {
        try {
          const fullData = row.data ? JSON.parse(row.data) : {};
          return {
            ...fullData,
            id: row.id,
            name: row.name,
            type: row.type,
            services: row.services ? JSON.parse(row.services) : [],
            address: row.address,
            latitude: row.latitude,
            longitude: row.longitude,
            phone: row.phone,
            yakapAccredited: Boolean(row.yakapAccredited),
            hours: row.hours,
            photoUrl: row.photoUrl,
            specialized_services: row.specialized_services
              ? JSON.parse(row.specialized_services)
              : [],
            is_24_7: Boolean(row.is_24_7),
          };
        } catch (e) {
          console.error('Error parsing facility row:', e);
          return null;
        }
      })
      .filter((f): f is Facility => f !== null);
  } catch (error) {
    console.error('Error getting facilities:', error);
    throw error;
  }
};

export const getFacilityById = async (id: string): Promise<Facility | null> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const row = await db.getFirstAsync<FacilityRow>('SELECT * FROM facilities WHERE id = ?', [id]);

    if (!row) return null;

    const fullData = row.data ? JSON.parse(row.data) : {};
    return {
      ...fullData,
      id: row.id,
      name: row.name,
      type: row.type,
      services: row.services ? JSON.parse(row.services) : [],
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      phone: row.phone,
      yakapAccredited: Boolean(row.yakapAccredited),
      hours: row.hours,
      photoUrl: row.photoUrl,
      specialized_services: row.specialized_services ? JSON.parse(row.specialized_services) : [],
      is_24_7: Boolean(row.is_24_7),
    };
  } catch (error) {
    console.error('Error getting facility by ID:', error);
    throw error;
  }
};
