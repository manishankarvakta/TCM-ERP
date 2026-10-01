const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=====================================================');
  console.log('COMPREHENSIVE AUDIT: DATABASE, ADJUSTMENTS & REPORTS');
  console.log('=====================================================');

  try {
    // 8. Financial Reports Integrity
    console.log('\n================ 8. FINANCIAL REPORTS INTEGRITY ================');
    const allVoucherLinesSum = await prisma.voucherLine.aggregate({
      _sum: { debitAmount: true, creditAmount: true }
    });
    console.log('Total Ledger / Voucher Debits & Credits Across Entire System:', {
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

    // 9. Sales & POS Daybook Summary
    console.log('\n================ 9. SALES & DAYBOOK / POS REPORT ================');
    const salesSummary = await prisma.sale.aggregate({
      _count: { id: true },
      _sum: {
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        discountAmount: true,
        vatAmount: true
      }
    });
    console.log('Sales totals:', {
      count: salesSummary._count.id,
      totalSales: Number(salesSummary._sum.totalAmount || 0).toFixed(2),
      paidAmount: Number(salesSummary._sum.paidAmount || 0).toFixed(2),
      dueAmount: Number(salesSummary._sum.dueAmount || 0).toFixed(2),
      discountAmount: Number(salesSummary._sum.discountAmount || 0).toFixed(2),
      vatAmount: Number(salesSummary._sum.vatAmount || 0).toFixed(2)
    });

    const posSessions = await prisma.pOSClosingSession.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Recent POS Closing Sessions (${posSessions.length}):`);
    posSessions.forEach(ps => {
      console.log(`- ID: ${ps.id} | Date: ${ps.sessionDate ? ps.sessionDate.toISOString().split('T')[0] : 'N/A'} | Status: ${ps.status} | Total Sales: ${ps.totalSales} | Cash: ${ps.totalCash} | Discrepancy: ${ps.discrepancy}`);
    });

    // 10. Purchases Summary
    console.log('\n================ 10. PURCHASES REPORT ================');
    const purchaseSummary = await prisma.purchase.aggregate({
      _count: { id: true },
      _sum: {
        totalAmount: true,
        paidAmount: true,
        dueAmount: true
      }
    });
    console.log('Purchases totals:', {
      count: purchaseSummary._count.id,
      totalPurchases: Number(purchaseSummary._sum.totalAmount || 0).toFixed(2),
      paidAmount: Number(purchaseSummary._sum.paidAmount || 0).toFixed(2),
      dueAmount: Number(purchaseSummary._sum.dueAmount || 0).toFixed(2)
    });

    // 11. Top Revenue / Sales Reports Check
    console.log('\n================ 11. SALES REPORTS - TOP METRICS ================');
    const salesByPaymentMethod = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      _count: { id: true },
      _sum: { totalAmount: true }
    });
    console.log('Sales by Payment Method:', salesByPaymentMethod.map(s => ({
      paymentMethod: s.paymentMethod,
      count: s._count.id,
      totalAmount: Number(s._sum.totalAmount || 0).toFixed(2)
    })));

    const salesStatusCount = await prisma.sale.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    console.log('Sales by Status:', salesStatusCount);

    // 12. Negative Stock Full Analysis
    console.log('\n================ 12. NEGATIVE STOCK ANALYSIS ================');
    const allNegStocks = await prisma.stock.findMany({
      where: { quantity: { lt: 0 } },
      include: {
        item: { select: { id: true, code: true, barcode: true, name: true, costPrice: true } }
      }
    });
    console.log(`Total items with negative stock: ${allNegStocks.length}`);
    for (const s of allNegStocks) {
      // Find latest stock ledgers for this item
      const ledgers = await prisma.stockLedger.findMany({
        where: { itemId: s.itemId },
        orderBy: { createdAt: 'asc' },
        select: { transactionType: true, quantity: true, referenceType: true, referenceId: true, createdAt: true }
      });
      const ledgerQtySum = ledgers.reduce((acc, l) => acc + Number(l.quantity), 0);
      console.log(`- Item [${s.item?.code || 'N/A'}] "${s.item?.name}": StockTableQty=${s.quantity}, LedgerSum=${ledgerQtySum}, LedgerCount=${ledgers.length}`);
      ledgers.forEach(l => {
        console.log(`    > ${l.createdAt.toISOString().split('T')[0]} | ${l.transactionType} | qty=${l.quantity} | ref=${l.referenceType || 'N/A'}`);
      });
    }

    // 13. Analysis of Adjustments Impact on COA Balances
    console.log('\n================ 13. ADJUSTMENT COA BALANCES ANALYSIS ================');
    const adjGainAccount = await prisma.voucherLine.aggregate({
      where: { chartOfAccountId: 'coa_1782985565060_a88240c576caa4fe' }, // 4010 Inventory Adjustment Gain
      _sum: { debitAmount: true, creditAmount: true },
      _count: { id: true }
    });
    console.log('Account 4010 (Inventory Adjustment Gain):', {
      linesCount: adjGainAccount._count.id,
      totalDebits: Number(adjGainAccount._sum.debitAmount || 0).toFixed(2),
      totalCredits: Number(adjGainAccount._sum.creditAmount || 0).toFixed(2),
      netGain: (Number(adjGainAccount._sum.creditAmount || 0) - Number(adjGainAccount._sum.debitAmount || 0)).toFixed(2)
    });

    const adjExpenseAccount = await prisma.voucherLine.aggregate({
      where: { chartOfAccountId: 'coa_1782985565525_420f4742c742d179' }, // 6200 Inventory Adjustment Expense
      _sum: { debitAmount: true, creditAmount: true },
      _count: { id: true }
    });
    console.log('Account 6200 (Inventory Adjustment Expense):', {
      linesCount: adjExpenseAccount._count.id,
      totalDebits: Number(adjExpenseAccount._sum.debitAmount || 0).toFixed(2),
      totalCredits: Number(adjExpenseAccount._sum.creditAmount || 0).toFixed(2),
      netExpense: (Number(adjExpenseAccount._sum.debitAmount || 0) - Number(adjExpenseAccount._sum.creditAmount || 0)).toFixed(2)
    });

    const inventoryAssetAccount = await prisma.voucherLine.aggregate({
      where: { chartOfAccountId: 'coa_1782985565215_40b6ac77c8b04311' }, // 1600 Inventory Asset
      _sum: { debitAmount: true, creditAmount: true },
      _count: { id: true }
    });
    console.log('Account 1600 (Inventory Asset):', {
      linesCount: inventoryAssetAccount._count.id,
      totalDebits: Number(inventoryAssetAccount._sum.debitAmount || 0).toFixed(2),
      totalCredits: Number(inventoryAssetAccount._sum.creditAmount || 0).toFixed(2),
      netAssetBalance: (Number(inventoryAssetAccount._sum.debitAmount || 0) - Number(inventoryAssetAccount._sum.creditAmount || 0)).toFixed(2)
    });

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
