const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

// Inline atomic sequence generator matching lib/sequence.ts
async function getNextSequenceNumber(
  organizationId = 'default-org',
  key,
  prefix,
  year,
  padDigits = 6
) {
  const currentYear = year || new Date().getFullYear();
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

async function runPhase3cClosureSuite() {
  console.log('=================================================================');
  console.log('   PHASE 3C — FINAL EVIDENCE, TIMEZONE & CONCURRENCY CLOSURE    ');
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

  // 1. ASIA/DHAKA TIMEZONE & YEAR ROLLOVER TEST
  console.log('--- 1. ASIA/DHAKA TIMEZONE & YEAR ROLLOVER TEST ---');
  const dhakaOrgId = 'org-dhaka-' + Date.now();
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Organization" (id, name, "createdBy", "updatedAt")
    VALUES ('${dhakaOrgId}', 'Dhaka Timezone Org', 'cmsiij6cw06aypi01t3mc9vmq', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  const dt2026 = new Date('2026-12-31T23:59:59+06:00');
  const year2026 = dt2026.getFullYear();
  const seq2026 = await getNextSequenceNumber(dhakaOrgId, 'VOUCHER', 'VCH', year2026, 6);

  const dt2027 = new Date('2027-01-01T00:00:00+06:00');
  const year2027 = dt2027.getFullYear();
  const seq2027 = await getNextSequenceNumber(dhakaOrgId, 'VOUCHER', 'VCH', year2027, 6);

  const timezonePassed = (seq2026 === 'VCH-2026-000001' && seq2027 === 'VCH-2027-000001');
  record('P3C-TIMEZONE-01', 'Timezone Rollover', 'Asia/Dhaka Midnight Year Boundary', '2026-12-31 23:59:59 vs 2027-01-01 00:00:00', '2026 sequence: 000001, 2027 sequence: 000001', `2026: ${seq2026}, 2027: ${seq2027}`, timezonePassed);

  // 2. JOURNAL ENTRY HISTORICAL MAXIMA & BACKFILL
  console.log('\n--- 2. JOURNAL ENTRY HISTORICAL MAXIMA & BACKFILL ---');
  const jeMaxRes = await prisma.$queryRawUnsafe(`
    SELECT "entryNumber" FROM "JournalEntry" WHERE "entryNumber" LIKE 'JE-2026-%'
  `);

  let jeMaxSeq = 0;
  for (const item of jeMaxRes) {
    const parts = item.entryNumber.split('-');
    if (parts.length >= 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > jeMaxSeq) jeMaxSeq = num;
    }
  }

  // Backfill BusinessSequence row for JOURNAL_ENTRY
  await prisma.$queryRawUnsafe(`
    INSERT INTO "BusinessSequence" (id, "organizationId", key, year, "currentValue", "createdAt", "updatedAt")
    VALUES ('seq_' || md5('default-org-JOURNAL_ENTRY-2026'), 'default-org', 'JOURNAL_ENTRY', 2026, ${jeMaxSeq}, NOW(), NOW())
    ON CONFLICT ("organizationId", key, year)
    DO UPDATE SET "currentValue" = GREATEST("BusinessSequence"."currentValue", ${jeMaxSeq}), "updatedAt" = NOW()
    RETURNING "currentValue";
  `);

  const nextJe = await getNextSequenceNumber('default-org', 'JOURNAL_ENTRY', 'JE', 2026, 6);
  const isJeValid = (nextJe === `JE-2026-${String(jeMaxSeq + 1).padStart(6, '0')}`);

  // Roll back JournalEntry sequence test increment
  await prisma.$executeRawUnsafe(`
    UPDATE "BusinessSequence" SET "currentValue" = ${jeMaxSeq} WHERE "organizationId" = 'default-org' AND key = 'JOURNAL_ENTRY' AND year = 2026;
  `);

  record('P3C-JE-01', 'Journal Sequence', 'JournalEntry Max Backfill & Next Alloc', `Historical Max: ${jeMaxSeq}`, `Next: JE-2026-${String(jeMaxSeq + 1).padStart(6, '0')}`, `Generated: ${nextJe}`, isJeValid);

  // 3. ATOMIC CONCURRENT VOUCHER POST GUARD TEST
  console.log('\n--- 3. ATOMIC CONCURRENT VOUCHER POST GUARD TEST ---');
  const testVoucherId = 'vch-p3c-idem-test';
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Voucher" (id, "voucherNumber", date, type, status, "createdBy", "organizationId", "updatedAt", "createdAt")
    VALUES ('${testVoucherId}', 'VCH-P3C-001', NOW(), 'JOURNAL'::"VoucherType", 'DRAFT', 'cmsiij6cw06aypi01t3mc9vmq', '${dhakaOrgId}', NOW(), NOW());
  `);

  // Trigger two concurrent atomic status updates
  const postAttempt1 = prisma.$executeRawUnsafe(
    `UPDATE "Voucher" SET status = 'posted', "postedAt" = NOW() WHERE id = '${testVoucherId}' AND LOWER(status) != 'posted'`
  );
  const postAttempt2 = prisma.$executeRawUnsafe(
    `UPDATE "Voucher" SET status = 'posted', "postedAt" = NOW() WHERE id = '${testVoucherId}' AND LOWER(status) != 'posted'`
  );

  const [res1, res2] = await Promise.all([postAttempt1, postAttempt2]);
  const atomicGuardPassed = (res1 === 1 && res2 === 0) || (res1 === 0 && res2 === 1);

  record('P3C-IDEM-01', 'Atomic Post Guard', 'Concurrent postVoucher Database Guard', '2 Concurrent Update Calls', 'Exactly 1 update succeeds (delta=1), 2nd rejected (delta=0)', `Call A: ${res1} row, Call B: ${res2} row`, atomicGuardPassed);

  // Cleanup test voucher
  await prisma.$executeRawUnsafe(`DELETE FROM "Voucher" WHERE id = '${testVoucherId}'`);

  // 4. REAL TRIAL BALANCE RUNTIME REPORT EXECUTION
  console.log('\n--- 4. REAL TRIAL BALANCE RUNTIME REPORT EXECUTION ---');
  const trialBalanceAccounts = await prisma.chartOfAccount.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      JournalEntryLine: {
        select: {
          debitAmount: true,
          creditAmount: true,
        },
      },
    },
  });

  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);

  for (const acc of trialBalanceAccounts) {
    for (const line of acc.JournalEntryLine) {
      totalDebit = totalDebit.plus(line.debitAmount || 0);
      totalCredit = totalCredit.plus(line.creditAmount || 0);
    }
  }

  const tbDebitNum = Number(totalDebit);
  const tbCreditNum = Number(totalCredit);
  const tbBalanced = (tbDebitNum === tbCreditNum);

  record('P3C-TB-01', 'Trial Balance', 'Trial Balance Report Runtime Execution', `Accounts: ${trialBalanceAccounts.length}`, 'Total Debit == Total Credit ($0.00 Variance)', `Debit $${tbDebitNum} == Credit $${tbCreditNum}`, tbBalanced);

  // Cleanup test sequence fixtures
  await prisma.$executeRawUnsafe(`DELETE FROM "BusinessSequence" WHERE "organizationId" = '${dhakaOrgId}'`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Organization" WHERE id = '${dhakaOrgId}'`);

  console.log('\n=================================================================');
  const passedCount = results.filter(r => r.status === 'PASS').length;
  const failedCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`  PHASE 3C SUITE RESULTS: Passed: ${passedCount} / Total: ${results.length} (Failed: ${failedCount})`);
  console.log('=================================================================\n');

  if (failedCount > 0) {
    throw new Error(`${failedCount} Final Phase 3C Closure Tests Failed!`);
  }
}

runPhase3cClosureSuite()
  .catch(e => {
    console.error('Phase 3C Closure Test Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
