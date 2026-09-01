require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING FRESH START DATABASE CLEANUP ---');

  // 1. Identify Employee COA IDs (DO NOT DELETE)
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, salaryPayableAccountId: true, advanceAccountId: true }
  });
  const empAccountIds = new Set();
  employees.forEach(e => {
    if (e.salaryPayableAccountId) empAccountIds.add(e.salaryPayableAccountId);
    if (e.advanceAccountId) empAccountIds.add(e.advanceAccountId);
  });
  console.log(`[PRESERVE] Found ${employees.length} employees with ${empAccountIds.size} linked COA accounts.`);

  // 2. Identify Cash/Bank/MFS COA IDs (DO NOT DELETE)
  const cashBankAccounts = await prisma.cashBankAccount.findMany({
    select: { chartOfAccountId: true }
  });
  const cashBankCoaIds = new Set(cashBankAccounts.map(c => c.chartOfAccountId).filter(Boolean));
  console.log(`[PRESERVE] Found ${cashBankAccounts.length} Cash/Bank/MFS accounts linked to ${cashBankCoaIds.size} COA accounts.`);

  // 3. Find Client and Supplier COA IDs to purge
  const clientCoas = await prisma.chartOfAccount.findMany({
    where: {
      AND: [
        {
          OR: [
            { code: { startsWith: 'AR-' } },
            { description: { contains: 'customer', mode: 'insensitive' } },
            { description: { contains: 'client', mode: 'insensitive' } }
          ]
        },
        { code: { not: '1120' } } // preserve control account 1120
      ]
    },
    select: { id: true, code: true, name: true }
  });

  const supplierCoas = await prisma.chartOfAccount.findMany({
    where: {
      AND: [
        {
          OR: [
            { code: { startsWith: 'AP-' } },
            { description: { contains: 'supplier', mode: 'insensitive' } },
            { description: { contains: 'vendor', mode: 'insensitive' } }
          ]
        },
        { code: { not: '2110' } } // preserve control account 2110
      ]
    },
    select: { id: true, code: true, name: true }
  });

  // Filter out any that might be in empAccountIds or cashBankCoaIds
  const coaIdsToDelete = [...clientCoas, ...supplierCoas]
    .map(c => c.id)
    .filter(id => !empAccountIds.has(id) && !cashBankCoaIds.has(id));

  console.log(`[PURGE] Identified ${clientCoas.length} Client COAs and ${supplierCoas.length} Supplier COAs (Total to purge: ${coaIdsToDelete.length}).`);

  console.log('\n--- EXECUTING DELETIONS IN TRANSACTION ---');
  await prisma.$transaction(async (tx) => {
    // A. Financial & Accounting Lines and Headers (JournalEntry references Voucher, so delete JournalEntry first)
    const jLines = await tx.journalEntryLine.deleteMany({});
    console.log(`Deleted ${jLines.count} JournalEntryLine records.`);

    const jHeaders = await tx.journalEntry.deleteMany({});
    console.log(`Deleted ${jHeaders.count} JournalEntry records.`);

    const vLines = await tx.voucherLine.deleteMany({});
    console.log(`Deleted ${vLines.count} VoucherLine records.`);
    
    const vHeaders = await tx.voucher.deleteMany({});
    console.log(`Deleted ${vHeaders.count} Voucher records.`);

    // B. POS & Sales Data
    const posDenom = await tx.pOSCashDenomination.deleteMany({});
    console.log(`Deleted ${posDenom.count} POSCashDenomination records.`);

    const posColl = await tx.pOSClosingCollection.deleteMany({});
    console.log(`Deleted ${posColl.count} POSClosingCollection records.`);

    const posSess = await tx.pOSClosingSession.deleteMany({});
    console.log(`Deleted ${posSess.count} POSClosingSession records.`);

    const saleItems = await tx.saleItem.deleteMany({});
    console.log(`Deleted ${saleItems.count} SaleItem records.`);

    const sales = await tx.sale.deleteMany({});
    console.log(`Deleted ${sales.count} Sale records.`);

    const coupons = await tx.coupon.deleteMany({});
    console.log(`Deleted ${coupons.count} Coupon records.`);

    // C. Procurement, Purchasing, GRN, Returns
    const rtvItems = await tx.returnToVendorItem.deleteMany({});
    console.log(`Deleted ${rtvItems.count} ReturnToVendorItem records.`);

    const rtvs = await tx.returnToVendor.deleteMany({});
    console.log(`Deleted ${rtvs.count} ReturnToVendor records.`);

    const grnItems = await tx.gRNItem.deleteMany({});
    console.log(`Deleted ${grnItems.count} GRNItem records.`);

    const grns = await tx.gRN.deleteMany({});
    console.log(`Deleted ${grns.count} GRN records.`);

    const tpnItems = await tx.transferPurchaseNoteItem.deleteMany({});
    console.log(`Deleted ${tpnItems.count} TransferPurchaseNoteItem records.`);

    const tpns = await tx.transferPurchaseNote.deleteMany({});
    console.log(`Deleted ${tpns.count} TransferPurchaseNote records.`);

    const pItems = await tx.purchaseItem.deleteMany({});
    console.log(`Deleted ${pItems.count} PurchaseItem records.`);

    const purchases = await tx.purchase.deleteMany({});
    console.log(`Deleted ${purchases.count} Purchase records.`);

    // D. Inventory, Items, Stock & Ledgers
    const stockLedgers = await tx.stockLedger.deleteMany({});
    console.log(`Deleted ${stockLedgers.count} StockLedger records.`);

    const stocks = await tx.stock.deleteMany({});
    console.log(`Deleted ${stocks.count} Stock records.`);

    const adjItems = await tx.inventoryAdjustmentItem.deleteMany({});
    console.log(`Deleted ${adjItems.count} InventoryAdjustmentItem records.`);

    const adjs = await tx.inventoryAdjustment.deleteMany({});
    console.log(`Deleted ${adjs.count} InventoryAdjustment records.`);

    const dmgItems = await tx.inventoryDamageItem.deleteMany({});
    console.log(`Deleted ${dmgItems.count} InventoryDamageItem records.`);

    const dmgs = await tx.inventoryDamage.deleteMany({});
    console.log(`Deleted ${dmgs.count} InventoryDamage records.`);

    const countEntries = await tx.inventoryCountEntry.deleteMany({});
    console.log(`Deleted ${countEntries.count} InventoryCountEntry records.`);

    const addStockEntries = await tx.inventoryAddStockEntry.deleteMany({});
    console.log(`Deleted ${addStockEntries.count} InventoryAddStockEntry records.`);

    const items = await tx.item.deleteMany({});
    console.log(`Deleted ${items.count} Item records.`);

    const categories = await tx.category.deleteMany({});
    console.log(`Deleted ${categories.count} Category records.`);

    const brands = await tx.brand.deleteMany({});
    console.log(`Deleted ${brands.count} Brand records.`);

    const units = await tx.unit.deleteMany({});
    console.log(`Deleted ${units.count} Unit records.`);

    // E. Clients & Suppliers
    const clientDiscounts = await tx.clientItemDiscount.deleteMany({});
    console.log(`Deleted ${clientDiscounts.count} ClientItemDiscount records.`);

    const clientAddresses = await tx.clientAddress.deleteMany({});
    console.log(`Deleted ${clientAddresses.count} ClientAddress records.`);

    const clientsDel = await tx.client.deleteMany({});
    console.log(`Deleted ${clientsDel.count} Client records.`);

    const suppliersDel = await tx.supplier.deleteMany({});
    console.log(`Deleted ${suppliersDel.count} Supplier records.`);

    // F. Client & Supplier COA Accounts
    if (coaIdsToDelete.length > 0) {
      const coasDel = await tx.chartOfAccount.deleteMany({
        where: { id: { in: coaIdsToDelete } }
      });
      console.log(`Deleted ${coasDel.count} Client/Supplier ChartOfAccount records.`);
    }

    // G. Operational Logs & Operational Transactions
    const userLogs = await tx.userLog.deleteMany({});
    console.log(`Deleted ${userLogs.count} UserLog records.`);

    const sessions = await tx.session.deleteMany({});
    console.log(`Deleted ${sessions.count} Session records.`);

    const files = await tx.file.deleteMany({});
    console.log(`Deleted ${files.count} File records.`);

    const notifications = await tx.notification.deleteMany({});
    console.log(`Deleted ${notifications.count} Notification records.`);

    const attendances = await tx.attendance.deleteMany({});
    console.log(`Deleted ${attendances.count} Attendance records.`);

    const leaveApps = await tx.leaveApplication.deleteMany({});
    console.log(`Deleted ${leaveApps.count} LeaveApplication records.`);

    const loans = await tx.employeeLoan.deleteMany({});
    console.log(`Deleted ${loans.count} EmployeeLoan records.`);
  }, {
    maxWait: 30000,
    timeout: 120000
  });

  console.log('\n--- CLEANUP FINISHED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
