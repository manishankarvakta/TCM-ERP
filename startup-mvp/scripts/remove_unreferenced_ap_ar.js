const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Removing Unreferenced AP & AR Chart of Accounts (COAs)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Get all COA IDs referenced by Client or Supplier
  const clients = await prisma.client.findMany({ select: { chartOfAccountId: true } });
  const suppliers = await prisma.supplier.findMany({ select: { chartOfAccountId: true } });

  const referencedCoaIds = new Set([
    ...clients.map(c => c.chartOfAccountId).filter(Boolean),
    ...suppliers.map(s => s.chartOfAccountId).filter(Boolean)
  ]);
  console.log(`Current Client & Supplier referenced COAs: ${referencedCoaIds.size}`);

  // 2. Identify parent AR (1410) and AP (2110) account IDs
  const arParentId = 'coa_1782985565188_19f6692bcf7791a7'; // Accounts Receivable
  const apParentId = 'coa_1782985565322_d62625dd20a0c985'; // Accounts Payable

  // 3. Find all child accounts under AR / AP or matching AR- / AP- codes
  const candidateCoas = await prisma.chartOfAccount.findMany({
    where: {
      OR: [
        { parentId: arParentId },
        { parentId: apParentId },
        { code: { startsWith: 'AR-' } },
        { code: { startsWith: 'AP-' } }
      ]
    },
    select: { id: true, code: true, name: true, parentId: true }
  });

  console.log(`Found ${candidateCoas.length} total AP/AR sub-account entries.`);

  // Filter out any referenced by clients/suppliers or parent control accounts themselves
  const targetCoasToDelete = candidateCoas.filter(c => 
    !referencedCoaIds.has(c.id) &&
    c.id !== arParentId &&
    c.id !== apParentId &&
    c.code !== '1400' &&
    c.code !== '1410' &&
    c.code !== '2100' &&
    c.code !== '2110'
  );

  console.log(`Targeting ${targetCoasToDelete.length} unreferenced AP/AR COA records for deletion.`);

  const targetIds = targetCoasToDelete.map(c => c.id);

  // 4. Delete unreferenced AP/AR COAs
  console.log('\n⚡ Deleting unreferenced AP & AR COA records...');
  
  // Set parentId to null first to avoid self-reference issues
  await prisma.chartOfAccount.updateMany({
    where: { id: { in: targetIds } },
    data: { parentId: null }
  });

  const deleteResult = await prisma.chartOfAccount.deleteMany({
    where: { id: { in: targetIds } }
  });

  console.log(`  ✅ Deleted ${deleteResult.count} unreferenced AP & AR COA records.`);

  // 5. Verification
  console.log('\n🔍 Post-cleanup verification...');
  const remainingArChildren = await prisma.chartOfAccount.count({
    where: { parentId: arParentId }
  });
  const remainingApChildren = await prisma.chartOfAccount.count({
    where: { parentId: apParentId }
  });
  const totalCoaCount = await prisma.chartOfAccount.count();

  console.log(`  - Remaining sub-accounts under Accounts Receivable (1410): ${remainingArChildren}`);
  console.log(`  - Remaining sub-accounts under Accounts Payable (2110): ${remainingApChildren}`);
  console.log(`  - Total remaining ChartOfAccount records: ${totalCoaCount}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Cleanup Finished Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Fatal error during AP/AR removal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
