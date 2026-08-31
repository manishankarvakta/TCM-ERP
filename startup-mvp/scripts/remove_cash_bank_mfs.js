const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Removing ALL Cash, Bank, and MFS Accounts & related COAs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Fetch all CashBankAccount entries and their chartOfAccountId
  const cbaEntries = await prisma.cashBankAccount.findMany({
    select: { id: true, chartOfAccountId: true, type: true }
  });
  console.log(`Found ${cbaEntries.length} CashBankAccount records.`);

  const linkedCoaIds = cbaEntries.map(c => c.chartOfAccountId).filter(Boolean);

  // 2. Also find COAs by code pattern (11xx, 12xx, 13xx) or names (Bank Accounts, Digital Wallets, Cash Hand, etc.)
  const additionalCoas = await prisma.chartOfAccount.findMany({
    where: {
      OR: [
        { code: { startsWith: '11' } }, // Cash accounts
        { code: { startsWith: '12' } }, // Bank accounts
        { code: { startsWith: '13' } }, // MFS / Digital Wallets
        { id: { in: linkedCoaIds } }
      ]
    },
    select: { id: true, code: true, name: true }
  });

  // Exclude 'Current Assets' (1100) if we want to keep the top-level group, or include sub-accounts under it
  const coaIdsToDelete = additionalCoas
    .filter(c => c.code !== '1100') // keep parent group 1100 Current Assets if needed, but remove 1110, 1111, 1112, 1113, 1114, 1120, 1200, 1201..1250, 1300, 1310..1333
    .map(c => c.id);

  console.log(`Targeting ${coaIdsToDelete.length} ChartOfAccount records for deletion.`);

  // 3. Delete all CashBankAccount records
  console.log('\n⚡ Truncating CashBankAccount table...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CashBankAccount" CASCADE;`);
  console.log('  ✅ CashBankAccount table truncated.');

  // 4. Delete related ChartOfAccount records
  console.log('\n⚡ Deleting related ChartOfAccount records...');
  // Handle foreign key self-references in ChartOfAccount by updating parentId to null first
  await prisma.chartOfAccount.updateMany({
    where: { id: { in: coaIdsToDelete } },
    data: { parentId: null }
  });

  const deletedCoa = await prisma.chartOfAccount.deleteMany({
    where: { id: { in: coaIdsToDelete } }
  });
  console.log(`  ✅ Deleted ${deletedCoa.count} ChartOfAccount records.`);

  // 5. Verification
  console.log('\n🔍 Post-cleanup verification...');
  const cbaCount = await prisma.cashBankAccount.count();
  const totalCoaCount = await prisma.chartOfAccount.count();

  console.log(`  - Remaining CashBankAccount count: ${cbaCount}`);
  console.log(`  - Remaining ChartOfAccount count: ${totalCoaCount}`);

  if (cbaCount === 0) {
    console.log('\n  ✅ SUCCESS: All Cash, Bank, and MFS accounts and related COAs have been removed!');
  } else {
    console.warn(`\n  ⚠️ ${cbaCount} CashBankAccount records remain.`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Cleanup Finished!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Fatal error during removal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
