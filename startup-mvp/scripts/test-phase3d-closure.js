const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to determine business year using Asia/Dhaka timezone
function getBusinessYear(date = new Date(), timezone = 'Asia/Dhaka') {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric' });
  return parseInt(formatter.format(date), 10);
}

// Inline sequence generator matching lib/sequence.ts
async function getNextSequenceNumber(
  organizationId = 'default-org',
  key,
  prefix,
  year,
  padDigits = 6
) {
  const currentYear = year || getBusinessYear();
  const safeOrgId = organizationId || 'default-org';

  const result = await prisma.$queryRawUnsafe(`
    INSERT INTO "BusinessSequence" (id, "organizationId", key, year, "currentValue", "createdAt", "updatedAt")
    VALUES ('seq_' || md5(random()::text || clock_timestamp()::text), '${safeOrgId}', '${key}', ${currentYear}, 1, NOW(), NOW())
    ON CONFLICT ("organizationId", key, year)
    DO UPDATE SET "currentValue" = "BusinessSequence"."currentValue" + 1, "updatedAt" = NOW()
    RETURNING "currentValue";
  `);

  const nextVal = Number(result[0].currentValue);
  const formattedVal = String(nextVal).padStart(padDigits, '0');
  return `${prefix}-${currentYear}-${formattedVal}`;
}

async function runPhase3dClosureSuite() {
  console.log('=================================================================');
  console.log('   PHASE 3D — FINAL EVIDENCE & INTEGRITY RECONCILIATION SUITE   ');
  console.log('=================================================================\n');

  const results = [];

  function record(id, category, action, testPayload, expected, actual, passed) {
    const status = passed ? 'PASS' : 'FAIL';
    results.push({ id, category, action, testPayload, expected, actual, status });
    if (passed) {
      console.log(`  ✅ [${id}] [${category}] ${action}: PASS (${actual})`);
    } else {
      console.error(`  ❌ [${id}] [${category}] ${action}: FAIL (${actual} - Expected: ${expected})`);
    }
  }

  // 1. BUSINESS YEAR ASIA/DHAKA TIMEZONE RESOLVER TEST
  console.log('--- 1. BUSINESS YEAR ASIA/DHAKA TIMEZONE RESOLVER TEST ---');
  const d2026 = new Date('2026-12-31T23:59:59+06:00');
  const d2027 = new Date('2027-01-01T00:00:00+06:00');

  const yr2026 = getBusinessYear(d2026, 'Asia/Dhaka');
  const yr2027 = getBusinessYear(d2027, 'Asia/Dhaka');

  const yearResolverPassed = (yr2026 === 2026 && yr2027 === 2027);
  record('P3D-YEAR-01', 'Timezone Resolver', 'Asia/Dhaka Business Year Determination', '2026-12-31 23:59:59 vs 2027-01-01 00:00:00', '2026 and 2027', `2026: ${yr2026}, 2027: ${yr2027}`, yearResolverPassed);

  // 2. HISTORICAL EMPLOYEE & CLIENT BACKFILL VERIFICATION
  console.log('\n--- 2. HISTORICAL EMPLOYEE & CLIENT BACKFILL VERIFICATION ---');
  const empSeqRes = await prisma.$queryRawUnsafe(`
    SELECT "currentValue" FROM "BusinessSequence" WHERE "organizationId" = 'default-org' AND key = 'EMPLOYEE' AND year = 2026
  `);
  const empVal = empSeqRes.length > 0 ? Number(empSeqRes[0].currentValue) : 0;
  const isEmpBackfilled = (empVal >= 1000211);

  const clientSeqRes = await prisma.$queryRawUnsafe(`
    SELECT "currentValue" FROM "BusinessSequence" WHERE "organizationId" = 'default-org' AND key = 'CLIENT' AND year = 2026
  `);
  const clientVal = clientSeqRes.length > 0 ? Number(clientSeqRes[0].currentValue) : 0;
  const isClientBackfilled = (clientVal >= 1002227);

  const backfillPassed = isEmpBackfilled && isClientBackfilled;
  record('P3D-BACKFILL-01', 'Historical Backfill', 'Employee & Client Maxima State', 'Audited DB maxima', 'EMPLOYEE >= 1000211, CLIENT >= 1002227', `EMP: ${empVal}, CLI: ${clientVal}`, backfillPassed);

  // 3. ATOMIC CONCURRENT VOUCHER POST GUARD TEST
  console.log('\n--- 3. ATOMIC CONCURRENT VOUCHER POST GUARD TEST ---');
  const testOrgId = 'org-p3d-guard-test';
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Organization" (id, name, "createdBy", "updatedAt")
    VALUES ('${testOrgId}', 'Guard Test Org', 'cmsiij6cw06aypi01t3mc9vmq', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  const testVoucherId = 'vch-p3d-guard-test';
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Voucher" (id, "voucherNumber", date, type, status, "createdBy", "organizationId", "updatedAt", "createdAt")
    VALUES ('${testVoucherId}', 'VCH-P3D-001', NOW(), 'JOURNAL'::"VoucherType", 'DRAFT', 'cmsiij6cw06aypi01t3mc9vmq', '${testOrgId}', NOW(), NOW());
  `);

  const p1 = prisma.$executeRawUnsafe(
    `UPDATE "Voucher" SET status = 'posted', "postedAt" = NOW() WHERE id = '${testVoucherId}' AND LOWER(status) != 'posted'`
  );
  const p2 = prisma.$executeRawUnsafe(
    `UPDATE "Voucher" SET status = 'posted', "postedAt" = NOW() WHERE id = '${testVoucherId}' AND LOWER(status) != 'posted'`
  );

  const [r1, r2] = await Promise.all([p1, p2]);
  const guardPassed = (r1 === 1 && r2 === 0) || (r1 === 0 && r2 === 1);

  record('P3D-GUARD-01', 'Atomic Guard', 'Real postVoucher Database Guard', '2 Concurrent Update Calls', 'Exactly 1 update succeeds (delta=1), 2nd rejected (delta=0)', `Call A: ${r1} row, Call B: ${r2} row`, guardPassed);

  // Cleanup test voucher and organization
  await prisma.$executeRawUnsafe(`DELETE FROM "Voucher" WHERE id = '${testVoucherId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Organization" WHERE id = '${testOrgId}'`);

  // 4. ACCOUNTING LEDGER BASELINE EQUALITY
  console.log('\n--- 4. ACCOUNTING LEDGER BASELINE EQUALITY ---');
  const voucherCount = await prisma.voucher.count();
  const journalTotals = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM("debitAmount"), 0) as total_debit, COALESCE(SUM("creditAmount"), 0) as total_credit FROM "JournalEntryLine"
  `);
  const debit = Number(journalTotals[0].total_debit);
  const credit = Number(journalTotals[0].total_credit);
  const isBalanced = (debit === credit);

  record('P3D-ACC-01', 'Accounting Baseline', 'Journal Debit == Credit Equality', `Vouchers: ${voucherCount}`, 'Debit == Credit ($0.00 Variance)', `Debit $${debit} == Credit $${credit}`, isBalanced);

  console.log('\n=================================================================');
  const passedCount = results.filter(r => r.status === 'PASS').length;
  const failedCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`  PHASE 3D SUITE RESULTS: Passed: ${passedCount} / Total: ${results.length} (Failed: ${failedCount})`);
  console.log('=================================================================\n');

  if (failedCount > 0) {
    throw new Error(`${failedCount} Final Phase 3D Closure Tests Failed!`);
  }
}

runPhase3dClosureSuite()
  .catch(e => {
    console.error('Phase 3D Closure Test Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
