import * as dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/lib/prisma';

async function main() {
  console.log('Migration of fever details to specific_details has been COMPLETED.');
  console.log('The legacy columns have been removed from the schema.');
  
  /* 
  // LEGACY MIGRATION LOGIC (Preserved for reference)
  console.log('Starting migration of fever details to specific_details...');

  const profiles = await prisma.assessmentProfile.findMany({
    where: {
      OR: [
        { fever_duration: { not: null } },
        { fever_max_temp: { not: null } },
        { fever_antipyretic_response: { not: null } },
        { fever_hydration_ability: { not: null } },
        { fever_functional_status: { not: null } },
        { fever_red_flags_checklist: { not: null } },
      ],
    },
  });

  console.log(`Found ${profiles.length} profiles to migrate.`);

  for (const profile of profiles) {
    const feverDetails: Record<string, any> = {
      fever_duration: profile.fever_duration,
      fever_max_temp: profile.fever_max_temp,
      fever_antipyretic_response: profile.fever_antipyretic_response,
      fever_hydration_ability: profile.fever_hydration_ability,
      fever_functional_status: profile.fever_functional_status,
      fever_red_flags_checklist: profile.fever_red_flags_checklist,
    };

    // Clean up nulls for cleaner JSON if desired, or keep them to represent explicit unknown
    // Here we keep them as per the sanitization logic.

    await prisma.assessmentProfile.update({
      where: { id: profile.id },
      data: {
        specific_details: feverDetails,
      },
    });
  }

  console.log('Migration completed successfully.');
  */
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
