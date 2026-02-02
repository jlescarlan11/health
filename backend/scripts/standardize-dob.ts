import * as dotenv from 'dotenv';
import path from 'path';
import prisma from '../src/lib/prisma';
import { formatIsoDate, parseIsoDateString } from '../src/utils/dateUtils';

// Load .env manual to ensure DATABASE_URL is available for prisma scripts
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const normalizeUserDob = async () => {
  console.log('Starting DOB standardization...');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      dateOfBirth: true,
    },
  });

  let updated = 0;
  for (const user of users) {
    const normalizedIso = formatIsoDate(user.dateOfBirth);
    const normalizedDate = parseIsoDateString(normalizedIso);
    if (!normalizedDate) {
      console.warn(`Skipping user ${user.id}: unable to re-parse ${normalizedIso}`);
      continue;
    }

    const hasTimePortion =
      user.dateOfBirth.getUTCHours() !== 0 ||
      user.dateOfBirth.getUTCMinutes() !== 0 ||
      user.dateOfBirth.getUTCSeconds() !== 0 ||
      user.dateOfBirth.getUTCMilliseconds() !== 0;

    if (!hasTimePortion) {
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { dateOfBirth: normalizedDate },
    });
    updated += 1;
  }

  console.log(`DOB standardization complete. ${updated} records updated out of ${users.length} users.`);
};

normalizeUserDob()
  .catch((error) => {
    console.error('Failed to standardize date of birth values:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
