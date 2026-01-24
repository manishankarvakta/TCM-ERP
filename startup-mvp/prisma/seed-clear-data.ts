/**
 * Data Cleanup Seed Script
 * 
 * This script removes all transaction-related data while keeping master data like 
 * Users, Items, Warehouses, BOMs, and Chart of Accounts.
 * 
 * Removed:
 * - Customers (Client)
 * - Suppliers (Supplier)
 * - Purchases & Purchase Items
 * - Sales & Sale Items
 * - Inventory (Stock & Stock Ledger)
 * - Production Orders
 * - Accounting Transactions (Vouchers, Voucher Lines, Journal Entries, Journal Entry Lines)
 * 
 * Kept:
 * - Users & Employees
 * - Items & Categories
 * - Units
 * - Warehouses
 * - Organizations
 * - BOMs & BOM Items
 * - Settings & Permissions
 * - Chart of Accounts & Cash/Bank Accounts
 * - Accounting Periods
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearData() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧹  Transaction Data Cleanup");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n⚠️  WARNING: This will delete all Customers, Suppliers, Purchases, Sales, Inventory, and Transactions!");
  console.log("   Items, Warehouses, BOMs, and Users will be kept.\n");

  try {
    console.log("🔄 Starting cleanup...\n");

    // Disable foreign key checks temporarily (PostgreSQL uses session_replication_role)
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

    // --- SALES ---
    console.log("📦 Deleting SaleItem...");
    const saleItemsDeleted = await prisma.saleItem.deleteMany({});
    console.log(`   ✓ Deleted ${saleItemsDeleted.count} SaleItem records`);

    console.log("📦 Deleting Sale...");
    const salesDeleted = await prisma.sale.deleteMany({});
    console.log(`   ✓ Deleted ${salesDeleted.count} Sale records`);

    // --- PURCHASES ---
    console.log("📦 Deleting PurchaseItem...");
    const purchaseItemsDeleted = await prisma.purchaseItem.deleteMany({});
    console.log(`   ✓ Deleted ${purchaseItemsDeleted.count} PurchaseItem records`);

    console.log("📦 Deleting Purchase...");
    const purchasesDeleted = await prisma.purchase.deleteMany({});
    console.log(`   ✓ Deleted ${purchasesDeleted.count} Purchase records`);

    // --- PRODUCTION ---
    console.log("📦 Deleting ProductionOrder...");
    const productionOrdersDeleted = await prisma.productionOrder.deleteMany({});
    console.log(`   ✓ Deleted ${productionOrdersDeleted.count} ProductionOrder records`);

    // --- INVENTORY ---
    console.log("📦 Deleting StockLedger...");
    const stockLedgersDeleted = await prisma.stockLedger.deleteMany({});
    console.log(`   ✓ Deleted ${stockLedgersDeleted.count} StockLedger records`);

    console.log("📦 Deleting Stock...");
    const stocksDeleted = await prisma.stock.deleteMany({});
    console.log(`   ✓ Deleted ${stocksDeleted.count} Stock records`);

    // --- TRANSACTIONS (ACCOUNTING) ---
    console.log("📦 Deleting JournalEntryLine...");
    const journalEntryLinesDeleted = await prisma.journalEntryLine.deleteMany({});
    console.log(`   ✓ Deleted ${journalEntryLinesDeleted.count} JournalEntryLine records`);

    console.log("📦 Deleting JournalEntry...");
    const journalEntriesDeleted = await prisma.journalEntry.deleteMany({});
    console.log(`   ✓ Deleted ${journalEntriesDeleted.count} JournalEntry records`);

    console.log("📦 Deleting VoucherLine...");
    const voucherLinesDeleted = await prisma.voucherLine.deleteMany({});
    console.log(`   ✓ Deleted ${voucherLinesDeleted.count} VoucherLine records`);

    console.log("📦 Deleting Voucher...");
    const vouchersDeleted = await prisma.voucher.deleteMany({});
    console.log(`   ✓ Deleted ${vouchersDeleted.count} Voucher records`);

    // --- CUSTOMERS & SUPPLIERS ---
    console.log("📦 Deleting Client (Customers)...");
    const clientsDeleted = await prisma.client.deleteMany({});
    console.log(`   ✓ Deleted ${clientsDeleted.count} Client records`);

    console.log("📦 Deleting Supplier...");
    const suppliersDeleted = await prisma.supplier.deleteMany({});
    console.log(`   ✓ Deleted ${suppliersDeleted.count} Supplier records`);

    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Cleanup completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Count remaining key records
    const userCount = await prisma.user.count();
    const itemCount = await prisma.item.count();
    const warehouseCount = await prisma.warehouse.count();
    const coaCount = await prisma.chartOfAccount.count();

    console.log(`\n📊 Summary of remaining master data:`);
    console.log(`   • Users: ${userCount}`);
    console.log(`   • Items: ${itemCount}`);
    console.log(`   • Warehouses: ${warehouseCount}`);
    console.log(`   • Chart of Accounts: ${coaCount}`);
    console.log("\n✨ Transactions and related records have been cleared.\n");

  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    // Attempt to re-enable foreign key checks even on error
    try {
      await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    } catch (e) {}
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearData()
  .then(() => {
    console.log("🎉 Cleanup script finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Cleanup script failed:", error);
    process.exit(1);
  });
