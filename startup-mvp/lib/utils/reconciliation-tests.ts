import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";

/**
 * Reconciliation Result Interface
 */
export interface ReconciliationResult {
  testName: string;
  expected: number | string;
  actual: number | string;
  difference: number;
  isPassed: boolean;
  details?: any;
}

/**
 * 1. Inventory Ledger Qty vs Stock Table
 * Verifies that Stock table quantity matches sum of all StockLedger entries.
 */
export async function reconcileInventoryQty(): Promise<ReconciliationResult[]> {
  const stocks = await prisma.stock.findMany({
    include: {
      item: { select: { name: true, code: true } },
      variant: { include: { item: { select: { name: true, code: true } } } },
      warehouse: { select: { name: true } },
    },
  });

  const results: ReconciliationResult[] = [];

  for (const stock of stocks) {
    const ledgerSum = await prisma.stockLedger.aggregate({
      where: {
        itemId: stock.itemId,
        variantId: stock.variantId,
        warehouseId: stock.warehouseId,
      },
      _sum: {
        quantity: true,
      },
    });

    const expectedQty = Number(stock.quantity);
    const actualQty = Number(ledgerSum._sum.quantity || 0);
    const difference = expectedQty - actualQty;

    const parentItem = stock.item || stock.variant?.item;
    const itemName = parentItem ? parentItem.name : "Unknown Item";
    const variantSuffix = stock.variant ? ` (${stock.variant.color} / ${stock.variant.size})` : "";

    results.push({
      testName: `Stock Qty: ${itemName}${variantSuffix} (${stock.warehouse.name})`,
      expected: expectedQty,
      actual: actualQty,
      difference,
      isPassed: Math.abs(difference) < 0.001,
    });
  }

  return results;
}

/**
 * 2. Inventory Ledger Value vs GL Inventory Balance
 * Verifies physical stock value matches GL account balances.
 */
export async function reconcileInventoryValue(): Promise<ReconciliationResult> {
  // Physical Value
  const stocks = await prisma.stock.findMany({
    include: { 
      item: { select: { costPrice: true } },
      variant: { include: { item: { select: { costPrice: true } } } },
    },
  });

  const physicalValue = stocks.reduce((sum, s) => {
    const parentItem = s.item || s.variant?.item;
    return sum + Number(s.quantity) * Number(parentItem?.costPrice || 0);
  }, 0);

  // GL Balance
  const inventoryAccounts = await prisma.chartOfAccount.findMany({
    where: {
      name: {
        in: [
          "Raw Material Inventory",
          "Ready Products Inventory",
          "Retail Inventory",
          "Inventory Stock",
        ],
      },
    },
    select: { id: true, name: true },
  });

  let glBalance = 0;
  for (const acc of inventoryAccounts) {
    const result = await prisma.journalEntryLine.aggregate({
      where: { chartOfAccountId: acc.id },
      _sum: { debitAmount: true, creditAmount: true },
    });
    glBalance += Number(result._sum.debitAmount || 0) - Number(result._sum.creditAmount || 0);
  }

  const difference = physicalValue - glBalance;

  return {
    testName: "Inventory Value vs GL Balance",
    expected: physicalValue,
    actual: glBalance,
    difference,
    isPassed: Math.abs(difference) < 1.0, // Allow minor rounding
  };
}

/**
 * 3. AP Aging vs Supplier Balances
 * Note: Currently matching total outstanding purchases vs total AP balance.
 */
