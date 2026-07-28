import { PrismaClient, StockTransactionType } from "@prisma/client";

const prisma = new PrismaClient();

// Get DRY_RUN flag from environment, default to true for safety
const DRY_RUN = process.env.DRY_RUN !== "false";

interface WarehouseConfig {
  code: string;
  nameCheck: string;
  clearPaymentsAndCollections: boolean;
}

const configs: WarehouseConfig[] = [
  {
    code: "WH-2026-0004",
    nameCheck: "RANGPUR",
    clearPaymentsAndCollections: true
  },
  {
    code: "WH-2026-0001",
    nameCheck: "Factory",
    clearPaymentsAndCollections: false
  }
];

interface WarehouseData {
  config: WarehouseConfig;
  whId: string;
  whName: string;
  saleIds: string[];
  saleItemsCount: number;
  adjustmentIds: string[];
  adjustmentItemsCount: number;
  damageIds: string[];
  damageItemsCount: number;
  ledgerIdsToDelete: string[];
  ledgersToKeepCount: number;
  voucherIdsToDelete: string[];
  voucherLinesCount: number;
  journalEntryIdsToDelete: string[];
  journalLinesCount: number;
  stockUpdates: Array<{ id: string; name: string; oldQty: number; newQty: number }>;
  preservedVoucherCount: number;
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧹  MULTI-WAREHOUSE DATA CLEAN-UP & RESET SCRIPT");
  console.log(`🛡️  Current Mode: ${DRY_RUN ? "🔍 DRY RUN (Safe mode)" : "⚠️  LIVE WRITE (Modifying DB)"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const resolvedData: WarehouseData[] = [];

  // 1. Fetch and Analyze Data for each Warehouse
  for (const config of configs) {
    console.log(`🔍 Analyzing Warehouse code '${config.code}'...`);
    
    const warehouse = await prisma.warehouse.findFirst({
      where: { code: config.code }
    });

    if (!warehouse) {
      console.error(`❌ Error: Warehouse with code '${config.code}' was not found in the database. Aborting.`);
      process.exit(1);
    }

    if (!warehouse.name.includes(config.nameCheck)) {
      console.error(`❌ Error: Warehouse code '${config.code}' found, but its name is '${warehouse.name}', which does not match '${config.nameCheck}'. Aborting for safety.`);
      process.exit(1);
    }

    const whId = warehouse.id;

    // A. Sales to delete
    const salesToDelete = await prisma.sale.findMany({
      where: { warehouseId: whId },
      select: { id: true }
    });
    const saleIds = salesToDelete.map(s => s.id);
    const saleItemsCount = await prisma.saleItem.count({
      where: { saleId: { in: saleIds } }
    });

    // B. Adjustments to delete
    const adjustmentsToDelete = await prisma.inventoryAdjustment.findMany({
      where: { warehouseId: whId },
      select: { id: true }
    });
    const adjustmentIds = adjustmentsToDelete.map(a => a.id);
    const adjustmentItemsCount = await prisma.inventoryAdjustmentItem.count({
      where: { inventoryAdjustmentId: { in: adjustmentIds } }
    });

    // C. Damages to delete
    const damagesToDelete = await prisma.inventoryDamage.findMany({
      where: { warehouseId: whId },
      select: { id: true }
    });
    const damageIds = damagesToDelete.map(d => d.id);
    const damageItemsCount = await prisma.inventoryDamageItem.count({
      where: { inventoryDamageId: { in: damageIds } }
    });

    // D. Stock Ledgers to delete
    const PRESERVED_REF_TYPES = ["GRN", "TPN", "PURCHASE", "RTV"];
    const ledgersToDelete = await prisma.stockLedger.findMany({
      where: {
        warehouseId: whId,
        referenceType: { notIn: PRESERVED_REF_TYPES }
      },
      select: { id: true }
    });
    const ledgerIdsToDelete = ledgersToDelete.map(l => l.id);

    const ledgersToKeepCount = await prisma.stockLedger.count({
      where: {
        warehouseId: whId,
        referenceType: { in: PRESERVED_REF_TYPES }
      }
    });

    // E. Vouchers & Journal Entries to delete
    const candidateVouchers = await prisma.voucher.findMany({
      where: {
        OR: [
          { warehouseId: whId },
          { sales: { some: { warehouseId: whId } } },
          { inventoryAdjustment: { warehouseId: whId } },
          { inventoryDamage: { warehouseId: whId } }
        ]
      },
      include: {
        purchases: { select: { id: true } },
        grns: { select: { id: true } },
        employeeLoans: { select: { id: true } },
        payrollPayment: { select: { id: true } },
        payrollAccrual: { select: { id: true } },
        productionOrders: { select: { id: true } },
        sales: { select: { id: true, warehouseId: true } },
        inventoryAdjustment: { select: { id: true, warehouseId: true } },
        inventoryDamage: { select: { id: true, warehouseId: true } }
      }
    });

    // Filter candidate vouchers to protect purchases/GRNs/payroll/production/loans
    const vouchersToDeleteList = candidateVouchers.filter(v => {
      // 1. Always protect vouchers linked to preserved models
      if (
        v.purchases.length > 0 ||
        v.grns.length > 0 ||
        v.employeeLoans.length > 0 ||
        v.payrollPayment !== null ||
        v.payrollAccrual !== null ||
        v.productionOrders.length > 0
      ) {
        return false; // Protect
      }

      // 2. If clearPaymentsAndCollections is false (Factory):
      // Only delete if voucher type is SALES, RETURN, DAMAGE OR explicitly linked to sale/adjustment/damage in this warehouse
      if (!config.clearPaymentsAndCollections) {
        const allowedTypes = ["SALES", "RETURN", "DAMAGE"];
        const isLinkedToDeleted = 
          v.sales.some(s => s.warehouseId === whId) ||
          (v.inventoryAdjustment && v.inventoryAdjustment.warehouseId === whId) ||
          (v.inventoryDamage && v.inventoryDamage.warehouseId === whId);

        if (allowedTypes.includes(v.type) || isLinkedToDeleted) {
          return true; // Delete
        }
        return false; // Protect payments/collections/general journals
      }

      // 3. If clearPaymentsAndCollections is true (Rangpur): delete if not protected by preserved models
      return true;
    });

    const voucherIdsToDelete = vouchersToDeleteList.map(v => v.id);

    // Find journal entries associated with the vouchers we're deleting
    const journalEntriesToDelete = await prisma.journalEntry.findMany({
      where: { voucherId: { in: voucherIdsToDelete } },
      select: { id: true }
    });
    const journalEntryIdsToDelete = journalEntriesToDelete.map(je => je.id);

    const journalLinesCount = await prisma.journalEntryLine.count({
      where: { journalEntryId: { in: journalEntryIdsToDelete } }
    });

    const voucherLinesCount = await prisma.voucherLine.count({
      where: { voucherId: { in: voucherIdsToDelete } }
    });

    // F. Stock recalculations
    const currentStocks = await prisma.stock.findMany({
      where: { warehouseId: whId },
      include: {
        item: { select: { name: true } },
        variant: { select: { sku: true } }
      }
    });

    const stockRecalcMap = new Map<string, number>();
    
    // Calculate expected stocks from remaining ledgers (i.e. those with preserved ref types)
    const expectedLedgers = await prisma.stockLedger.findMany({
      where: {
        warehouseId: whId,
        referenceType: { in: PRESERVED_REF_TYPES }
      }
    });

    for (const ledger of expectedLedgers) {
      const key = ledger.variantId ? `variant:${ledger.variantId}` : `item:${ledger.itemId}`;
      const qty = Number(ledger.quantity);
      stockRecalcMap.set(key, (stockRecalcMap.get(key) || 0) + qty);
    }

    const stockUpdates: Array<{ id: string; name: string; oldQty: number; newQty: number }> = [];

    for (const stock of currentStocks) {
      const key = stock.variantId ? `variant:${stock.variantId}` : `item:${stock.itemId}`;
      const calculatedQty = stockRecalcMap.get(key) || 0;
      const oldQty = Number(stock.quantity);

      stockUpdates.push({
        id: stock.id,
        name: stock.variant?.sku || stock.item?.name || "Unknown SKU",
        oldQty,
        newQty: calculatedQty
      });
    }

    resolvedData.push({
      config,
      whId,
      whName: warehouse.name,
      saleIds,
      saleItemsCount,
      adjustmentIds,
      adjustmentItemsCount,
      damageIds,
      damageItemsCount,
      ledgerIdsToDelete,
      ledgersToKeepCount,
      voucherIdsToDelete,
      voucherLinesCount,
      journalEntryIdsToDelete,
      journalLinesCount,
      stockUpdates,
      preservedVoucherCount: candidateVouchers.length - vouchersToDeleteList.length
    });
  }

  // 2. Print Analysis Report for all resolved warehouses
  console.log("\n--------------------------------------------------------");
  console.log("📊 ANALYSIS SUMMARY REPORT FOR BOTH WAREHOUSES:");
  console.log("--------------------------------------------------------");
  
  for (const data of resolvedData) {
    console.log(`🏠 Warehouse: ${data.whName} (${data.config.code})`);
    console.log(`   - Clear Sales: YES (${data.saleIds.length} vouchers, ${data.saleItemsCount} items)`);
    console.log(`   - Clear Adjustments: YES (${data.adjustmentIds.length} vouchers, ${data.adjustmentItemsCount} items)`);
    console.log(`   - Clear Damages: YES (${data.damageIds.length} vouchers, ${data.damageItemsCount} items)`);
    console.log(`   - Clear Payments/Collections: ${data.config.clearPaymentsAndCollections ? "YES" : "NO (Preserved)"}`);
    console.log(`   - Stock Ledgers to DELETE: ${data.ledgerIdsToDelete.length}`);
    console.log(`   - Stock Ledgers to KEEP: ${data.ledgersToKeepCount}`);
    console.log(`   - Vouchers to DELETE: ${data.voucherIdsToDelete.length} (with ${data.voucherLinesCount} lines)`);
    console.log(`   - Vouchers PRESERVED: ${data.preservedVoucherCount}`);
    console.log(`   - Journal Entries to DELETE: ${data.journalEntryIdsToDelete.length} (with ${data.journalLinesCount} lines)`);

    const changedStocks = data.stockUpdates.filter(u => u.oldQty !== u.newQty);
    console.log(`   - Stocks Recalculation: ${changedStocks.length} of ${data.stockUpdates.length} items will be updated.`);
    if (changedStocks.length > 0) {
      console.log("     Preview of stock updates (first 3):");
      changedStocks.slice(0, 3).forEach(u => {
        console.log(`       • ${u.name}: ${u.oldQty} ➔ ${u.newQty}`);
      });
    }
    console.log("--------------------------------------------------------");
  }

  if (DRY_RUN) {
    console.log("\n🔍 [DRY RUN] No records were modified or deleted.");
    console.log("   To run the actual cleanup, execute with DRY_RUN=false environment variable:");
    console.log(`   env DRY_RUN=false npx tsx scripts/cleanup-warehouse-data.ts\n`);
    process.exit(0);
  }

  // 3. Execute Deletions inside a single transaction
  console.log("\n⚠️  Starting execution of database clean-up transaction...");

  try {
    await prisma.$transaction(async (tx) => {
      console.log("   [Tx] Disabling foreign key constraints (session role = replica)...");
      await tx.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

      for (const data of resolvedData) {
        console.log(`\n🧹 Processing cleanup for warehouse: ${data.whName}...`);

        // Deleting SaleItems
        if (data.saleIds.length > 0) {
          console.log(`   [Tx] Deleting ${data.saleItemsCount} SaleItem records...`);
          await tx.saleItem.deleteMany({
            where: { saleId: { in: data.saleIds } }
          });
        }

        // Deleting Sales
        if (data.saleIds.length > 0) {
          console.log(`   [Tx] Deleting ${data.saleIds.length} Sale records...`);
          await tx.sale.deleteMany({
            where: { id: { in: data.saleIds } }
          });
        }

        // Deleting Adjustment Items
        if (data.adjustmentIds.length > 0) {
          console.log(`   [Tx] Deleting ${data.adjustmentItemsCount} InventoryAdjustmentItem records...`);
          await tx.inventoryAdjustmentItem.deleteMany({
            where: { inventoryAdjustmentId: { in: data.adjustmentIds } }
          });
        }

        // Deleting Adjustments
        if (data.adjustmentIds.length > 0) {
          console.log(`   [Tx] Deleting ${data.adjustmentIds.length} InventoryAdjustment records...`);
          await tx.inventoryAdjustment.deleteMany({
            where: { id: { in: data.adjustmentIds } }
          });
        }

        // Deleting Damage Items
        if (data.damageIds.length > 0) {
          console.log(`   [Tx] Deleting ${data.damageItemsCount} InventoryDamageItem records...`);
          await tx.inventoryDamageItem.deleteMany({
            where: { inventoryDamageId: { in: data.damageIds } }
          });
        }

        // Deleting Damages
        if (data.damageIds.length > 0) {
          console.log(`   [Tx] Deleting ${data.damageIds.length} InventoryDamage records...`);
          await tx.inventoryDamage.deleteMany({
            where: { id: { in: data.damageIds } }
          });
        }

        // Deleting Stock Ledgers
        if (data.ledgerIdsToDelete.length > 0) {
          console.log(`   [Tx] Deleting ${data.ledgerIdsToDelete.length} StockLedger entries...`);
          await tx.stockLedger.deleteMany({
            where: { id: { in: data.ledgerIdsToDelete } }
          });
        }

        // Deleting Journal Lines
        if (data.journalEntryIdsToDelete.length > 0) {
          console.log(`   [Tx] Deleting ${data.journalLinesCount} JournalEntryLine records...`);
          await tx.journalEntryLine.deleteMany({
            where: { journalEntryId: { in: data.journalEntryIdsToDelete } }
          });
        }

        // Deleting Journal Entries
        if (data.journalEntryIdsToDelete.length > 0) {
          console.log(`   [Tx] Deleting ${data.journalEntryIdsToDelete.length} JournalEntry records...`);
          await tx.journalEntry.deleteMany({
            where: { id: { in: data.journalEntryIdsToDelete } }
          });
        }

        // Deleting Voucher Lines
        if (data.voucherIdsToDelete.length > 0) {
          console.log(`   [Tx] Deleting ${data.voucherLinesCount} VoucherLine records...`);
          await tx.voucherLine.deleteMany({
            where: { voucherId: { in: data.voucherIdsToDelete } }
          });
        }

        // Deleting Vouchers
        if (data.voucherIdsToDelete.length > 0) {
          console.log(`   [Tx] Deleting ${data.voucherIdsToDelete.length} Voucher records...`);
          await tx.voucher.deleteMany({
            where: { id: { in: data.voucherIdsToDelete } }
          });
        }

        // Update Stock quantities
        console.log(`   [Tx] Recalculating stock quantities for ${data.stockUpdates.length} stock items...`);
        for (const update of data.stockUpdates) {
          await tx.stock.update({
            where: { id: update.id },
            data: {
              quantity: update.newQty,
              lastUpdated: new Date()
            }
          });
        }
      }

      console.log("\n   [Tx] Re-enabling foreign key constraints (session role = origin)...");
      await tx.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    }, {
      timeout: 120000 // 120 seconds timeout (increased for multi-warehouse)
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Multi-warehouse clean-up completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("\n❌ Transaction Failed and Rolled Back!");
    console.error(error);
    
    // Ensure session role is restored in case it failed inside the block
    try {
      await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    } catch (e) {}
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
