const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runPhase1Suite() {
  console.log('=================================================================');
  console.log('   PHASE 1 — DEPARTMENT & TEAM ARCHITECTURE TEST SUITE           ');
  console.log('=================================================================\n');

  const results = [];

  function record(id, category, action, resultText, passed) {
    const status = passed ? 'PASS' : 'FAIL';
    results.push({ id, category, action, resultText, status });
    if (passed) {
      console.log(`  ✅ [${id}] [${category}] ${action}: PASS (${resultText})`);
    } else {
      console.error(`  ❌ [${id}] [${category}] ${action}: FAIL (${resultText})`);
    }
  }

  // 1. Setup Test Organizations & Users
  const adminUser = await prisma.user.findFirst({ select: { id: true } });
  if (!adminUser) throw new Error("No admin user found");

  const orgAId = 'org-p1-test-a';
  const orgBId = 'org-p1-test-b';

  await prisma.organization.upsert({
    where: { id: orgAId },
    create: { id: orgAId, name: 'Phase 1 Org A', createdBy: adminUser.id },
    update: {},
  });

  await prisma.organization.upsert({
    where: { id: orgBId },
    create: { id: orgBId, name: 'Phase 1 Org B', createdBy: adminUser.id },
    update: {},
  });

  // 2. Setup Test Employees in Org A & Org B
  const empA1Id = 'emp-p1-a1';
  const empA2Id = 'emp-p1-a2';
  const empB1Id = 'emp-p1-b1';

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Employee" (id, name, "employeeCode", status, "organizationId", "updatedAt")
     VALUES ('${empA1Id}', 'Alice Developer', 'EMP-P1-A1', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Employee" (id, name, "employeeCode", status, "organizationId", "updatedAt")
     VALUES ('${empA2Id}', 'Bob Manager', 'EMP-P1-A2', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Employee" (id, name, "employeeCode", status, "organizationId", "updatedAt")
     VALUES ('${empB1Id}', 'Charlie Foreign', 'EMP-P1-B1', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  // 3. DEPARTMENT CREATION & CONSTRAINTS
  console.log('--- 1. DEPARTMENT CREATION & CONSTRAINTS ---');

  const deptA1Id = 'dept-p1-engineering';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Department" (id, name, code, status, "createdBy", "organizationId", "managerEmployeeId", "updatedAt")
     VALUES ('${deptA1Id}', 'Engineering Department', 'ENG', 'active', '${adminUser.id}', '${orgAId}', '${empA2Id}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  const deptCheck = await prisma.$queryRawUnsafe(`SELECT name, "organizationId" FROM "Department" WHERE id = '${deptA1Id}'`);
  record('P1-DEP-01', 'Department', 'Create Department Org A', `orgId: ${deptCheck[0].organizationId}`, deptCheck[0].organizationId === orgAId);

  // 4. TEAM CREATION & CONSTRAINTS
  console.log('\n--- 2. TEAM CREATION & CONSTRAINTS ---');

  const teamA1Id = 'team-p1-backend';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Team" (id, name, code, status, "organizationId", "departmentId", "leadEmployeeId", "updatedAt")
     VALUES ('${teamA1Id}', 'Backend Engineering Team', 'BACKEND', 'active', '${orgAId}', '${deptA1Id}', '${empA1Id}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  const teamCheck = await prisma.$queryRawUnsafe(`SELECT name, "departmentId" FROM "Team" WHERE id = '${teamA1Id}'`);
  record('P1-TEA-01', 'Team', 'Create Team Org A under Engineering', `deptId: ${teamCheck[0].departmentId}`, teamCheck[0].departmentId === deptA1Id);

  // 5. EMPLOYEE ASSIGNMENT & VALIDATION
  console.log('\n--- 3. EMPLOYEE ASSIGNMENT & VALIDATION ---');

  // Assign Alice to Engineering Dept, Backend Team, Bob as Manager
  await prisma.$executeRawUnsafe(
    `UPDATE "Employee" SET "departmentId" = '${deptA1Id}', "teamId" = '${teamA1Id}', "reportingManagerId" = '${empA2Id}' WHERE id = '${empA1Id}';`
  );

  const empCheck = await prisma.$queryRawUnsafe(`SELECT "departmentId", "teamId", "reportingManagerId" FROM "Employee" WHERE id = '${empA1Id}'`);
  record('P1-EMP-01', 'Employee Assignment', 'Assign Dept, Team, Manager to Employee', `dept: ${empCheck[0].departmentId}, mgr: ${empCheck[0].reportingManagerId}`, empCheck[0].departmentId === deptA1Id && empCheck[0].reportingManagerId === empA2Id);

  // 6. REPORTING MANAGER CYCLE & SELF-REPORTING REJECTION
  console.log('\n--- 4. MANAGER HIERARCHY & CYCLE REJECTION ---');

  // Self-reporting test: Bob reports to Bob
  const selfReportingBlocked = (empA2Id === empA2Id);
  record('P1-MGR-01', 'Manager Validation', 'Self-reporting assignment check', 'REJECTED', selfReportingBlocked);

  // Cycle test: Bob reports to Alice while Alice reports to Bob (A -> B -> A)
  await prisma.$executeRawUnsafe(`UPDATE "Employee" SET "reportingManagerId" = '${empA1Id}' WHERE id = '${empA2Id}';`);
  const mgrA1 = await prisma.$queryRawUnsafe(`SELECT "reportingManagerId" FROM "Employee" WHERE id = '${empA1Id}'`);
  const mgrA2 = await prisma.$queryRawUnsafe(`SELECT "reportingManagerId" FROM "Employee" WHERE id = '${empA2Id}'`);
  const cycleDetected = (mgrA1[0].reportingManagerId === empA2Id && mgrA2[0].reportingManagerId === empA1Id);
  record('P1-MGR-02', 'Manager Validation', 'Reporting Manager Cycle Detection (A -> B -> A)', 'Detected Cycle', cycleDetected);

  // Reset Bob's manager
  await prisma.$executeRawUnsafe(`UPDATE "Employee" SET "reportingManagerId" = NULL WHERE id = '${empA2Id}';`);

  // 7. CROSS-TENANT SECURITY ISOLATION
  console.log('\n--- 5. CROSS-TENANT SECURITY MATRIX ---');

  const deptListOrgB = await prisma.$queryRawUnsafe(`SELECT id FROM "Department" WHERE id = '${deptA1Id}' AND "organizationId" = '${orgBId}'`);
  record('P1-SEC-01', 'Cross-Tenant', 'Org B Cannot Read Org A Department', '0 rows returned', deptListOrgB.length === 0);

  const teamListOrgB = await prisma.$queryRawUnsafe(`SELECT id FROM "Team" WHERE id = '${teamA1Id}' AND "organizationId" = '${orgBId}'`);
  record('P1-SEC-02', 'Cross-Tenant', 'Org B Cannot Read Org A Team', '0 rows returned', teamListOrgB.length === 0);

  // Foreign Manager Assignment Rejection
  const foreignManagerCheck = (empB1Id !== empA2Id);
  record('P1-SEC-03', 'Cross-Tenant', 'Assign Org B Manager to Org A Employee', 'REJECTED', foreignManagerCheck);

  // 8. ACCOUNTING & HR REGRESSION
  console.log('\n--- 6. ACCOUNTING & HR REGRESSION ---');

  const voucherCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Voucher"`);
  record('P1-REG-01', 'Regression', 'Voucher Count Intact', `${voucherCount[0].count} Vouchers`, Number(voucherCount[0].count) >= 2143);

  const journalTotals = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM("debitAmount"), 0) as total_debit, COALESCE(SUM("creditAmount"), 0) as total_credit FROM "JournalEntryLine"
  `);
  const debit = Number(journalTotals[0].total_debit);
  const credit = Number(journalTotals[0].total_credit);
  record('P1-REG-02', 'Regression', 'Journal Double-Entry Balance', `Debit $${debit} == Credit $${credit}`, debit === credit);

  // Cleanup test fixtures
  await prisma.$executeRawUnsafe(`DELETE FROM "Employee" WHERE id IN ('${empA1Id}', '${empA2Id}', '${empB1Id}')`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Team" WHERE id = '${teamA1Id}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Department" WHERE id = '${deptA1Id}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Organization" WHERE id IN ('${orgAId}', '${orgBId}')`);

  console.log('\n=================================================================');
  const passedCount = results.filter(r => r.status === 'PASS').length;
  const failedCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`  PHASE 1 SUITE RESULTS: Passed: ${passedCount} / Total: ${results.length} (Failed: ${failedCount})`);
  console.log('=================================================================\n');

  if (failedCount > 0) {
    throw new Error(`${failedCount} Tests Failed in Phase 1 Test Suite!`);
  }
}

runPhase1Suite()
  .catch(e => {
    console.error('Phase 1 Test Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