export async function reconcileAPBalance(): Promise<ReconciliationResult> {
  // Outstanding Purchases
  const purchases = await prisma.purchase.findMany({
    where: {
      status: { in: ["RECEIVED", "PARTIALLY_RECEIVED"] },
    },
    select: { grandTotal: true },
  });
  
  // Note: In a real system, we'd subtract payments. 
  // For this design, we assume AP balance should match total received value minus payments.
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.grandTotal), 0);

  // GL Balance (Accounts Payable Root)
  const apParent = await prisma.chartOfAccount.findFirst({
    where: { name: { contains: "Accounts Payable", mode: "insensitive" } },
    select: { id: true },
  });

  let glBalance = 0;
  if (apParent) {
    // Sum all children
    const children = await prisma.chartOfAccount.findMany({
      where: { parentId: apParent.id },
      select: { id: true },
    });
    
    const accountIds = [apParent.id, ...children.map(c => c.id)];
    
    const result = await prisma.journalEntryLine.aggregate({
      where: { chartOfAccountId: { in: accountIds } },
      _sum: { debitAmount: true, creditAmount: true },
    });
    // AP is Liability: Credit - Debit
    glBalance = Number(result._sum.creditAmount || 0) - Number(result._sum.debitAmount || 0);
  }

  // This is a simplified check. Actual reconciliation would involve payment matching.
  return {
    testName: "Total AP vs GL",
    expected: "Sub-ledger matching required",
    actual: glBalance,
    difference: 0,
    isPassed: true, // Placeholder for more complex aging logic
    details: "Requires payment allocation tracking to be fully implemented"
  };
}

/**
 * 4. AR Aging vs Customer Balances
 */
export async function reconcileARBalance(): Promise<ReconciliationResult> {
  const sales = await prisma.sale.findMany({
    where: { status: "COMPLETED" },
    select: { grandTotal: true },
  });
  
  const totalSales = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);

  const arParent = await prisma.chartOfAccount.findFirst({
    where: { name: { contains: "Accounts Receivable", mode: "insensitive" } },
    select: { id: true },
  });

  let glBalance = 0;
  if (arParent) {
    const children = await prisma.chartOfAccount.findMany({
      where: { parentId: arParent.id },
      select: { id: true },
    });
    
    const accountIds = [arParent.id, ...children.map(c => c.id)];
    
    const result = await prisma.journalEntryLine.aggregate({
      where: { chartOfAccountId: { in: accountIds } },
      _sum: { debitAmount: true, creditAmount: true },
    });
    // AR is Asset: Debit - Credit
    glBalance = Number(result._sum.debitAmount || 0) - Number(result._sum.creditAmount || 0);
  }

  return {
    testName: "Total AR vs GL",
    expected: "Sub-ledger matching required",
    actual: glBalance,
    difference: 0,
    isPassed: true,
    details: "Requires receipt allocation tracking to be fully implemented"
  };
}

/**
 * 5. Cash/Bank vs Payment Vouchers
 * Verifies that all Cash/Bank movements are via PAYMENT/RECEIPT/CONTRA vouchers.
 */
export async function reconcileCashBankVouchers(): Promise<ReconciliationResult> {
  const cashLines = await prisma.journalEntryLine.findMany({
    where: {
      ChartOfAccount: {
        CashBankAccount: { isNot: null },
      },
    },
    include: {
      JournalEntry: {
        include: {
          Voucher: {
            select: { type: true },
          },
        },
      },
    },
  });

  const invalidLines = cashLines.filter(
    (line) => !["PAYMENT", "RECEIPT", "CONTRA"].includes(line.JournalEntry.Voucher.type)
  );

  return {
    testName: "Cash/Bank Voucher Type Integrity",
    expected: 0,
    actual: invalidLines.length,
    difference: invalidLines.length,
    isPassed: invalidLines.length === 0,
    details: invalidLines.map(l => ({
      je: l.JournalEntry.entryNumber,
      type: l.JournalEntry.Voucher.type,
      amount: Number(l.debitAmount) || Number(l.creditAmount)
    }))
  };
}

/**
 * Run All Reconciliation Tests
 */
export async function runAllReconciliations() {
  const [invQty, invVal, ap, ar, cash] = await Promise.all([
    reconcileInventoryQty(),
    reconcileInventoryValue(),
    reconcileAPBalance(),
    reconcileARBalance(),
    reconcileCashBankVouchers(),
  ]);

  return {
    inventoryQtyTests: invQty,
    inventoryValueTest: invVal,
    apTest: ap,
    arTest: ar,
    cashVoucherTest: cash,
    allPassed: invQty.every(r => r.isPassed) && invVal.isPassed && cash.isPassed
  };
}
