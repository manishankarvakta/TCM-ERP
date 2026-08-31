const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Removing ALL Employee Records & Related Data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Count before deletion
  const empCountBefore = await prisma.employee.count();
  const deviceMapCountBefore = await prisma.employeeDeviceMap.count();

  console.log(`Pre-cleanup audit: ${empCountBefore} Employees, ${deviceMapCountBefore} EmployeeDeviceMap entries.`);

  // 2. Truncate EmployeeDeviceMap & Employee tables
  console.log('\n⚡ Truncating EmployeeDeviceMap & Employee tables...');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "EmployeeDeviceMap" CASCADE;`);
  console.log('  ✅ EmployeeDeviceMap table truncated.');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Employee" CASCADE;`);
  console.log('  ✅ Employee table truncated.');

  // 3. Post-cleanup verification
  console.log('\n🔍 Post-cleanup verification...');
  const empCountAfter = await prisma.employee.count();
  const deviceMapCountAfter = await prisma.employeeDeviceMap.count();
  const userCount = await prisma.user.count();
  const totalCoaCount = await prisma.chartOfAccount.count();

  console.log(`  - Remaining Employee count: ${empCountAfter}`);
  console.log(`  - Remaining EmployeeDeviceMap count: ${deviceMapCountAfter}`);
  console.log(`  - Preserved User count: ${userCount}`);
  console.log(`  - Preserved ChartOfAccount count: ${totalCoaCount}`);

  if (empCountAfter === 0 && deviceMapCountAfter === 0) {
    console.log('\n  ✅ SUCCESS: All Employee records and related data have been removed!');
  } else {
    console.warn(`\n  ⚠️ ${empCountAfter} Employee records remain.`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Employee Cleanup Finished Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Fatal error during employee removal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
