/**
 * Full Transaction & Item Data Cleanup Script
 *
 * Removes:
 * - Stock transactions (StockLedger, Stock)
 * - Accounting transactions (JournalEntryLine, JournalEntry, VoucherLine, Voucher)
 * - Sales & Sale Items
 * - Purchases & Purchase Items
 * - Inventory Adjustments & their Items
 * - Customers (Client) & Suppliers
 * - Items & Categories (to re-seed garment data)
 *
 * Kept:
 * - Users & Employees
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

async function clearTransactions() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧹  Full Transaction & Item Data Cleanup");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n⚠️  WARNING: This will delete ALL transaction data AND all Items/Categories!");
  console.log("   Users, Warehouses, Chart of Accounts, and Settings will be kept.\n");

  try {
    console.log("🔄 Starting cleanup...\n");

    // Disable foreign key checks (PostgreSQL)
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

    // --- INVENTORY ADJUSTMENTS ---
    console.log("📦 Deleting InventoryAdjustmentItem...");
    const invAdjItemsDeleted = await prisma.inventoryAdjustmentItem.deleteMany({});
    console.log(`   ✓ Deleted ${invAdjItemsDeleted.count} InventoryAdjustmentItem records`);

    console.log("📦 Deleting InventoryAdjustment...");
    const invAdjDeleted = await prisma.inventoryAdjustment.deleteMany({});
    console.log(`   ✓ Deleted ${invAdjDeleted.count} InventoryAdjustment records`);

    // --- PRODUCTION ---
    console.log("📦 Deleting ProductionOrder...");
    const productionOrdersDeleted = await prisma.productionOrder.deleteMany({});
    console.log(`   ✓ Deleted ${productionOrdersDeleted.count} ProductionOrder records`);

    // --- STOCK ---
    console.log("📦 Deleting StockLedger...");
    const stockLedgersDeleted = await prisma.stockLedger.deleteMany({});
    console.log(`   ✓ Deleted ${stockLedgersDeleted.count} StockLedger records`);

    console.log("📦 Deleting Stock...");
    const stocksDeleted = await prisma.stock.deleteMany({});
    console.log(`   ✓ Deleted ${stocksDeleted.count} Stock records`);

    // --- ACCOUNTING TRANSACTIONS ---
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

    // --- ITEMS & CATEGORIES ---
    console.log("📦 Deleting BOMItem (raw materials from BOMs)...");
    const bomItemsDeleted = await prisma.bOMItem.deleteMany({});
    console.log(`   ✓ Deleted ${bomItemsDeleted.count} BOMItem records`);

    console.log("📦 Deleting BOM...");
    const bomsDeleted = await prisma.bOM.deleteMany({});
    console.log(`   ✓ Deleted ${bomsDeleted.count} BOM records`);

    console.log("📦 Deleting Item...");
    const itemsDeleted = await prisma.item.deleteMany({});
    console.log(`   ✓ Deleted ${itemsDeleted.count} Item records`);

    console.log("📦 Deleting Category...");
    const categoriesDeleted = await prisma.category.deleteMany({});
    console.log(`   ✓ Deleted ${categoriesDeleted.count} Category records`);

    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Cleanup completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Summary of remaining master data
    const userCount = await prisma.user.count();
    const warehouseCount = await prisma.warehouse.count();
    const coaCount = await prisma.chartOfAccount.count();
    const unitCount = await prisma.unit.count();

    console.log(`\n📊 Summary of remaining master data:`);
    console.log(`   • Users: ${userCount}`);
    console.log(`   • Warehouses: ${warehouseCount}`);
    console.log(`   • Units: ${unitCount}`);
    console.log(`   • Chart of Accounts: ${coaCount}`);
    console.log("\n✨ Ready to seed garment categories and items.\n");

  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    try {
      await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    } catch (e) {}
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearTransactions()
  .then(() => {
    console.log("🎉 Cleanup script finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Cleanup script failed:", error);
    process.exit(1);
  });
