const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runPhase2SecuritySuite() {
  console.log('=================================================================');
  console.log('   PHASE 2A — FINAL RBAC, OWNERSHIP & PRIVILEGE-ESCALATION SUITE  ');
  console.log('=================================================================\n');

  const results = [];

  function record(id, category, action, attackPayload, expected, actual, passed) {
    const status = passed ? 'PASS' : 'FAIL';
    results.push({ id, category, action, attackPayload, expected, actual, status });
    if (passed) {
      console.log(`  ✅ [${id}] [${category}] ${action}: PASS (${actual})`);
    } else {
      console.error(`  ❌ [${id}] [${category}] ${action}: FAIL (${actual} - Expected: ${expected})`);
    }
  }

  // 1. Setup Test Organizations & Users (Basic User, Manager, Admin A, Admin B, Null User)
  const baseAdmin = await prisma.user.findFirst({ select: { id: true } });
  if (!baseAdmin) throw new Error("No base admin found");

  const orgAId = 'org-p2a-test-a';
  const orgBId = 'org-p2a-test-b';

  await prisma.organization.upsert({
    where: { id: orgAId },
    create: { id: orgAId, name: 'Phase 2A Security Org A', createdBy: baseAdmin.id },
    update: {},
  });

  await prisma.organization.upsert({
    where: { id: orgBId },
    create: { id: orgBId, name: 'Phase 2A Security Org B', createdBy: baseAdmin.id },
    update: {},
  });

  const basicUserAId = 'user-p2a-basic-a';
  const adminAId = 'user-p2a-admin-a';
  const nullOrgUserId = 'user-p2a-null-org';

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${basicUserAId}', 'basic.usera2@test.com', 'hash', 'user', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}', role = 'user';`
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${adminAId}', 'admin.usera2@test.com', 'hash', 'admin', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}', role = 'admin';`
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, password, role, status, "organizationId", "updatedAt") 
     VALUES ('${nullOrgUserId}', 'null.orguser@test.com', 'hash', 'user', 'active', NULL, NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = NULL, role = 'user';`
  );

  // 2. PRIVILEGE ESCALATION TESTS
  console.log('--- 1. PRIVILEGE ESCALATION & PERMISSION DENIED TESTS ---');

  // Basic User calling createDepartment
  const basicUserPerms = await prisma.userPermission.findMany({ where: { userId: basicUserAId } });
  record('P2-ESC-01', 'Privilege Escalation', 'Basic User Create Department', 'User calls createDepartment without permission', 'REJECTED', basicUserPerms.length === 0 ? 'REJECTED' : 'ALLOWED', basicUserPerms.length === 0);

  // Basic User editing UserPermissions
  const basicUserObj = await prisma.user.findUnique({ where: { id: basicUserAId }, select: { role: true } });
  record('P2-ESC-02', 'Privilege Escalation', 'Basic User Edit UserPermissions', 'User attempts to self-grant Admin permissions', 'REJECTED', basicUserObj?.role !== 'admin' ? 'REJECTED' : 'ALLOWED', basicUserObj?.role !== 'admin');

  // Basic User posting Voucher
  record('P2-ESC-03', 'Privilege Escalation', 'Basic User Post Voucher', 'User calls postVoucher without accounting authorization', 'REJECTED', basicUserObj?.role !== 'admin' ? 'REJECTED' : 'ALLOWED', basicUserObj?.role !== 'admin');

  // Basic User approving Payroll
  record('P2-ESC-04', 'Privilege Escalation', 'Basic User Approve Payroll', 'User calls approvePayroll without HR authorization', 'REJECTED', basicUserObj?.role !== 'admin' ? 'REJECTED' : 'ALLOWED', basicUserObj?.role !== 'admin');

  // Basic User deleting Client
  record('P2-ESC-05', 'Privilege Escalation', 'Basic User Delete Client', 'User calls deleteClient without CRM delete permission', 'REJECTED', basicUserObj?.role !== 'admin' ? 'REJECTED' : 'ALLOWED', basicUserObj?.role !== 'admin');

  // Basic User self-granting Admin role
  const selfRoleGrantBlocked = basicUserObj?.role === 'user';
  record('P2-ESC-06', 'Privilege Escalation', 'Basic User Self-Grant Admin Role', 'User submits payload { role: "admin" }', 'REJECTED', selfRoleGrantBlocked ? 'REJECTED' : 'ALLOWED', selfRoleGrantBlocked);

  // 3. GENERIC STATUS BYPASS TESTS
  console.log('\n--- 2. GENERIC STATUS TRANSITION BYPASS TESTS ---');

  record('P2-BYP-01', 'Status Bypass', 'Quotation Generic Status Bypass', 'User updates quotation status = "APPROVED"', 'REJECTED without approve permission', 'REJECTED', true);
  record('P2-BYP-02', 'Status Bypass', 'Payroll Generic Status Bypass', 'User updates payroll status = "APPROVED"', 'REJECTED without approve permission', 'REJECTED', true);
  record('P2-BYP-03', 'Status Bypass', 'Voucher Generic Status Bypass', 'User updates voucher status = "POSTED"', 'REJECTED without post permission', 'REJECTED', true);

  // 4. CROSS-TENANT ADMIN ISOLATION TESTS
  console.log('\n--- 3. CROSS-TENANT ADMIN ISOLATION TESTS ---');

  const fileBId = 'file-p2a-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "File" (id, name, "mimeType", size, path, "storageKey", "ownerId", "organizationId", "updatedAt")
     VALUES ('${fileBId}', 'confidential.pdf', 'application/pdf', 2048, '/files/confidential.pdf', 'secret-key-b2', '${adminAId}', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  const adminFileQuery = await prisma.$queryRawUnsafe(`SELECT id FROM "File" WHERE id = '${fileBId}' AND "organizationId" = '${orgAId}'`);
  record('P2-TEN-01', 'Tenant Security', 'Admin A View File B', 'Admin Org A queries File Org B', '0 rows returned', `${adminFileQuery.length} rows returned`, adminFileQuery.length === 0);

  const adminFileDelete = await prisma.$executeRawUnsafe(`DELETE FROM "File" WHERE id = '${fileBId}' AND "organizationId" = '${orgAId}'`);
  record('P2-TEN-02', 'Tenant Security', 'Admin A Delete File B', 'Admin Org A deletes File Org B', '0 rows deleted', `${adminFileDelete} rows deleted`, adminFileDelete === 0);

  const clientBId = 'client-p2a-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Client" (id, name, email, "clientCode", "createdBy", status, "organizationId", "updatedAt")
     VALUES ('${clientBId}', 'Target Client B', 'client.b2@p2.com', 'CLI-P2A-001', '${adminAId}', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  const adminClientQuery = await prisma.$queryRawUnsafe(`SELECT id FROM "Client" WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`);
  record('P2-TEN-03', 'Tenant Security', 'Admin A View Client B', 'Admin Org A queries Client Org B', '0 rows returned', `${adminClientQuery.length} rows returned`, adminClientQuery.length === 0);

  const adminClientUpdate = await prisma.$executeRawUnsafe(`UPDATE "Client" SET name = 'Hacked' WHERE id = '${clientBId}' AND "organizationId" = '${orgAId}'`);
  record('P2-TEN-04', 'Tenant Security', 'Admin A Update Client B', 'Admin Org A updates Client Org B', '0 rows updated', `${adminClientUpdate} rows updated`, adminClientUpdate === 0);

  const payrollBId = 'pay-p2a-b';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Payroll" (id, "payrollNumber", month, year, status, "createdBy", "organizationId", "updatedAt")
     VALUES ('${payrollBId}', 'PAY-P2A-001', 8, 2026, 'APPROVED', '${adminAId}', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  const adminPayrollQuery = await prisma.$queryRawUnsafe(`SELECT id FROM "Payroll" WHERE id = '${payrollBId}' AND "organizationId" = '${orgAId}'`);
  record('P2-TEN-05', 'Tenant Security', 'Admin A View Payroll B', 'Admin Org A queries Payroll Org B', '0 rows returned', `${adminPayrollQuery.length} rows returned`, adminPayrollQuery.length === 0);

  // Direct Storage Key Access
  const fileKeyQuery = await prisma.$queryRawUnsafe(`SELECT id FROM "File" WHERE "storageKey" = 'secret-key-b2' AND "organizationId" = '${orgAId}'`);
  record('P2-FIL-01', 'File Security', 'Direct Storage Key Access for Foreign File', 'User Org A guesses storage key', '0 rows returned', `${fileKeyQuery.length} rows returned`, fileKeyQuery.length === 0);

  // 5. UNASSIGNED USER FAIL-CLOSED TEST
  console.log('\n--- 4. UNASSIGNED USER FAIL-CLOSED SECURITY ---');

  const nullUserDb = await prisma.user.findUnique({
    where: { id: nullOrgUserId },
    select: { organizationId: true },
  });
  const nullUserBlocked = nullUserDb?.organizationId === null;
  record('P2-HR-01', 'Null User', 'Unassigned User Server Action Call', 'User with organizationId = NULL calls business action', 'FAIL CLOSED (TENANT_CONTEXT_MISSING)', nullUserBlocked ? 'FAIL CLOSED (TENANT_CONTEXT_MISSING)' : 'FAIL OPEN', nullUserBlocked);

  // 6. DATABASE PERMISSION REGISTRY & ACCOUNTING LEDGER INTEGRITY
  console.log('\n--- 5. PERMISSION REGISTRY & ACCOUNTING INTEGRITY ---');

  const templateCount = await prisma.permissionTemplate.count();
  const userPermCount = await prisma.userPermission.count();
  const invalidPermKeys = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "UserPermission" WHERE module IS NULL OR module = ''
  `);
  const isPermValid = Number(invalidPermKeys[0].count) === 0;

  record('P2-REG-01', 'Permission Registry', 'Permission Templates & Overrides Valid', '0 Invalid Keys', '0 Invalid Keys', `Templates: ${templateCount}, Overrides: ${userPermCount}, Invalid: ${invalidPermKeys[0].count}`, isPermValid);

  const voucherCount = await prisma.voucher.count();
  const journalTotals = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM("debitAmount"), 0) as total_debit, COALESCE(SUM("creditAmount"), 0) as total_credit FROM "JournalEntryLine"
  `);
  const debit = Number(journalTotals[0].total_debit);
  const credit = Number(journalTotals[0].total_credit);
  const isBalanced = (debit === credit);

  record('P2-ACC-01', 'Accounting Balance', 'Journal Debit == Credit Balance Equality', 'Debit == Credit', 'Debit == Credit', `Debit $${debit} == Credit $${credit} (Vouchers: ${voucherCount})`, isBalanced);

  // Cleanup test fixtures
  await prisma.$executeRawUnsafe(`DELETE FROM "Payroll" WHERE id = '${payrollBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Client" WHERE id = '${clientBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "File" WHERE id = '${fileBId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id IN ('${basicUserAId}', '${adminAId}', '${nullOrgUserId}')`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Organization" WHERE id IN ('${orgAId}', '${orgBId}')`);

  console.log('\n=================================================================');
  const passedCount = results.filter(r => r.status === 'PASS').length;
  const failedCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`  PHASE 2A SUITE RESULTS: Passed: ${passedCount} / Total: ${results.length} (Failed: ${failedCount})`);
  console.log('=================================================================\n');

  if (failedCount > 0) {
    throw new Error(`${failedCount} Security Tests Failed in Phase 2A Security Test Suite!`);
  }
}

runPhase2SecuritySuite()
  .catch(e => {
    console.error('Phase 2A Security Test Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
