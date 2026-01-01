import * as SQLite from 'expo-sqlite';
import { Facility, EmergencyContact } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
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

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export const saveFacilities = async (facilities: Facility[]) => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  const timestamp = Date.now();

  try {
    await db.withTransactionAsync(async () => {
      const statement = await db!.prepareAsync(
        `INSERT OR REPLACE INTO facilities (id, name, type, services, address, latitude, longitude, phone, yakapAccredited, hours, photoUrl, lastUpdated, data) VALUES ($id, $name, $type, $services, $address, $latitude, $longitude, $phone, $yakapAccredited, $hours, $photoUrl, $lastUpdated, $data)`
      );

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
          $data: JSON.stringify(facility)
        });
      }
      
      await statement.finalizeAsync();
    });
    console.log(`Saved ${facilities.length} facilities to offline storage`);
  } catch (error) {
    console.error('Error saving facilities:', error);
    throw error;
  }
};

export const getFacilities = async (): Promise<Facility[]> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const result = await db.getAllAsync<any>('SELECT * FROM facilities');
    
    return result.map(row => {
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
          // We can attach metadata if needed, but Facility type doesn't have it yet.
          // keeping it clean to return Facility objects.
        };
      } catch (e) {
        console.error('Error parsing facility row:', e);
        return null;
      }
    }).filter((f): f is Facility => f !== null);
  } catch (error) {
    console.error('Error getting facilities:', error);
    throw error;
  }
};

export const getFacilityById = async (id: string): Promise<Facility | null> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const row = await db.getFirstAsync<any>('SELECT * FROM facilities WHERE id = ?', [id]);
    
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
    };
  } catch (error) {
    console.error('Error getting facility by ID:', error);
    throw error;
  }
};

export const saveEmergencyContacts = async (contacts: EmergencyContact[]) => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  const timestamp = Date.now();

  try {
    await db.withTransactionAsync(async () => {
      const statement = await db!.prepareAsync(
        `INSERT OR REPLACE INTO emergency_contacts (id, name, category, phone, available24x7, description, lastUpdated, data) VALUES ($id, $name, $category, $phone, $available24x7, $description, $lastUpdated, $data)`
      );

      for (const contact of contacts) {
        await statement.executeAsync({
          $id: contact.id,
          $name: contact.name,
          $category: contact.category,
          $phone: contact.phone,
          $available24x7: contact.available24x7 ? 1 : 0,
          $description: contact.description || null,
          $lastUpdated: timestamp,
          $data: JSON.stringify(contact)
        });
      }
      
      await statement.finalizeAsync();
    });
    console.log(`Saved ${contacts.length} emergency contacts to offline storage`);
  } catch (error) {
    console.error('Error saving emergency contacts:', error);
    throw error;
  }
};

export const getEmergencyContacts = async (): Promise<EmergencyContact[]> => {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  try {
    const result = await db.getAllAsync<any>('SELECT * FROM emergency_contacts');
    
    return result.map(row => {
      try {
        const fullData = row.data ? JSON.parse(row.data) : {};
        return {
          ...fullData,
          id: row.id,
          name: row.name,
          category: row.category,
          phone: row.phone,
          available24x7: Boolean(row.available24x7),
          description: row.description,
        };
      } catch (e) {
        console.error('Error parsing emergency contact row:', e);
        return null;
      }
    }).filter((c): c is EmergencyContact => c !== null);
  } catch (error) {
    console.error('Error getting emergency contacts:', error);
    throw error;
  }
};