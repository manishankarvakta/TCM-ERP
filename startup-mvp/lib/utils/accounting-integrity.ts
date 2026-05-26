import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";

/**
 * Interface for integrity check results
 */
export interface IntegrityResult {
  module: string;
  subLedgerBalance: number;
  glControlBalance: number;
  difference: number;
  isBalanced: boolean;
  details?: unknown;
}

/**
 * Helper to calculate account balance from JournalEntryLine
 */
async function getAccountBalance(accountId: string): Promise<number> {
  const result = await prisma.journalEntryLine.aggregate({
    where: { chartOfAccountId: accountId },
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
  });

  const debit = Number(result._sum.debitAmount || 0);
  const credit = Number(result._sum.creditAmount || 0);
  
  // Return debit - credit (normal for Assets)
  return debit - credit;
}

/**
 * Check Accounts Receivable Integrity
 * Compares sum of all Customer COA balances vs conceptual AR total
 */
export async function checkARIntegrity(): Promise<IntegrityResult> {
  // 1. Find AR Parent Account
  const arParent = await prisma.chartOfAccount.findFirst({
    where: { name: { contains: "Accounts Receivable", mode: "insensitive" }, type: AccountType.ASSET },
    select: { id: true }
  });

  if (!arParent) {
    return { module: "AR", subLedgerBalance: 0, glControlBalance: 0, difference: 0, isBalanced: true, details: "AR account not found" };
  }

  // 2. Get all child accounts (Customer accounts)
  const childAccounts = await prisma.chartOfAccount.findMany({
    where: { parentId: arParent.id },
    select: { id: true, name: true, code: true }
  });

  // 3. Sum balances of all child accounts (Sub-ledger)
  let subLedgerTotal = 0;
  const details = [];

  for (const acc of childAccounts) {
    const balance = await getAccountBalance(acc.id);
    subLedgerTotal += balance;
    if (balance !== 0) {
      details.push({ name: acc.name, code: acc.code, balance });
    }
  }

  // 4. Get balance of the parent account itself (should be 0 or represent unallocated entries)
  const parentBalance = await getAccountBalance(arParent.id);
  
  // GL Control Balance = Sum of children + Parent balance
  const glTotal = subLedgerTotal + parentBalance;

  return {
    module: "Accounts Receivable",
    subLedgerBalance: subLedgerTotal,
    glControlBalance: glTotal,
    difference: parentBalance, // Any balance on parent is a technical difference from sub-ledger
    isBalanced: Math.abs(parentBalance) < 0.01,
    details: {
      customerBalancesCount: details.length,
      unallocatedParentBalance: parentBalance,
    }
  };
}

/**
 * Check Accounts Payable Integrity
 * Compares sum of all Supplier COA balances vs conceptual AP total
 */
export async function checkAPIntegrity(): Promise<IntegrityResult> {
  const apParent = await prisma.chartOfAccount.findFirst({
    where: { name: { contains: "Accounts Payable", mode: "insensitive" }, type: AccountType.LIABILITY },
    select: { id: true }
  });

  if (!apParent) {
    return { module: "AP", subLedgerBalance: 0, glControlBalance: 0, difference: 0, isBalanced: true, details: "AP account not found" };
  }

  const childAccounts = await prisma.chartOfAccount.findMany({
    where: { parentId: apParent.id },
    select: { id: true, name: true, code: true }
  });

  let subLedgerTotal = 0;
  const details = [];

  for (const acc of childAccounts) {
    const balance = await getAccountBalance(acc.id);
    subLedgerTotal += balance; // Note: For AP, balance is credit - debit usually, but we stay consistent
    if (balance !== 0) {
      details.push({ name: acc.name, code: acc.code, balance });
    }
  }

  const parentBalance = await getAccountBalance(apParent.id);
  const glTotal = subLedgerTotal + parentBalance;

  return {
    module: "Accounts Payable",
    subLedgerBalance: subLedgerTotal,
    glControlBalance: glTotal,
    difference: parentBalance,
    isBalanced: Math.abs(parentBalance) < 0.01,
    details: {
      supplierBalancesCount: details.length,
      unallocatedParentBalance: parentBalance,
    }
  };
}

