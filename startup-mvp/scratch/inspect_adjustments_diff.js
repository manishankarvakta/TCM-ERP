const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectDiscrepancy() {
  console.log('--- INSPECTING 58 UNIT DISCREPANCY & COA 6200/4010 VOUCHERS ---');

  // 1. Check all StockLedger ADJUSTMENT records vs InventoryAdjustmentItem records
  const adjustments = await prisma.inventoryAdjustment.findMany({
    include: {
      items: true
    }
  });

  for (const adj of adjustments) {
    const adjItemsQtySum = adj.items.reduce((s, it) => s + Number(it.quantity), 0);
    const ledgers = await prisma.stockLedger.findMany({
      where: {
        referenceType: 'INVENTORY_ADJUSTMENT',
        referenceId: adj.id
      }
    });
    const ledgerQtySum = ledgers.reduce((s, l) => s + Number(l.quantity), 0);

    if (Math.abs(adjItemsQtySum - ledgerQtySum) > 0.001) {
      console.log(`[MISMATCH in Adj ${adj.adjustmentNumber}] Adj Items Sum = ${adjItemsQtySum}, StockLedger Sum = ${ledgerQtySum}, Adj Items Count = ${adj.items.length}, StockLedger Count = ${ledgers.length}`);
    }
  }

  // Check if there are StockLedger ADJUSTMENT entries not linked by referenceId
  const unlinkedLedgers = await prisma.stockLedger.findMany({
    where: {
      transactionType: 'ADJUSTMENT',
      referenceType: { not: 'INVENTORY_ADJUSTMENT' }
    }
  });
  console.log(`StockLedger ADJUSTMENT entries with referenceType != INVENTORY_ADJUSTMENT: ${unlinkedLedgers.length}`);
  unlinkedLedgers.forEach(l => {
    console.log(`  - RefType: ${l.referenceType}, RefId: ${l.referenceId}, Qty: ${l.quantity}, ItemId: ${l.itemId}`);
  });

  // 2. Check which vouchers touch 4010 and 6200 that are NOT from InventoryAdjustment
  const adjVoucherIds = adjustments.map(a => a.voucherId).filter(Boolean);

  const nonAdjGainLines = await prisma.voucherLine.findMany({
    where: {
      ChartOfAccount: { code: '4010' },
      voucherId: { notIn: adjVoucherIds }
    },
    include: { Voucher: true }
  });
  console.log(`\nNon-Adjustment Voucher Lines for 4010 (Gain): ${nonAdjGainLines.length}`);
  nonAdjGainLines.forEach(l => {
    console.log(`  - Voucher: ${l.Voucher?.voucherNumber} (${l.Voucher?.type}) | Credit: ${l.creditAmount} | Desc: ${l.description}`);
  });

  const nonAdjExpenseLines = await prisma.voucherLine.findMany({
    where: {
      ChartOfAccount: { code: '6200' },
      voucherId: { notIn: adjVoucherIds }
    },
    include: { Voucher: true }
  });
  console.log(`\nNon-Adjustment Voucher Lines for 6200 (Expense): ${nonAdjExpenseLines.length}`);
  nonAdjExpenseLines.forEach(l => {
    console.log(`  - Voucher: ${l.Voucher?.voucherNumber} (${l.Voucher?.type}) | Debit: ${l.debitAmount} | Desc: ${l.description}`);
  });

  await prisma.$disconnect();
}

inspectDiscrepancy();
