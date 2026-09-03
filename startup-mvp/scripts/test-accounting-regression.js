const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAccountingRegression() {
  console.log('=== RUNNING ACCOUNTING REGRESSION TEST SUITE ===');
  
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Check Voucher count & total amounts
  const voucherCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Voucher"`);
  assert(Number(voucherCount[0].count) === 2143, `Voucher count intact (${voucherCount[0].count})`);

  // 2. Check JournalEntryLine debits vs credits equality
  const journalTotals = await prisma.$queryRawUnsafe(`
    SELECT 
      COALESCE(SUM("debitAmount"), 0) as total_debit, 
      COALESCE(SUM("creditAmount"), 0) as total_credit 
    FROM "JournalEntryLine"
  `);
  
  const debitSum = Number(journalTotals[0].total_debit);
  const creditSum = Number(journalTotals[0].total_credit);
  assert(debitSum === creditSum, `Journal Double-Entry Balance: Debit (${debitSum}) == Credit (${creditSum})`);

  // 3. Check ChartOfAccount count
  const coaCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "ChartOfAccount"`);
  assert(Number(coaCount[0].count) === 2564, `ChartOfAccount count intact (${coaCount[0].count})`);

  // 4. Check NULL organizationId in Voucher
  const nullVouchers = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Voucher" WHERE "organizationId" IS NULL`);
  assert(Number(nullVouchers[0].count) === 0, `NULL organizationId in Voucher is 0 (Verified ${nullVouchers[0].count})`);

  console.log('=== ACCOUNTING REGRESSION SUMMARY ===');
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    throw new Error('Accounting Regression Test Failed!');
  }
}

runAccountingRegression()
  .catch((e) => {
    console.error('Accounting test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
