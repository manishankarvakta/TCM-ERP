const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function postRollbackAudit() {
  console.log('========================================================================');
  console.log('POST-ROLLBACK INTEGRITY & FINANCIAL VERIFICATION');
  console.log('========================================================================\n');

  // 1. Check Adjustments Status
  const adjByStatus = await prisma.inventoryAdjustment.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('Inventory Adjustments by Status:', adjByStatus);

  // 2. Check Count Entries Status
  const countByStatus = await prisma.inventoryCountEntry.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('Inventory Count Entries by Status:', countByStatus);

  // 3. Check Vouchers and Financial Equilibrium
  const allVoucherLinesSum = await prisma.voucherLine.aggregate({
    _sum: { debitAmount: true, creditAmount: true }
  });
  console.log('\nTotal Ledger / Voucher Debits & Credits Across Entire System:', {
    totalDebit: Number(allVoucherLinesSum._sum.debitAmount || 0).toFixed(2),
    totalCredit: Number(allVoucherLinesSum._sum.creditAmount || 0).toFixed(2),
    difference: (Number(allVoucherLinesSum._sum.debitAmount || 0) - Number(allVoucherLinesSum._sum.creditAmount || 0)).toFixed(2)
  });

  const allJournalLinesSum = await prisma.journalEntryLine.aggregate({
    _sum: { debitAmount: true, creditAmount: true }
  });
  console.log('Total Journal Entry Debits & Credits Across Entire System:', {
    totalDebit: Number(allJournalLinesSum._sum.debitAmount || 0).toFixed(2),
    totalCredit: Number(allJournalLinesSum._sum.creditAmount || 0).toFixed(2),
    difference: (Number(allJournalLinesSum._sum.debitAmount || 0) - Number(allJournalLinesSum._sum.creditAmount || 0)).toFixed(2)
  });

  // 4. Check 4010 Gain and 6200 Expense Accounts
  const gainAccount = await prisma.voucherLine.aggregate({
    where: { ChartOfAccount: { code: '4010' } },
    _sum: { creditAmount: true }
  });
  const expenseAccount = await prisma.voucherLine.aggregate({
    where: { ChartOfAccount: { code: '6200' } },
    _sum: { debitAmount: true }
  });

  console.log('\nCOA Postings Check:');
  console.log(`- 4010 (Inventory Adjustment Gain): ৳${Number(gainAccount._sum.creditAmount || 0).toFixed(2)}`);
  console.log(`- 6200 (Inventory Adjustment Expense): ৳${Number(expenseAccount._sum.debitAmount || 0).toFixed(2)}`);

  // 5. Total Stock Balance Check
  const totalStockSum = await prisma.stock.aggregate({
    _sum: { quantity: true },
    _count: { id: true }
  });
  console.log('\nCurrent Total System Stock Balance:', {
    totalRecords: totalStockSum._count.id,
    totalQuantity: Number(totalStockSum._sum.quantity || 0).toFixed(3)
  });

  // 6. Active (Non-Cancelled) Adjustments list
  const activeAdjustments = await prisma.inventoryAdjustment.findMany({
    where: { status: 'COMPLETED' },
    select: { adjustmentNumber: true, date: true, notes: true, voucher: { select: { voucherNumber: true } } }
  });
  console.log(`\nRemaining Active (Valid) Adjustments (${activeAdjustments.length}):`);
  activeAdjustments.forEach(a => {
    console.log(`- ${a.adjustmentNumber} | Date: ${a.date.toISOString().split('T')[0]} | Voucher: ${a.voucher?.voucherNumber || 'None'} | Notes: ${a.notes || 'None'}`);
  });

  await prisma.$disconnect();
}

postRollbackAudit();
