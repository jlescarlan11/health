import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding ...');

  // Emergency Contacts
  const emergencyContacts = [
    {
      name: 'NCGH Emergency',
      phone: '(054) 473-3111',
      category: 'emergency',
      description: 'Naga City General Hospital Emergency',
      available24x7: true,
    },
    {
      name: 'NCMH Crisis Hotline',
      phone: '1553',
      category: 'mental_health',
      description: 'National Center for Mental Health Crisis Hotline',
      available24x7: true,
    },
    {
      name: 'Natasha Goulbourn Foundation',
      phone: '(02) 804-4673',
      category: 'mental_health',
      description: 'Hopeline Philippines',
      available24x7: true,
    },
  ];

  for (const contact of emergencyContacts) {
    const exists = await prisma.emergencyContact.findFirst({
      where: { name: contact.name },
    });
    if (!exists) {
      await prisma.emergencyContact.create({
        data: contact,
      });
      console.log(`Created emergency contact: ${contact.name}`);
    } else {
      console.log(`Emergency contact already exists: ${contact.name}`);
    }
  }

  // Placeholder Symptoms
  const symptoms = [
    {
      name: 'Fever',
      category: 'common',
      keywords: ['hot', 'temperature', 'chills'],
      red_flags: ['Difficulty breathing', 'Confusion', 'Seizure'],
      recommended_care: 'self_care',
      follow_up_questions: ['How high is the fever?', 'How long have you had it?'],
    },
    {
      name: 'Chest Pain',
      category: 'emergency',
      keywords: ['heart', 'pressure', 'tightness'],
      red_flags: ['Radiating pain to arm', 'Shortness of breath', 'Sweating'],
      recommended_care: 'emergency',
      follow_up_questions: ['Is the pain crushing?', 'Does it move to your jaw or arm?'],
    },
    {
      name: 'Cough',
      category: 'common',
      keywords: ['throat', 'phlegm', 'dry'],
      red_flags: ['Coughing up blood', 'Difficulty breathing'],
      recommended_care: 'health_center',
      follow_up_questions: ['Is it dry or productive?', 'How long have you been coughing?'],
    },
  ];

  for (const symptom of symptoms) {
    const exists = await prisma.symptom.findFirst({
      where: { name: symptom.name },
    });
    if (!exists) {
      await prisma.symptom.create({
        data: symptom,
      });
      console.log(`Created symptom: ${symptom.name}`);
    } else {
      console.log(`Symptom already exists: ${symptom.name}`);
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
