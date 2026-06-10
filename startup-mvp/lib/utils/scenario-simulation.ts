import { prisma } from "@/lib/prisma";
import { 
  createPurchase, 
} from "@/app/(dashboard)/dashboard/procurements/purchases/_actions/purchase.action";
import { 
  createVoucher, 
  postVoucher 
} from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { 
  startProductionOrder, 
  completeProductionOrder, 
  createProductionOrder 
} from "@/app/(dashboard)/dashboard/production/orders/_actions/production.action";
import { 
  createSale, 
  completeSale 
} from "@/app/(dashboard)/dashboard/sales/_actions/sale.action";
import { PurchaseStatus, SaleStatus } from "@prisma/client";

/**
 * Helper to get account balance
 */
async function getBalance(accountName: string): Promise<number> {
  const account = await prisma.chartOfAccount.findFirst({
    where: { name: { contains: accountName, mode: "insensitive" } }
  });
  if (!account) return 0;

  const result = await prisma.journalEntryLine.aggregate({
    where: { chartOfAccountId: account.id },
    _sum: { debitAmount: true, creditAmount: true }
  });

  const debit = Number(result._sum.debitAmount || 0);
  const credit = Number(result._sum.creditAmount || 0);

  // Asset/Expense: Debit - Credit
  // Liability/Equity/Revenue: Credit - Debit
  const type = account.type;
  if (["ASSET", "EXPENSE"].includes(type)) {
    return debit - credit;
  } else {
    return credit - debit;
  }
}

/**
 * Helper to get stock quantity
 */
async function getStockQty(itemName: string): Promise<number> {
  const item = await prisma.item.findFirst({
    where: { name: { contains: itemName, mode: "insensitive" } }
  });
  if (!item) return 0;

  const stock = await prisma.stock.aggregate({
    where: { itemId: item.id },
    _sum: { quantity: true }
  });

  return Number(stock._sum.quantity || 0);
}

/**
 * Log current state
 */
async function auditState(step: string) {
  const rmInv = await getBalance("Raw Material Inventory");
  const fgInv = await getBalance("Ready Products Inventory");
  const wip = await getBalance("Work In Progress");
  const ap = await getBalance("Accounts Payable");
  const ar = await getBalance("Accounts Receivable");
  const cash = await getBalance("Cash on Hand");
  
  const rmQty = await getStockQty("Cotton Single Jersey Fabric");
  const fgQty = await getStockQty("Basic Crew Neck T-shirt");

  console.log(`\n--- Step: ${step} ---`);
  console.log(`GL Balances: RM: ${rmInv}, FG: ${fgInv}, WIP: ${wip}, AP: ${ap}, AR: ${ar}, Cash: ${cash}`);
  console.log(`Stock Qty: RM: ${rmQty}, FG: ${fgQty}`);
}

/**
 * Run Scenario
 */
export async function runScenario() {
  console.log("🚀 Starting ERP Accounting Scenario Simulation...");

  // Setup: Find IDs
  const supplier = await prisma.supplier.findFirst();
  const client = await prisma.client.findFirst();
  const warehouse = await prisma.warehouse.findFirst();
  const rmItem = await prisma.item.findFirst({ where: { name: { contains: "Cotton Single Jersey Fabric" } } });
  const fgItem = await prisma.item.findFirst({ where: { name: { contains: "Basic Crew Neck T-shirt" } } });
  const bom = await prisma.bOM.findFirst({ where: { itemId: fgItem?.id } });

  if (!supplier || !client || !warehouse || !rmItem || !fgItem || !bom) {
    throw new Error("Missing master data for simulation");
  }

  await auditState("Initial");

  // 1. Purchase Raw Material (credit) - 100kg @ 120
  console.log("\n1. Purchasing RM on credit...");
  const purchaseResult = await createPurchase({
    supplierId: supplier.id,
    warehouseId: warehouse.id,
    date: new Date(),
    status: PurchaseStatus.RECEIVED,
    items: [{
      itemId: rmItem.id,
      description: "Cotton Single Jersey Fabric",
      quantity: 100,
      unitPrice: 450,
      amount: 45000
    }]
  });
  if (!purchaseResult.success) throw new Error(purchaseResult.error);
  
  // Ensure stock and voucher are created (if not automatic)
  await auditState("Purchase RM");

  // 2. Pay supplier partially - 5000
  console.log("\n2. Paying supplier partially...");
  const cashAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Cash on Hand" } });
  const apAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Accounts Payable" } });
  
  if (cashAccount && apAccount) {
    const paymentVoucher = await createVoucher({
      type: "PAYMENT",
      supplierId: supplier.id,
      date: new Date(),
      isSystemAction: true,
      lines: [
        { lineNumber: 1, chartOfAccountId: apAccount.id, debitAmount: 5000, creditAmount: 0, supplierId: supplier.id },
        { lineNumber: 2, chartOfAccountId: cashAccount.id, debitAmount: 0, creditAmount: 5000 }
      ]
    });
    if (paymentVoucher.success && paymentVoucher.voucher) {
      await postVoucher(paymentVoucher.voucher.id);
    }
  }
  await auditState("Partial Payment");

  // 3. Start production - 10 units
  console.log("\n3. Starting production...");
  const orderResult = await createProductionOrder({
    bomId: bom.id,
    warehouseId: warehouse.id,
    quantity: 10
  });
  if (orderResult.success && orderResult.order) {
    await startProductionOrder(orderResult.order.id);
  }
  await auditState("Start Production");

  // 4. Complete production
  console.log("\n4. Completing production...");
  if (orderResult.order) {
    await completeProductionOrder(orderResult.order.id);
  }
  await auditState("Complete Production");

  // 5. Sell FG on credit - 5 units @ 320
  console.log("\n5. Selling FG on credit...");
  const saleResult = await createSale({
    clientId: client.id,
    warehouseId: warehouse.id,
    date: new Date(),
    status: SaleStatus.COMPLETED,
    orderType: "RETAIL",
    items: [{
      itemId: fgItem.id,
      description: "Basic Crew Neck T-shirt",
      quantity: 5,
      unitPrice: 350,
      amount: 1750
    }]
  });
  // Note: completeSale might need to be called manually if createSale doesn't auto-complete
  if (saleResult.success && saleResult.sale) {
    await completeSale((saleResult.sale as any).id);
  }
  await auditState("Sell FG");

  // 6. Receive customer payment - 1000
  console.log("\n6. Receiving customer payment...");
  const arAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Accounts Receivable" } });
  if (cashAccount && arAccount) {
    const receiptVoucher = await createVoucher({
      type: "RECEIPT",
      clientId: client.id,
      date: new Date(),
      isSystemAction: true,
      lines: [
        { lineNumber: 1, chartOfAccountId: cashAccount.id, debitAmount: 1000, creditAmount: 0 },
        { lineNumber: 2, chartOfAccountId: arAccount.id, debitAmount: 0, creditAmount: 1000, clientId: client.id }
      ]
    });
    if (receiptVoucher.success && receiptVoucher.voucher) {
      await postVoucher(receiptVoucher.voucher.id);
    }
  }
  await auditState("Receive Payment");

  console.log("\n✅ ERP Accounting Scenario Simulation Complete.");
}

runScenario().catch(console.error);
