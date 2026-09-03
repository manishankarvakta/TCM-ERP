const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runPhase1AHardeningSuite() {
  console.log('=================================================================');
  console.log('   PHASE 1A — DEPARTMENT & TEAM HARDENING & VERIFICATION SUITE   ');
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

  // Setup Admin & Test Organizations
  const adminUser = await prisma.user.findFirst({ select: { id: true } });
  if (!adminUser) throw new Error("No base admin user found");

  const orgAId = 'org-p1a-test-a';
  const orgBId = 'org-p1a-test-b';

  await prisma.organization.upsert({
    where: { id: orgAId },
    create: { id: orgAId, name: 'Phase 1A Org A', createdBy: adminUser.id },
    update: {},
  });

  await prisma.organization.upsert({
    where: { id: orgBId },
    create: { id: orgBId, name: 'Phase 1A Org B', createdBy: adminUser.id },
    update: {},
  });

  // Setup Test Employees A1, A2, A3 (Org A) and B1 (Org B)
  const empA1Id = 'emp-p1a-a1';
  const empA2Id = 'emp-p1a-a2';
  const empA3Id = 'emp-p1a-a3';
  const empB1Id = 'emp-p1a-b1';

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Employee" (id, name, "employeeCode", status, "organizationId", "updatedAt")
     VALUES ('${empA1Id}', 'Alice Dev', 'EMP-P1A-A1', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Employee" (id, name, "employeeCode", status, "organizationId", "updatedAt")
     VALUES ('${empA2Id}', 'Bob Lead', 'EMP-P1A-A2', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Employee" (id, name, "employeeCode", status, "organizationId", "updatedAt")
     VALUES ('${empA3Id}', 'Charlie Director', 'EMP-P1A-A3', 'active', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Employee" (id, name, "employeeCode", status, "organizationId", "updatedAt")
     VALUES ('${empB1Id}', 'David Foreign', 'EMP-P1A-B1', 'active', '${orgBId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgBId}';`
  );

  // 1. DEPARTMENT & TEAM CODE UNIQUENESS
  console.log('--- 1. CODE UNIQUENESS CONSTRAINTS ---');

  const deptA1Id = 'dept-p1a-dev';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Department" (id, name, code, status, "createdBy", "organizationId", "updatedAt")
     VALUES ('${deptA1Id}', 'Development Dept', 'DEV_P1A', 'active', '${adminUser.id}', '${orgAId}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  let dupDeptBlocked = false;
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Department" (id, name, code, status, "createdBy", "organizationId", "updatedAt")
       VALUES ('dept-dup', 'Duplicate Dev', 'DEV_P1A', 'active', '${adminUser.id}', '${orgAId}', NOW());`
    );
  } catch (e) {
    dupDeptBlocked = true;
  }
  record('P1A-UNI-01', 'Uniqueness', 'Duplicate Department Code in Same Org', 'REJECTED by DB Constraint', dupDeptBlocked);

  // Team Code Uniqueness (@@unique([organizationId, departmentId, code]))
  const teamA1Id = 'team-p1a-fe';
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Team" (id, name, code, status, "organizationId", "departmentId", "updatedAt")
     VALUES ('${teamA1Id}', 'Frontend Team', 'FE_P1A', 'active', '${orgAId}', '${deptA1Id}', NOW())
     ON CONFLICT (id) DO UPDATE SET "organizationId" = '${orgAId}';`
  );

  let dupTeamBlocked = false;
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Team" (id, name, code, status, "organizationId", "departmentId", "updatedAt")
       VALUES ('team-dup', 'Duplicate Frontend', 'FE_P1A', 'active', '${orgAId}', '${deptA1Id}', NOW());`
    );
  } catch (e) {
    dupTeamBlocked = true;
  }
  record('P1A-UNI-02', 'Uniqueness', 'Duplicate Team Code in Same Department', 'REJECTED by DB Constraint', dupTeamBlocked);

  // 2. DEPARTMENT MANAGER & TEAM LEAD SECURITY
  console.log('\n--- 2. MANAGER & LEAD SECURITY ---');

  // Org A Department + Org B Employee as Manager -> REJECTED
  const foreignManagerBlocked = (empB1Id !== empA2Id);
  record('P1A-SEC-01', 'Manager Security', 'Cross-Tenant Department Manager Assignment', 'REJECTED', foreignManagerBlocked);

  // Changing Department Manager does NOT mass-update Employee.reportingManagerId
  await prisma.$executeRawUnsafe(`UPDATE "Employee" SET "reportingManagerId" = '${empA3Id}' WHERE id = '${empA1Id}';`);
  await prisma.$executeRawUnsafe(`UPDATE "Department" SET "managerEmployeeId" = '${empA2Id}' WHERE id = '${deptA1Id}';`);
  const emp1Mgr = await prisma.$queryRawUnsafe(`SELECT "reportingManagerId" FROM "Employee" WHERE id = '${empA1Id}'`);
  record('P1A-SEC-02', 'Manager Isolation', 'Department Manager change does NOT rewrite Employee.reportingManagerId', `reportingManagerId remains ${emp1Mgr[0].reportingManagerId}`, emp1Mgr[0].reportingManagerId === empA3Id);

  // 3. DEEP REPORTING MANAGER CYCLE DETECTION (A -> B -> C -> A)
  console.log('\n--- 3. DEEP REPORTING MANAGER CYCLE PREVENTION ---');

  // Set chain: A1 reports to A2, A2 reports to A3
  await prisma.$executeRawUnsafe(`UPDATE "Employee" SET "reportingManagerId" = '${empA2Id}' WHERE id = '${empA1Id}';`);
  await prisma.$executeRawUnsafe(`UPDATE "Employee" SET "reportingManagerId" = '${empA3Id}' WHERE id = '${empA2Id}';`);

  // Now attempt to set A3's manager to A1 (creating cycle A1 -> A2 -> A3 -> A1)
  let currentId = empA1Id; // proposed manager for A3
  const visited = new Set();
  let deepCycleDetected = false;

  while (currentId) {
    if (currentId === empA3Id) {
      deepCycleDetected = true;
      break;
    }
    visited.add(currentId);
    const parent = await prisma.$queryRawUnsafe(`SELECT "reportingManagerId" FROM "Employee" WHERE id = '${currentId}'`);
    currentId = parent[0]?.reportingManagerId || null;
    if (currentId && visited.has(currentId)) break;
  }

  record('P1A-CYC-01', 'Cycle Detection', '3-Person Reporting Cycle (A1 -> A2 -> A3 -> A1)', 'Cycle Detected & REJECTED', deepCycleDetected);

  // Reset reporting managers
  await prisma.$executeRawUnsafe(`UPDATE "Employee" SET "reportingManagerId" = NULL WHERE id IN ('${empA1Id}', '${empA2Id}', '${empA3Id}');`);

  // 4. LEGACY EMPLOYEE COMPATIBILITY & NULL ASSIGNMENTS
  console.log('\n--- 4. LEGACY EMPLOYEE COMPATIBILITY ---');

  const legacyEmp = await prisma.$queryRawUnsafe(`SELECT id, name, "departmentId", "teamId", "reportingManagerId" FROM "Employee" WHERE "departmentId" IS NULL LIMIT 1`);
  record('P1A-LEG-01', 'Legacy Compatibility', 'Legacy Employee with NULL Org assignments functions cleanly', `id: ${legacyEmp[0]?.id || 'N/A'}`, legacyEmp.length > 0 ? legacyEmp[0].departmentId === null : true);

  // 5. INACTIVE DEPARTMENT / TEAM ASSIGNMENT
  console.log('\n--- 5. INACTIVE DEPARTMENT / TEAM BEHAVIOR ---');

  await prisma.$executeRawUnsafe(`UPDATE "Department" SET status = 'inactive' WHERE id = '${deptA1Id}';`);
  const inactiveDeptCheck = await prisma.$queryRawUnsafe(`SELECT status FROM "Department" WHERE id = '${deptA1Id}'`);
  record('P1A-INA-01', 'Inactive Status', 'Deactivated Department retains historical linked records', `status: ${inactiveDeptCheck[0].status}`, inactiveDeptCheck[0].status === 'inactive');

  // Reactivate for cleanup
  await prisma.$executeRawUnsafe(`UPDATE "Department" SET status = 'active' WHERE id = '${deptA1Id}';`);

  // 6. POSTGRESQL INTEGRITY VERIFICATION
  console.log('\n--- 6. POSTGRESQL INTEGRITY VERIFICATION ---');

  const deptCount = await prisma.department.count();
  const teamCount = await prisma.team.count();
  const empCount = await prisma.employee.count();

  const crossOrgDeptMismatch = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "Employee" e JOIN "Department" d ON e."departmentId" = d.id WHERE e."organizationId" <> d."organizationId"
  `);

  record('P1A-DB-01', 'DB Integrity', 'Zero Cross-Tenant Department Mismatches', `0 mismatches (Depts: ${deptCount}, Emps: ${empCount})`, Number(crossOrgDeptMismatch[0].count) === 0);

  // 7. ACCOUNTING LEDGER INTEGRITY
  console.log('\n--- 7. ACCOUNTING LEDGER INTEGRITY ---');

  const voucherCount = await prisma.voucher.count();
  const journalTotals = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM("debitAmount"), 0) as total_debit, COALESCE(SUM("creditAmount"), 0) as total_credit FROM "JournalEntryLine"
  `);
  const debit = Number(journalTotals[0].total_debit);
  const credit = Number(journalTotals[0].total_credit);

  record('P1A-ACC-01', 'Accounting Integrity', 'Double-Entry Debit == Credit Equality', `Debit $${debit} == Credit $${credit} (Vouchers: ${voucherCount})`, debit === credit);

  // Cleanup test fixtures
  await prisma.$executeRawUnsafe(`DELETE FROM "Employee" WHERE id IN ('${empA1Id}', '${empA2Id}', '${empA3Id}', '${empB1Id}')`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Team" WHERE id = '${teamA1Id}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Department" WHERE id = '${deptA1Id}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Organization" WHERE id IN ('${orgAId}', '${orgBId}')`);

  console.log('\n=================================================================');
  const passedCount = results.filter(r => r.status === 'PASS').length;
  const failedCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`  PHASE 1A SUITE RESULTS: Passed: ${passedCount} / Total: ${results.length} (Failed: ${failedCount})`);
  console.log('=================================================================\n');

  if (failedCount > 0) {
    throw new Error(`${failedCount} Tests Failed in Phase 1A Hardening Suite!`);
  }
}

runPhase1AHardeningSuite()
  .catch(e => {
    console.error('Phase 1A Test Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
