const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdjustmentsAndCountReports() {
  console.log('========================================================================');
  console.log('DEEP-DIVE AUDIT: ADJUSTMENTS, INVENTORY COUNT & REPORTS');
  console.log('========================================================================\n');
// 
  try {
    // -------------------------------------------------------------------------
    // 1. INVENTORY COUNT ANALYSIS
    // -------------------------------------------------------------------------
    console.log('--- [1] INVENTORY COUNT ENTRIES & BATCHES ---');
    const totalCountEntries = await prisma.inventoryCountEntry.count();
    const countByStatus = await prisma.inventoryCountEntry.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { quantity: true }
    });
    console.log(`Total Count Records: ${totalCountEntries}`);
    console.log('Status Breakdown:');
    console.table(countByStatus.map(s => ({
      status: s.status,
      records: s._count.id,
      totalQtyScanned: Number(s._sum.quantity || 0)
    })));

    // Distinct items counted
    const distinctItemsCounted = await prisma.inventoryCountEntry.groupBy({
      by: ['itemId'],
      _count: { id: true },
      _sum: { quantity: true }
    });
    console.log(`Unique Items Counted / Scanned: ${distinctItemsCounted.length}`);

    // Check recent count entries
    const recentCounts = await prisma.inventoryCountEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        item: { select: { code: true, name: true, costPrice: true } },
        creator: { select: { name: true, email: true } },
        warehouse: { select: { name: true } }
      }
    });
    console.log('\nSample Recent 10 Physical Count Entries:');
    recentCounts.forEach((c, i) => {
      console.log(`  ${i+1}. [${c.item?.code}] ${c.item?.name} | Scanned Qty: ${c.quantity} | Wh: ${c.warehouse?.name} | Status: ${c.status} | User: ${c.creator?.name} | Date: ${c.createdAt.toISOString()}`);
    });

    // -------------------------------------------------------------------------
    // 2. INVENTORY ADJUSTMENTS FULL BREAKDOWN
    // -------------------------------------------------------------------------
    console.log('\n--- [2] INVENTORY ADJUSTMENTS DEEP DIVE ---');
    const allAdjustments = await prisma.inventoryAdjustment.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        warehouse: { select: { name: true, code: true } },
        createdByUser: { select: { name: true, email: true } },
        items: {
          include: {
            item: { select: { id: true, code: true, name: true, costPrice: true } }
          }
        },
        voucher: {
          include: {
            VoucherLine: {
              include: {
                ChartOfAccount: { select: { code: true, name: true, type: true } }
              }
            }
          }
        }
      }
    });

    console.log(`Total Adjustments Created: ${allAdjustments.length}`);
    
    // Categorize into Manual Adjustments vs Count Reconciliation Adjustments
    const manualAdjustments = allAdjustments.filter(a => !a.adjustmentNumber.startsWith('ADJ-CNT-'));
    const countReconciliationAdjustments = allAdjustments.filter(a => a.adjustmentNumber.startsWith('ADJ-CNT-'));

    console.log(`- Manual Adjustments (ADJ-...): ${manualAdjustments.length}`);
    console.log(`- Auto-Count Reconciliation Adjustments (ADJ-CNT-...): ${countReconciliationAdjustments.length}`);

    // Aggregate metrics
    let totalItemsAdjusted = 0;
    let positiveAdjustmentsQty = 0;
    let negativeAdjustmentsQty = 0;
    let positiveAdjustmentsVal = 0;
    let negativeAdjustmentsVal = 0;

    const adjustmentSummaryList = allAdjustments.map((adj, index) => {
      let gainQty = 0;
      let lossQty = 0;
      let gainVal = 0;
      let lossVal = 0;

      adj.items.forEach(it => {
        const qty = Number(it.quantity);
        const rate = Number(it.unitRate);
        const amt = Number(it.amount);

        totalItemsAdjusted++;
        if (qty > 0) {
          gainQty += qty;
          gainVal += amt;
          positiveAdjustmentsQty += qty;
          positiveAdjustmentsVal += amt;
        } else {
          lossQty += Math.abs(qty);
          lossVal += amt;
          negativeAdjustmentsQty += Math.abs(qty);
          negativeAdjustmentsVal += amt;
        }
      });

      const voucherDebit = adj.voucher?.VoucherLine.reduce((s, l) => s + Number(l.debitAmount), 0) || 0;
      const voucherCredit = adj.voucher?.VoucherLine.reduce((s, l) => s + Number(l.creditAmount), 0) || 0;

      return {
        idx: index + 1,
        number: adj.adjustmentNumber,
        type: adj.adjustmentNumber.startsWith('ADJ-CNT-') ? 'Count Reconcile' : 'Manual',
        date: adj.date.toISOString().split('T')[0],
        itemsCount: adj.items.length,
        gainQty: gainQty.toFixed(2),
        lossQty: lossQty.toFixed(2),
        gainVal: gainVal.toFixed(2),
        lossVal: lossVal.toFixed(2),
        voucherNo: adj.voucher?.voucherNumber || 'MISSING',
        vchBalanced: Math.abs(voucherDebit - voucherCredit) < 0.01 ? 'YES' : 'NO',
        status: adj.status
      };
    });

    console.table(adjustmentSummaryList);

    console.log('\nAdjustment Totals:');
    console.log(`- Total Gain Qty: +${positiveAdjustmentsQty.toFixed(3)} units (Value: ৳${positiveAdjustmentsVal.toFixed(2)})`);
    console.log(`- Total Loss Qty: -${negativeAdjustmentsQty.toFixed(3)} units (Value: ৳${negativeAdjustmentsVal.toFixed(2)})`);
    console.log(`- Net Adjusted Qty: +${(positiveAdjustmentsQty - negativeAdjustmentsQty).toFixed(3)} units`);
    console.log(`- Net Value Impact: +৳${(positiveAdjustmentsVal - negativeAdjustmentsVal).toFixed(2)}`);

    // -------------------------------------------------------------------------
    // 3. STOCK LEDGER ADJUSTMENT TRANSACTIONS AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- [3] STOCK LEDGER LINKAGE FOR ADJUSTMENTS ---');
    const adjustmentLedgers = await prisma.stockLedger.findMany({
      where: { transactionType: 'ADJUSTMENT' },
      select: {
        id: true,
        referenceType: true,
        referenceId: true,
        quantity: true,
        rate: true,
        itemId: true,
        createdAt: true
      }
    });

    console.log(`Total StockLedger records of type ADJUSTMENT: ${adjustmentLedgers.length}`);
    const ledgerNetQty = adjustmentLedgers.reduce((acc, l) => acc + Number(l.quantity), 0);
    console.log(`Net quantity recorded in StockLedger for adjustments: ${ledgerNetQty.toFixed(3)} units`);

    // Compare with adjustment items quantity sum
    const allAdjItemsSum = await prisma.inventoryAdjustmentItem.aggregate({
      _sum: { quantity: true, amount: true },
      _count: { id: true }
    });
    console.log(`Sum from InventoryAdjustmentItem table: ${Number(allAdjItemsSum._sum.quantity || 0).toFixed(3)} units across ${allAdjItemsSum._count.id} rows`);
    const diff = Math.abs(ledgerNetQty - Number(allAdjItemsSum._sum.quantity || 0));
    console.log(`Discrepancy between StockLedger and Adjustment Items: ${diff < 0.001 ? 'NONE (0.000) - PERFECT MATCH' : diff.toFixed(3) + ' units'}`);

    // -------------------------------------------------------------------------
    // 4. FINANCIAL LEDGER (VOUCHER / JOURNAL) FOR ADJUSTMENTS
    // -------------------------------------------------------------------------
    console.log('\n--- [4] FINANCIAL POSTING & COA IMPACT ---');
    // Gain account 4010
    const gainLines = await prisma.voucherLine.findMany({
      where: {
        ChartOfAccount: { code: '4010' }
      },
      select: { creditAmount: true, debitAmount: true, voucherId: true }
    });
    const totalGainCredited = gainLines.reduce((acc, l) => acc + Number(l.creditAmount), 0);

    // Expense account 6200
    const expenseLines = await prisma.voucherLine.findMany({
      where: {
        ChartOfAccount: { code: '6200' }
      },
      select: { creditAmount: true, debitAmount: true, voucherId: true }
    });
    const totalExpenseDebited = expenseLines.reduce((acc, l) => acc + Number(l.debitAmount), 0);

    // Asset account 1600 from adjustment vouchers
    const adjVoucherIds = allAdjustments.map(a => a.voucherId).filter(Boolean);
    const assetLines = await prisma.voucherLine.findMany({
      where: {
        voucherId: { in: adjVoucherIds },
        ChartOfAccount: { code: '1600' }
      },
      select: { creditAmount: true, debitAmount: true }
    });
    const totalAssetDebited = assetLines.reduce((acc, l) => acc + Number(l.debitAmount), 0);
    const totalAssetCredited = assetLines.reduce((acc, l) => acc + Number(l.creditAmount), 0);
    const netAssetAdjustment = totalAssetDebited - totalAssetCredited;

    console.log(`- Total Gain Account (4010) Credited: ৳${totalGainCredited.toFixed(2)} (Calculated Gain Val: ৳${positiveAdjustmentsVal.toFixed(2)})`);
    console.log(`- Total Expense Account (6200) Debited: ৳${totalExpenseDebited.toFixed(2)} (Calculated Loss Val: ৳${negativeAdjustmentsVal.toFixed(2)})`);
    console.log(`- Net Inventory Asset (1600) Impact: ৳${netAssetAdjustment.toFixed(2)}`);
    console.log(`- Gain Posting Match: ${Math.abs(totalGainCredited - positiveAdjustmentsVal) < 0.1 ? 'EXACT MATCH' : 'DIFF: ' + (totalGainCredited - positiveAdjustmentsVal).toFixed(2)}`);
    console.log(`- Expense Posting Match: ${Math.abs(totalExpenseDebited - negativeAdjustmentsVal) < 0.1 ? 'EXACT MATCH' : 'DIFF: ' + (totalExpenseDebited - negativeAdjustmentsVal).toFixed(2)}`);

    // -------------------------------------------------------------------------
    // 5. REPORT INTEGRATION VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- [5] REPORTS VERIFICATION ---');
    console.log('Checking how adjustments and count data appear in key reports:');
    
    // Check Stock Ledger Report query logic for Adjustments
    const sampleItem = await prisma.inventoryAdjustmentItem.findFirst({
      select: { itemId: true, item: { select: { name: true, code: true } } }
    });
    
    if (sampleItem) {
      const sampleItemLedger = await prisma.stockLedger.findMany({
        where: { itemId: sampleItem.itemId },
        orderBy: { createdAt: 'asc' }
      });
      console.log(`\nSample Item Stock Ledger [${sampleItem.item.code}] "${sampleItem.item.name}" has ${sampleItemLedger.length} total entries:`);
      sampleItemLedger.forEach(e => {
        console.log(`  - Date: ${e.createdAt.toISOString().split('T')[0]} | Type: ${e.transactionType} | Qty: ${Number(e.quantity) > 0 ? '+' + e.quantity : e.quantity} | Rate: ৳${e.rate || 0}`);
      });
    }

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdjustmentsAndCountReports();
