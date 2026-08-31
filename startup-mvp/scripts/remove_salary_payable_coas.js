const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Removing Individual Salary Payable COAs & Updating Employees');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Unlink salaryPayableAccountId and advanceAccountId from all Employee records
  console.log('⚡ Unlinking salary account references from Employee records...');
  const updateResult = await prisma.employee.updateMany({
    data: {
      salaryPayableAccountId: null,
      advanceAccountId: null
    }
  });
  console.log(`  ✅ Cleared salary account links on ${updateResult.count} Employee profiles.`);

  // 2. Identify all individual Salary Payable COAs (SP-2026-xxxx or under 2130 Salaries Payable)
  const salariesPayableParentId = 'coa_1782985565332_cf320bdc84b0ce5e'; // 2130 Salaries Payable parent control account

  const spCoas = await prisma.chartOfAccount.findMany({
    where: {
      OR: [
        { parentId: salariesPayableParentId },
        { code: { startsWith: 'SP-' } }
      ]
    },
    select: { id: true, code: true, name: true }
  });

  // Filter out the main parent control account 2130 Salaries Payable itself
  const targetIdsToDelete = spCoas
    .filter(c => c.id !== salariesPayableParentId && c.code !== '2130')
    .map(c => c.id);

  console.log(`\nTargeting ${targetIdsToDelete.length} individual Salary Payable COA records for deletion.`);

  // 3. Delete the individual Salary Payable COAs
  console.log('\n⚡ Deleting individual Salary Payable COA records...');
  
  // Clear parentId first
  await prisma.chartOfAccount.updateMany({
    where: { id: { in: targetIdsToDelete } },
    data: { parentId: null }
  });

  const deleteResult = await prisma.chartOfAccount.deleteMany({
    where: { id: { in: targetIdsToDelete } }
  });

  console.log(`  ✅ Deleted ${deleteResult.count} individual Salary Payable COA records.`);

  // 4. Verification
  console.log('\n🔍 Post-cleanup verification...');
  const remainingEmpSalaryLinks = await prisma.employee.count({
    where: { salaryPayableAccountId: { not: null } }
  });
  const remainingSpChildren = await prisma.chartOfAccount.count({
    where: { parentId: salariesPayableParentId }
  });
  const totalCoaCount = await prisma.chartOfAccount.count();

  console.log(`  - Employees with linked salary payable account: ${remainingEmpSalaryLinks}`);
  console.log(`  - Remaining sub-accounts under 2130 Salaries Payable: ${remainingSpChildren}`);
  console.log(`  - Total remaining ChartOfAccount records in DB: ${totalCoaCount}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Salary Payable Cleanup Finished Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Fatal error during Salary Payable cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
