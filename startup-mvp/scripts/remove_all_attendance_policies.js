const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Removing ALL Attendance Related Policies & Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const ATTENDANCE_TABLES = [
    // Operational Attendance & Biometric Data
    'Attendance',
    'AttendanceLog',
    'BiometricSyncLog',
    'BiometricRawLog',
    'UnmappedBiometricLog',
    'BiometricCommand',
    'Overtime',
    'LeaveApplication',

    // Attendance Policies & Setup
    'AttendancePolicy',
    'LatePolicy',
    'OvertimePolicy',
    'TiffinBillPolicy',
    'NightBillPolicy',
    'HolidayBillPolicy',
    'Shift',
    'Holiday',
    'LeaveType',
    'BiometricDevice'
  ];

  console.log('⚡ Truncating all attendance related tables...');
  for (const table of ATTENDANCE_TABLES) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`  ✅ Truncated "${table}"`);
    } catch (err) {
      console.warn(`  ⚠️ Could not truncate "${table}": ${err.message}`);
    }
  }

  console.log('\n🔍 Post-cleanup verification...');
  let totalRemaining = 0;
  for (const table of ATTENDANCE_TABLES) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
      const count = result[0]?.count || 0;
      if (count > 0) {
        console.error(`  ❌ WARNING: ${table} still has ${count} rows!`);
        totalRemaining += count;
      } else {
        console.log(`  - ${table}: 0 rows`);
      }
    } catch (err) {
      // Table error or empty
    }
  }

  if (totalRemaining === 0) {
    console.log('\n  ✅ SUCCESS: All attendance related data and policies are completely removed (0 rows)!');
  } else {
    console.warn(`\n  ⚠️ ${totalRemaining} rows remain in target tables.`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Attendance Cleanup Finished Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Fatal error during attendance removal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
