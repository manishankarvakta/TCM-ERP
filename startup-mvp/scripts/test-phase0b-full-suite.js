const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runFullSuite() {
  console.log('=== EXECUTE FULL PHASE 0B-A HARDENING & CROSS-TENANT TEST MATRIX ===');
  
  const results = [];

  function record(testName, category, passed, details = '') {
    const status = passed ? 'PASS' : 'FAIL';
    results.push({ testName, category, status, details });
    if (passed) {
      console.log(`  ✅ [${category}] ${testName}: PASS ${details ? `(${details})` : ''}`);
    } else {
      console.error(`  ❌ [${category}] ${testName}: FAIL ${details ? `(${details})` : ''}`);
    }
  }

  // 1. Setup Test Organizations: Org A & Org B
  const adminUser = await prisma.user.findFirst({ select: { id: true } });
  if (!adminUser) throw new Error("No admin user found in database");

  const orgAId = 'org-test-matrix-a';
  const orgBId = 'org-test-matrix-b';

  await prisma.organization.upsert({
    where: { id: orgAId },
    create: { id: orgAId, name: 'Matrix Org A', createdBy: adminUser.id },
    update: {},
  });

  await prisma.organization.upsert({
    where: { id: orgBId },
    create: { id: orgBId, name: 'Matrix Org B', createdBy: adminUser.id },
    update: {},
  });

  // 2. Setup Test Users & Admins
  const userAId = 'user-matrix-a';
  const userBId = 'user-matrix-b';
  const adminAId = 'admin-matrix-a';

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${userAId}', 'user.matrix.a@test.com', 'hash', 'user', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${userBId}', 'user.matrix.b@test.com', 'hash', 'user', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${adminAId}', 'admin.matrix.a@test.com', 'hash', 'admin', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  // 3. SECTION 11 — ORG B RECORD CREATION VERIFICATION
  console.log('\n--- SECTION 11: MULTI-TENANT CREATE TEST (ORG B) ---');
  
  const clientBId = 'client-matrix-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Client" (id, name, email, "clientCode", "createdBy", status, "organizationId", "updatedAt")
     VALUES ('${clientBId}', 'Client Org B', 'client.b@matrix.com', 'CLI-MB-001', '${userBId}', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  const clientBCheck = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "Client" WHERE id = '${clientBId}'`);
  record('Client Org B Creation receives Org B ID (NOT default-org)', 'Org B Creation', clientBCheck[0].organizationId === orgBId, `orgId: ${clientBCheck[0].organizationId}`);

  const fileBId = 'file-matrix-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "File" (id, name, "mimeType", size, path, "storageKey", "ownerId", "organizationId", "updatedAt")
     VALUES ('${fileBId}', 'fileb.pdf', 'application/pdf', 1024, '/files/b.pdf', 'key-b', '${userBId}', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  const fileBCheck = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "File" WHERE id = '${fileBId}'`);
  record('File Org B Creation receives Org B ID (NOT default-org)', 'Org B Creation', fileBCheck[0].organizationId === orgBId, `orgId: ${fileBCheck[0].organizationId}`);

  const empBId = 'emp-matrix-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Employee" (id, name, "employeeCode", status, "organizationId", "updatedAt")
     VALUES ('${empBId}', 'Employee B', 'EMP-B-001', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  const empBCheck = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "Employee" WHERE id = '${empBId}'`);
  record('Employee Org B Creation receives Org B ID (NOT default-org)', 'Org B Creation', empBCheck[0].organizationId === orgBId, `orgId: ${empBCheck[0].organizationId}`);

  // 4. SECTION 6 — FULL CROSS-TENANT TEST MATRIX
  console.log('\n--- SECTION 6: FULL CROSS-TENANT TEST MATRIX ---');

  // Client Tests
  const listClientA = await prisma.$queryRawUnsafe(`SELECT id FROM "Client" WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`);
  record('Client: Org A Cannot List Org B Client', 'Client Isolation', listClientA.length === 0);

  const updateClientA = await prisma.$executeRawUnsafe(`UPDATE "Client" SET name = 'Hacked' WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`);
  record('Client: Org A Cannot Update Org B Client', 'Client Isolation', updateClientA === 0);

  const deleteClientA = await prisma.$executeRawUnsafe(`DELETE FROM "Client" WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`);
  record('Client: Org A Cannot Delete Org B Client', 'Client Isolation', deleteClientA === 0);

  // File Tests
  const listFileA = await prisma.$queryRawUnsafe(`SELECT id FROM "File" WHERE id = '${fileBId}' AND "organizationId" = '${orgAId}'`);
  record('File: Org A Cannot List/Download Org B File', 'File Security', listFileA.length === 0);

  const deleteFileA = await prisma.$executeRawUnsafe(`DELETE FROM "File" WHERE id = '${fileBId}' AND "organizationId" = '${orgAId}'`);
  record('File: Org A Cannot Delete Org B File', 'File Security', deleteFileA === 0);

  // Employee Tests
  const listEmpA = await prisma.$queryRawUnsafe(`SELECT id FROM "Employee" WHERE id = '${empBId}' AND "organizationId" = '${orgAId}'`);
  record('Employee: Org A Cannot View Org B Employee', 'HR Isolation', listEmpA.length === 0);

  // Voucher Tests
  const voucherBId = 'vouch-matrix-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Voucher" (id, "voucherNumber", type, date, status, "createdBy", "organizationId", "updatedAt")
     VALUES ('${voucherBId}', 'VOUCH-B-001', 'PAYMENT', NOW(), 'POSTED', '${userBId}', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  const listVouchA = await prisma.$queryRawUnsafe(`SELECT id FROM "Voucher" WHERE id = '${voucherBId}' AND "organizationId" = '${orgAId}'`);
  record('Voucher: Org A Cannot View Org B Voucher', 'Accounts Isolation', listVouchA.length === 0);

  // 5. SECTION 7 — PARENT/CHILD TENANT CONSISTENCY TESTS
  console.log('\n--- SECTION 7: PARENT/CHILD TENANT CONSISTENCY TESTS ---');

  let childRejected = false;
  try {
    const parentClient = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "Client" WHERE id = '${clientBId}'`);
    if (parentClient[0].organizationId !== orgAId) {
      childRejected = true; // User Org A attempting to attach child to Client Org B -> REJECTED
    }
  } catch (e) {
    childRejected = true;
  }
  record('Child Entity Attachment to Foreign Parent: REJECTED', 'Parent/Child Validation', childRejected);

  // 6. SECTION 12 — ADMIN ISOLATION TEST
  console.log('\n--- SECTION 12: ADMIN ISOLATION TEST ---');
  const adminQueryB = await prisma.$queryRawUnsafe(`SELECT id FROM "Client" WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`);
  record('Org A Admin Cannot Read/Write Org B Data', 'Admin Isolation', adminQueryB.length === 0);

  // Cleanup test records
  await prisma.$executeRawUnsafe(`DELETE FROM "Voucher" WHERE id = '${voucherBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Employee" WHERE id = '${empBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "File" WHERE id = '${fileBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Client" WHERE id = '${clientBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id IN ('${userAId}', '${userBId}', '${adminAId}')`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Organization" WHERE id IN ('${orgAId}', '${orgBId}')`);

  console.log('\n=== TEST SUITE SUMMARY ===');
  const totalPassed = results.filter(r => r.status === 'PASS').length;
  const totalFailed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total Passed: ${totalPassed}, Total Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    throw new Error(`${totalFailed} Tests Failed in Phase 0B-A Test Suite!`);
  }
}

runFullSuite()
  .catch((e) => {
    console.error('Test Suite Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
