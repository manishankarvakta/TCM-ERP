const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🛍️ Creating & Linking Chart of Account for Walkway Customer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Find Walkway Customer Client
  let walkwayClient = await prisma.client.findFirst({
    where: {
      OR: [
        { name: { contains: 'walkway', mode: 'insensitive' } },
        { name: { contains: 'walk-in', mode: 'insensitive' } }
      ]
    }
  });

  if (!walkwayClient) {
    console.log('No Walkway Customer client found in DB. Creating default Walkway Customer...');
    const adminUser = await prisma.user.findFirst();
    walkwayClient = await prisma.client.create({
      data: {
        name: 'Walkway Customer',
        email: 'walkway@customer.local',
        phone: '00000000000',
        clientType: 'regular',
        status: 'active',
        createdBy: adminUser ? adminUser.id : 'system'
      }
    });
  }

  console.log(`Walkway Customer Client ID: ${walkwayClient.id} | Name: ${walkwayClient.name}`);

  // 2. Check if AR parent COA (1410) exists
  const arParentCoa = await prisma.chartOfAccount.findUnique({
    where: { code: '1410' }
  });

  if (!arParentCoa) {
    throw new Error('Accounts Receivable parent COA (code 1410) not found in database!');
  }

  // 3. Create or find Chart of Account for Walkway Customer
  let walkwayCoa = await prisma.chartOfAccount.findFirst({
    where: {
      OR: [
        { code: 'AR-WALKWAY' },
        { name: 'AR - Walkway Customer' }
      ]
    }
  });

  if (!walkwayCoa) {
    console.log('Creating new Chart of Account "AR - Walkway Customer"...');
    walkwayCoa = await prisma.chartOfAccount.create({
      data: {
        code: 'AR-WALKWAY',
        name: 'AR - Walkway Customer',
        type: 'ASSET',
        parentId: arParentCoa.id,
        description: 'Accounts Receivable account for Walkway Customer',
        status: 'active',
        createdBy: walkwayClient.createdBy
      }
    });
    console.log(`  ✅ Created COA "${walkwayCoa.name}" (Code: ${walkwayCoa.code}, ID: ${walkwayCoa.id})`);
  } else {
    console.log(`Existing COA found: "${walkwayCoa.name}" (ID: ${walkwayCoa.id})`);
  }

  // 4. Link Walkway Customer Client to this COA
  await prisma.client.update({
    where: { id: walkwayClient.id },
    data: { chartOfAccountId: walkwayCoa.id }
  });
  console.log(`  ✅ Linked Client "${walkwayClient.name}" to COA "${walkwayCoa.name}" (chartOfAccountId: ${walkwayCoa.id})`);

  // 5. Verification
  console.log('\n🔍 Post-creation verification...');
  const updatedClient = await prisma.client.findUnique({
    where: { id: walkwayClient.id },
    include: { ChartOfAccount: true }
  });

  console.log('Updated Client details:');
  console.log(`  - ID: ${updatedClient.id}`);
  console.log(`  - Name: ${updatedClient.name}`);
  console.log(`  - Linked COA ID: ${updatedClient.chartOfAccountId}`);
  console.log(`  - Linked COA Name: ${updatedClient.ChartOfAccount?.name}`);
  console.log(`  - Linked COA Code: ${updatedClient.ChartOfAccount?.code}`);
  console.log(`  - COA Parent: ${updatedClient.ChartOfAccount?.parentId} (1410 Accounts Receivable)`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Walkway Customer COA Creation & Link Successful!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Fatal error during Walkway COA creation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
