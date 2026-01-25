import prisma from '../src/lib/prisma';

async function validate() {
  console.log('Validating Facility database consistency...');
  try {
    const facilities = await prisma.facility.findMany({
      take: 1,
    });
    console.log('✅ Successfully queried Facility table.');
    console.log('Columns retrieved:', Object.keys(facilities[0] || {}).join(', '));

    // Check for specifically missing columns
    if (facilities.length > 0) {
      const first = facilities[0];
      const required = ['capacity', 'live_metrics', 'busy_patterns'];
      const missing = required.filter((col) => !(col in first));

      if (missing.length > 0) {
        console.error('❌ Still missing columns in retrieved object:', missing.join(', '));
        process.exit(1);
      } else {
        console.log('✅ All requested columns are present in the result set.');
      }
    } else {
      console.log(
        'ℹ️ No facilities found to verify column presence in result, but query succeeded.',
      );
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

validate();