/**
 * Check Inventory Integrity
 * Compares physical stock value (qty * cost) vs GL inventory balances
 */
export async function checkInventoryIntegrity(): Promise<IntegrityResult> {
  // 1. Calculate Physical Stock Value (Sub-ledger)
  const stocks = await prisma.stock.findMany({
    include: { 
      item: { select: { costPrice: true } },
      variant: { include: { item: { select: { costPrice: true } } } }
    }
  });

  const physicalTotal = stocks.reduce((sum, stock) => {
    const parentItem = stock.item || stock.variant?.item;
    return sum + (Number(stock.quantity) * Number(parentItem?.costPrice || 0));
  }, 0);

  // 2. Calculate GL Inventory Balances
  const inventoryAccounts = [
    "Raw Material Inventory",
    "Ready Products Inventory",
    "Retail Inventory",
    "Inventory Stock"
  ];

  let glTotal = 0;
  const accountDetails = [];

  for (const name of inventoryAccounts) {
    const account = await prisma.chartOfAccount.findFirst({
      where: { name: { contains: name, mode: "insensitive" }, type: AccountType.ASSET },
      select: { id: true, name: true }
    });

    if (account) {
      const balance = await getAccountBalance(account.id);
      glTotal += balance;
      accountDetails.push({ name: account.name, balance });
    }
  }

  const difference = physicalTotal - glTotal;

  return {
    module: "Inventory",
    subLedgerBalance: physicalTotal,
    glControlBalance: glTotal,
    difference: difference,
    isBalanced: Math.abs(difference) < 1.0, // Allow minor rounding differences in inventory
    details: {
      accountDetails,
      stockRecordsCount: stocks.length
    }
  };
}

/**
 * Check Production & WIP Integrity
 * Verifies if WIP account balance matches active production orders value
 */
export async function checkProductionIntegrity(): Promise<IntegrityResult> {
  // 1. Calculate Active Production Value (Sub-ledger)
  // We sum the cost of materials for all IN_PROGRESS orders
  const activeOrders = await prisma.productionOrder.findMany({
    where: { status: "IN_PROGRESS" },
    include: {
      bom: {
        include: {
          items: {
            include: {
              item: {
                select: { costPrice: true }
              }
            }
          }
        }
      }
    }
  });

  let activeProductionValue = 0;
  for (const order of activeOrders) {
    const productionQuantity = Number(order.quantity);
    const bomQuantityPerUnit = Number(order.bom.quantityPerUnit);

    for (const bomItem of order.bom.items) {
      const quantityNeeded = (Number(bomItem.quantityRequired) * productionQuantity) / bomQuantityPerUnit;
      const costPrice = Number(bomItem.item.costPrice || 0);
      activeProductionValue += quantityNeeded * costPrice;
    }
  }

  // 2. Get WIP GL Balance
  const wipAccount = await prisma.chartOfAccount.findFirst({
    where: { name: { contains: "Work In Progress", mode: "insensitive" }, type: AccountType.ASSET },
    select: { id: true, name: true }
  });

  let glWipBalance = 0;
  if (wipAccount) {
    glWipBalance = await getAccountBalance(wipAccount.id);
  }

  const difference = activeProductionValue - glWipBalance;

  return {
    module: "Production (WIP)",
    subLedgerBalance: activeProductionValue,
    glControlBalance: glWipBalance,
    difference: difference,
    isBalanced: Math.abs(difference) < 1.0,
    details: {
      activeOrdersCount: activeOrders.length,
      wipAccountName: wipAccount?.name || "Not Found"
    }
  };
}

/**
 * Run all integrity checks
 */
export async function runFullIntegrityAudit() {
  const [ar, ap, inventory, production] = await Promise.all([
    checkARIntegrity(),
    checkAPIntegrity(),
    checkInventoryIntegrity(),
    checkProductionIntegrity()
  ]);

  return {
    timestamp: new Date(),
    results: [ar, ap, inventory, production],
    allPassed: ar.isBalanced && ap.isBalanced && inventory.isBalanced && production.isBalanced
  };
}
