const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function captureBaseline() {
  console.log('=== CAPTURING PHASE 3 POSTGRESQL FINANCIAL BASELINE ===\n');

  const voucherCountRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Voucher"`);
  const journalCountRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "JournalEntry"`);
  const journalLineCountRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "JournalEntryLine"`);
  const coaCountRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "ChartOfAccount"`);

  const voucherCount = Number(voucherCountRes[0].count);
  const journalCount = Number(journalCountRes[0].count);
  const journalLineCount = Number(journalLineCountRes[0].count);
  const coaCount = Number(coaCountRes[0].count);

  let quotationCount = 0;
  try {
    const quoRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "quotations"`);
    quotationCount = Number(quoRes[0].count);
  } catch (e) {}

  let orderCount = 0;
  try {
    const ordRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "WorkOrder"`);
    orderCount = Number(ordRes[0].count);
  } catch (e) {}

  const journalTotals = await prisma.$queryRawUnsafe(`
    SELECT 
      COALESCE(SUM("debitAmount"), 0) as total_debit, 
      COALESCE(SUM("creditAmount"), 0) as total_credit 
    FROM "JournalEntryLine"
  `);

  const debit = Number(journalTotals[0].total_debit);
  const credit = Number(journalTotals[0].total_credit);
  const variance = Math.abs(debit - credit);

  console.log(`Voucher Count:          ${voucherCount}`);
  console.log(`Invoice Count:          0 (N/A in schema - handled via Voucher)`);
  console.log(`Quotation Count:        ${quotationCount}`);
  console.log(`Order Count:            ${orderCount}`);
  console.log(`JournalEntry Count:     ${journalCount}`);
  console.log(`JournalEntryLine Count: ${journalLineCount}`);
  console.log(`ChartOfAccount Count:   ${coaCount}`);
  console.log(`Total Debits:           $${debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Total Credits:          $${credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Variance:               $${variance.toFixed(2)}`);
  console.log(`\n=======================================================\n`);
}

captureBaseline()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
