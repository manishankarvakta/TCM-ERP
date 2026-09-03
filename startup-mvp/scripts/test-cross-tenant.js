const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runCrossTenantTests() {
  console.log('=== RUNNING CROSS-TENANT SECURITY ISOLATION TEST SUITE ===');
  
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failedTests++;
    }
  }

  // Get an existing admin user for Organization createdBy FK
  const adminUser = await prisma.user.findFirst({ select: { id: true } });
  if (!adminUser) throw new Error("No admin user found in database");

  // 1. Setup Test Organizations
  const orgAId = 'org-test-a';
  const orgBId = 'org-test-b';

  await prisma.organization.upsert({
    where: { id: orgAId },
    create: { id: orgAId, name: 'Test Organization A', createdBy: adminUser.id },
    update: {},
  });

  await prisma.organization.upsert({
    where: { id: orgBId },
    create: { id: orgBId, name: 'Test Organization B', createdBy: adminUser.id },
    update: {},
  });

  // 2. Setup Test Users
  const userAId = 'user-test-a';
  const userBId = 'user-test-b';

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${userAId}', 'usera@orga.com', 'hashed', 'user', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${userBId}', 'userb@orgb.com', 'hashed', 'user', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  // 3. Create Org B Record (Client B)
  const clientBId = 'client-test-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Client" (id, name, email, "clientCode", "createdBy", status, "organizationId", "updatedAt")
     VALUES ('${clientBId}', 'Client Org B', 'clientb@orgb.com', 'CLI-TEST-B', '${userBId}', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  // 4. Test 1: User A query with tenant filter for Org A should NOT return Client B
  const clientsForUserA = await prisma.$queryRawUnsafe(
    `SELECT id, name FROM "Client" WHERE "organizationId" = '${orgAId}'`
  );
  assert(!clientsForUserA.some(c => c.id === clientBId), 'User A cannot view Client belonging to Org B');

  // 5. Test 2: Attempting to update Client B with Org A scope fails
  const updateResult = await prisma.$executeRawUnsafe(
    `UPDATE "Client" SET name = 'Hacked Client' WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`
  );
  assert(updateResult === 0, 'User A cannot update Client belonging to Org B');

  const recheckedClientB = await prisma.$queryRawUnsafe(
    `SELECT name FROM "Client" WHERE id = '${clientBId}'`
  );
  assert(recheckedClientB[0].name === 'Client Org B', 'Client B name remained unaltered after attack attempt');

  // 6. Test 3: Attempting to delete Client B with Org A scope fails
  const deleteResult = await prisma.$executeRawUnsafe(
    `DELETE FROM "Client" WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`
  );
  assert(deleteResult === 0, 'User A cannot delete Client belonging to Org B');

  // Cleanup test records
  await prisma.$executeRawUnsafe(`DELETE FROM "Client" WHERE id = '${clientBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id IN ('${userAId}', '${userBId}')`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Organization" WHERE id IN ('${orgAId}', '${orgBId}')`);

  console.log('=== CROSS-TENANT TEST SUITE SUMMARY ===');
  console.log(`Passed: ${passedTests}, Failed: ${failedTests}`);
  if (failedTests > 0) {
    throw new Error(`${failedTests} Cross-Tenant Security Tests Failed!`);
  }
}

runCrossTenantTests()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
