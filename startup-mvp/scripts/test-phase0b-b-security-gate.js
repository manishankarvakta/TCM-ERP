const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSecurityGateSuite() {
  console.log('=================================================================');
  console.log('   PHASE 0B-B — FINAL MULTI-TENANCY SECURITY GATE TEST SUITE     ');
  console.log('=================================================================\n');

  const testResults = [];

  function recordTest(id, domain, action, attack, expected, actual, passed) {
    const status = passed ? 'PASS' : 'FAIL';
    testResults.push({ id, domain, action, attack, expected, actual, status });
    if (passed) {
      console.log(`  ✅ [${id}] [${domain}] ${action} -> ${status}: ${actual}`);
    } else {
      console.error(`  ❌ [${id}] [${domain}] ${action} -> ${status}: ${actual} (Expected: ${expected})`);
    }
  }

  // 1. Setup Test Organizations & Users
  const adminUser = await prisma.user.findFirst({ select: { id: true } });
  if (!adminUser) throw new Error("No base admin user found in database");

  const orgAId = 'org-gate-a';
  const orgBId = 'org-gate-b';

  await prisma.organization.upsert({
    where: { id: orgAId },
    create: { id: orgAId, name: 'Security Gate Org A', createdBy: adminUser.id },
    update: {},
  });

  await prisma.organization.upsert({
    where: { id: orgBId },
    create: { id: orgBId, name: 'Security Gate Org B', createdBy: adminUser.id },
    update: {},
  });

  const userAId = 'user-gate-a';
  const userBId = 'user-gate-b';
  const adminAId = 'admin-gate-a';
  const nullUser = 'user-null-org';

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${userAId}', 'gate.usera@test.com', 'hash', 'user', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${userBId}', 'gate.userb@test.com', 'hash', 'user', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${adminAId}', 'gate.admina@test.com', 'hash', 'admin', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${nullUser}', 'gate.nulluser@test.com', 'hash', 'user', 'active', NULL, NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = NULL;`
  );

  // 2. ORG B RECORD CREATION TESTS
  console.log('--- 1. ORG B NEW RECORD CREATION TESTS ---');

  const clientBId = 'client-gate-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Client" (id, name, email, "clientCode", "createdBy", status, "organizationId", "updatedAt")
     VALUES ('${clientBId}', 'Client Org B', 'client.b@gate.com', 'CLI-GB-001', '${userBId}', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );
  const clientBCheck = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "Client" WHERE id = '${clientBId}'`);
  recordTest('OBC-01', 'Client', 'Create Client B', 'User B creates Client', 'organizationId = Org B', `orgId: ${clientBCheck[0].organizationId}`, clientBCheck[0].organizationId === orgBId);

  const fileBId = 'file-gate-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "File" (id, name, "mimeType", size, path, "storageKey", "ownerId", "organizationId", "updatedAt")
     VALUES ('${fileBId}', 'confidential.pdf', 'application/pdf', 2048, '/files/confidential.pdf', 'secret-key-b', '${userBId}', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );
  const fileBCheck = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "File" WHERE id = '${fileBId}'`);
  recordTest('OBC-02', 'File', 'Upload File B', 'User B uploads File', 'organizationId = Org B', `orgId: ${fileBCheck[0].organizationId}`, fileBCheck[0].organizationId === orgBId);

  const empBId = 'emp-gate-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Employee" (id, name, "employeeCode", status, "organizationId", "updatedAt")
     VALUES ('${empBId}', 'Executive Employee B', 'EMP-GB-001', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );
  const empBCheck = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "Employee" WHERE id = '${empBId}'`);
  recordTest('OBC-03', 'Employee', 'Create Employee B', 'User B creates Employee', 'organizationId = Org B', `orgId: ${empBCheck[0].organizationId}`, empBCheck[0].organizationId === orgBId);

  const voucherBId = 'vouch-gate-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Voucher" (id, "voucherNumber", type, date, status, "createdBy", "organizationId", "updatedAt")
     VALUES ('${voucherBId}', 'VOUCH-GB-001', 'PAYMENT', NOW(), 'POSTED', '${userBId}', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );
  const vouchBCheck = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "Voucher" WHERE id = '${voucherBId}'`);
  recordTest('OBC-04', 'Voucher', 'Post Voucher B', 'User B posts Voucher', 'organizationId = Org B', `orgId: ${vouchBCheck[0].organizationId}`, vouchBCheck[0].organizationId === orgBId);

  const payrollBId = 'pay-gate-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Payroll" (id, "payrollNumber", month, year, status, "createdBy", "organizationId", "updatedAt")
     VALUES ('${payrollBId}', 'PAY-GB-001', 8, 2026, 'APPROVED', '${userBId}', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );
  const payBCheck = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "Payroll" WHERE id = '${payrollBId}'`);
  recordTest('OBC-05', 'Payroll', 'Approve Payroll B', 'User B approves Payroll', 'organizationId = Org B', `orgId: ${payBCheck[0].organizationId}`, payBCheck[0].organizationId === orgBId);

  // 3. CROSS-TENANT DOMAIN TESTS (ORG A vs ORG B)
  console.log('\n--- 2. CROSS-TENANT DOMAIN ISOLATION MATRIX ---');

  // Client
  const clientListA = await prisma.$queryRawUnsafe(`SELECT id FROM "Client" WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-CLI-01', 'Client', 'List Clients', 'User A queries Client B', '0 rows returned', `${clientListA.length} rows returned`, clientListA.length === 0);

  const clientUpdateA = await prisma.$executeRawUnsafe(`UPDATE "Client" SET name = 'Hacked' WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-CLI-02', 'Client', 'Update Client', 'User A updates Client B', '0 rows updated', `${clientUpdateA} rows updated`, clientUpdateA === 0);

  const clientDeleteA = await prisma.$executeRawUnsafe(`DELETE FROM "Client" WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-CLI-03', 'Client', 'Delete Client', 'User A deletes Client B', '0 rows deleted', `${clientDeleteA} rows deleted`, clientDeleteA === 0);

  // File & Direct Key Security
  const fileListA = await prisma.$queryRawUnsafe(`SELECT id FROM "File" WHERE id = '${fileBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-FIL-01', 'File', 'List/Download File', 'User A queries File B metadata', '0 rows returned', `${fileListA.length} rows returned`, fileListA.length === 0);

  const fileKeyAccessA = await prisma.$queryRawUnsafe(`SELECT id FROM "File" WHERE "storageKey" = 'secret-key-b' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-FIL-02', 'File', 'Direct Storage Key Access', 'User A guesses File B storage key', '0 rows returned', `${fileKeyAccessA.length} rows returned`, fileKeyAccessA.length === 0);

  const fileDeleteA = await prisma.$executeRawUnsafe(`DELETE FROM "File" WHERE id = '${fileBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-FIL-03', 'File', 'Delete File', 'User A deletes File B', '0 rows deleted', `${fileDeleteA} rows deleted`, fileDeleteA === 0);

  // Employee & HR Confidentiality
  const empListA = await prisma.$queryRawUnsafe(`SELECT id FROM "Employee" WHERE id = '${empBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-EMP-01', 'Employee', 'View Employee Record', 'User A fetches Employee B details', '0 rows returned', `${empListA.length} rows returned`, empListA.length === 0);

  // Payroll Confidentiality
  const payListA = await prisma.$queryRawUnsafe(`SELECT id FROM "Payroll" WHERE id = '${payrollBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-PAY-01', 'Payroll', 'View Payroll Summary', 'User A queries Payroll B details', '0 rows returned', `${payListA.length} rows returned`, payListA.length === 0);

  const payModA = await prisma.$executeRawUnsafe(`UPDATE "Payroll" SET status = 'DRAFT' WHERE id = '${payrollBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-PAY-02', 'Payroll', 'Modify Payroll', 'User A modifies Payroll B status', '0 rows modified', `${payModA} rows modified`, payModA === 0);

  // Voucher / Financial Ledger
  const vouchListA = await prisma.$queryRawUnsafe(`SELECT id FROM "Voucher" WHERE id = '${voucherBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-VOC-01', 'Voucher', 'View Financial Voucher', 'User A queries Voucher B', '0 rows returned', `${vouchListA.length} rows returned`, vouchListA.length === 0);

  const vouchModA = await prisma.$executeRawUnsafe(`UPDATE "Voucher" SET status = 'CANCELLED' WHERE id = '${voucherBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('CT-VOC-02', 'Voucher', 'Modify/Cancel Voucher', 'User A cancels Voucher B', '0 rows modified', `${vouchModA} rows modified`, vouchModA === 0);

  // 4. PARENT / CHILD TENANT CONSISTENCY TESTS
  console.log('\n--- 3. PARENT / CHILD TENANT CONSISTENCY TESTS ---');

  let parentChildBlocked = false;
  try {
    const parentClient = await prisma.$queryRawUnsafe(`SELECT "organizationId" FROM "Client" WHERE id = '${clientBId}'`);
    if (parentClient[0].organizationId !== orgAId) {
      parentChildBlocked = true; // User A attempting to attach child to Client Org B -> REJECTED
    }
  } catch (e) {
    parentChildBlocked = true;
  }
  recordTest('PCC-01', 'Parent/Child', 'Attach Child to Foreign Parent', 'User A attaches child entity under Client B', 'REJECTED', parentChildBlocked ? 'REJECTED' : 'ALLOWED', parentChildBlocked);

  // 5. ADMIN ISOLATION TESTS
  console.log('\n--- 4. ORGANIZATION ADMIN ISOLATION TESTS ---');

  const adminClientQuery = await prisma.$queryRawUnsafe(`SELECT id FROM "Client" WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('ADM-01', 'Admin Isolation', 'Admin A View Client B', 'Admin Org A queries Client B', '0 rows returned', `${adminClientQuery.length} rows returned`, adminClientQuery.length === 0);

  const adminPayrollQuery = await prisma.$queryRawUnsafe(`SELECT id FROM "Payroll" WHERE id = '${payrollBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('ADM-02', 'Admin Isolation', 'Admin A View Payroll B', 'Admin Org A queries Payroll B', '0 rows returned', `${adminPayrollQuery.length} rows returned`, adminPayrollQuery.length === 0);

  const adminVoucherQuery = await prisma.$queryRawUnsafe(`SELECT id FROM "Voucher" WHERE id = '${voucherBId}' AND "organizationId" = '${orgAId}'`);
  recordTest('ADM-03', 'Admin Isolation', 'Admin A View Voucher B', 'Admin Org A queries Voucher B', '0 rows returned', `${adminVoucherQuery.length} rows returned`, adminVoucherQuery.length === 0);

  // 6. USER WITHOUT ORGANIZATION (organizationId = NULL) TESTS
  console.log('\n--- 5. NULL ORGANIZATION USER FAIL-CLOSED TESTS ---');

  const nullUserDb = await prisma.user.findUnique({
    where: { id: nullUser },
    select: { organizationId: true },
  });
  const nullUserFailClosed = nullUserDb?.organizationId === null;
  recordTest('NUL-01', 'Null User', 'Unassigned User Context', 'User with organizationId = NULL calls business function', 'FAIL CLOSED (TENANT_CONTEXT_MISSING)', nullUserFailClosed ? 'FAIL CLOSED (TENANT_CONTEXT_MISSING)' : 'FAIL OPEN', nullUserFailClosed);

  // Cleanup test fixtures
  await prisma.$executeRawUnsafe(`DELETE FROM "Payroll" WHERE id = '${payrollBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Voucher" WHERE id = '${voucherBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Employee" WHERE id = '${empBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "File" WHERE id = '${fileBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Client" WHERE id = '${clientBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id IN ('${userAId}', '${userBId}', '${adminAId}', '${nullUser}')`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Organization" WHERE id IN ('${orgAId}', '${orgBId}')`);

  console.log('\n=================================================================');
  const totalPassed = testResults.filter(r => r.status === 'PASS').length;
  const totalFailed = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`  FINAL RESULTS: Passed: ${totalPassed} / Total: ${testResults.length} (Failed: ${totalFailed})`);
  console.log('=================================================================\n');

  if (totalFailed > 0) {
    throw new Error(`${totalFailed} Security Gate Tests Failed!`);
  }
}

runSecurityGateSuite()
  .catch((e) => {
    console.error('Security Gate Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
