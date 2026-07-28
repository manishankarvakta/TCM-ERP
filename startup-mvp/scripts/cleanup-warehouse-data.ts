import { PrismaClient, StockTransactionType } from "@prisma/client";

const prisma = new PrismaClient();

// Get DRY_RUN flag from environment, default to true for safety
const DRY_RUN = process.env.DRY_RUN !== "false";

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧹  WAREHOUSE DATA CLEAN-UP & RESET SCRIPT");
  console.log(`🛡️  Current Mode: ${DRY_RUN ? "🔍 DRY RUN (Safe mode)" : "⚠️  LIVE WRITE (Modifying DB)"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // 1. Resolve target warehouse
  const targetCode = "WH-2026-0004";
  const warehouse = await prisma.warehouse.findFirst({
    where: { code: targetCode }
  });

  if (!warehouse) {
    console.error(`❌ Error: Warehouse with code '${targetCode}' was not found in the database.`);
    process.exit(1);
  }

  if (!warehouse.name.includes("RANGPUR")) {
    console.error(`❌ Error: Warehouse code '${targetCode}' found, but its name is '${warehouse.name}', which does not match 'RANGPUR'. Aborting for safety.`);
    process.exit(1);
  }

  const whId = warehouse.id;
  console.log(`📍 Resolved Warehouse: ${warehouse.name} (${warehouse.code})`);
  console.log(`   Database ID: ${whId}`);
  console.log(`   Address: ${warehouse.address || "N/A"}, ${warehouse.city || "N/A"}\n`);

  // 2. Identify sales to delete (including sales returns)
  const salesToDelete = await prisma.sale.findMany({
    where: { warehouseId: whId },
    select: { id: true, saleNumber: true }
  });
  const saleIds = salesToDelete.map(s => s.id);
  const saleItemsCount = await prisma.saleItem.count({
    where: { saleId: { in: saleIds } }
  });

  // 3. Identify inventory adjustments to delete
  const adjustmentsToDelete = await prisma.inventoryAdjustment.findMany({
    where: { warehouseId: whId },
    select: { id: true, adjustmentNumber: true }
  });
  const adjustmentIds = adjustmentsToDelete.map(a => a.id);
  const adjustmentItemsCount = await prisma.inventoryAdjustmentItem.count({
    where: { inventoryAdjustmentId: { in: adjustmentIds } }
  });

  // 4. Identify inventory damages to delete
  const damagesToDelete = await prisma.inventoryDamage.findMany({
    where: { warehouseId: whId },
    select: { id: true, damageNumber: true }
  });
  const damageIds = damagesToDelete.map(d => d.id);
  const damageItemsCount = await prisma.inventoryDamageItem.count({
    where: { inventoryDamageId: { in: damageIds } }
  });

  // 5. Identify stock ledgers to delete
  const PRESERVED_REF_TYPES = ["GRN", "TPN", "PURCHASE", "RTV"];
  const ledgersToDelete = await prisma.stockLedger.findMany({
    where: {
      warehouseId: whId,
      referenceType: { notIn: PRESERVED_REF_TYPES }
    },
    select: { id: true, referenceType: true, transactionType: true, quantity: true }
  });
  const ledgerIdsToDelete = ledgersToDelete.map(l => l.id);

  const ledgersToKeep = await prisma.stockLedger.findMany({
    where: {
      warehouseId: whId,
      referenceType: { in: PRESERVED_REF_TYPES }
    },
    select: { id: true, referenceType: true, transactionType: true, quantity: true }
  });

  // 6. Identify vouchers and journal entries to delete
  // We query all vouchers that might be related to Rangpur or its transactions
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
      purchases: { select: { id: true, purchaseNumber: true } },
      grns: { select: { id: true, grnNumber: true } },
      employeeLoans: { select: { id: true } },
      payrollPayment: { select: { id: true } },
      payrollAccrual: { select: { id: true } },
      productionOrders: { select: { id: true } }
    }
  });

  // Filter candidate vouchers to protect purchases/GRNs/payroll/production/loans
  const vouchersToDeleteList = candidateVouchers.filter(v => {
    // If the voucher is linked to any of these critical preserved models, KEEP it.
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
    return true; // Delete
  });

  const voucherIdsToDelete = vouchersToDeleteList.map(v => v.id);

  // Find journal entries associated with the vouchers we're deleting
  const journalEntriesToDelete = await prisma.journalEntry.findMany({
    where: { voucherId: { in: voucherIdsToDelete } },
    select: { id: true, entryNumber: true }
  });
  const journalEntryIdsToDelete = journalEntriesToDelete.map(je => je.id);

  const journalLinesCount = await prisma.journalEntryLine.count({
    where: { journalEntryId: { in: journalEntryIdsToDelete } }
  });

  const voucherLinesCount = await prisma.voucherLine.count({
    where: { voucherId: { in: voucherIdsToDelete } }
  });

  // 7. Calculate Stock recalculations
  const currentStocks = await prisma.stock.findMany({
    where: { warehouseId: whId },
    include: {
      item: { select: { name: true } },
      variant: { select: { sku: true } }
    }
  });

  console.log("--------------------------------------------------------");
  console.log("📊 ANALYSIS SUMMARY:");
  console.log("--------------------------------------------------------");
  console.log(`📦 Transactions to clear for warehouse '${warehouse.name}':`);
  console.log(`   - Sales Vouchers: ${salesToDelete.length} (with ${saleItemsCount} sale items)`);
  console.log(`   - Inventory Adjustments: ${adjustmentsToDelete.length} (with ${adjustmentItemsCount} items)`);
  console.log(`   - Inventory Damages: ${damagesToDelete.length} (with ${damageItemsCount} items)`);
  console.log(`   - Stock Ledger Entries to DELETE: ${ledgersToDelete.length}`);
  console.log(`   - Stock Ledger Entries to KEEP (GRN, TPN, RTV): ${ledgersToKeep.length}`);
  
  console.log(`\n💳 Financial records to clear:`);
  console.log(`   - Vouchers to DELETE: ${voucherIdsToDelete.length} (with ${voucherLinesCount} lines)`);
  console.log(`     (Preserved ${candidateVouchers.length - vouchersToDeleteList.length} vouchers linked to purchases, GRNs, payroll or production)`);
  console.log(`   - Journal Entries to DELETE: ${journalEntryIdsToDelete.length} (with ${journalLinesCount} lines)`);

  console.log(`\n📈 Stock level updates (Recalculated based on remaining GRN/TPN/RTV ledgers):`);
  
  const stockRecalcMap = new Map<string, number>();
  
  // Calculate expected stocks from remaining ledgers
  // remaining ledgers are ledgersToKeep
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

  let totalStockRows = 0;
  let changedStockRows = 0;
  const stockUpdates: Array<{ id: string; name: string; oldQty: number; newQty: number }> = [];

  for (const stock of currentStocks) {
    const key = stock.variantId ? `variant:${stock.variantId}` : `item:${stock.itemId}`;
    const calculatedQty = stockRecalcMap.get(key) || 0;
    const oldQty = Number(stock.quantity);

    totalStockRows++;
    if (oldQty !== calculatedQty) {
      changedStockRows++;
    }

    stockUpdates.push({
      id: stock.id,
      name: stock.variant?.sku || stock.item?.name || "Unknown SKU",
      oldQty,
      newQty: calculatedQty
    });
  }

  console.log(`   Total Stock items monitored: ${totalStockRows}`);
  console.log(`   Stock items with quantity changes: ${changedStockRows}`);
  if (changedStockRows > 0) {
    console.log("   Preview of stock updates (first 5):");
    stockUpdates.filter(u => u.oldQty !== u.newQty).slice(0, 5).forEach(u => {
      console.log(`     • ${u.name}: ${u.oldQty} ➔ ${u.newQty}`);
    });
    if (changedStockRows > 5) {
      console.log(`     ... and ${changedStockRows - 5} more updates.`);
    }
  } else {
    console.log("   ✓ All stock quantities match their respective preserved ledgers.");
  }
  console.log("--------------------------------------------------------\n");

  if (DRY_RUN) {
    console.log("🔍 [DRY RUN] No records were modified or deleted.");
    console.log("   To run the actual cleanup, execute with DRY_RUN=false environment variable:");
    console.log(`   env DRY_RUN=false npx tsx scripts/cleanup-warehouse-data.ts\n`);
    process.exit(0);
  }

  // 8. Execute Database Modifications inside a transaction
  console.log("⚠️  Starting execution of database clean-up transaction...");

  try {
    await prisma.$transaction(async (tx) => {
      console.log("   [Tx] Disabling foreign key constraints (session role = replica)...");
      await tx.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

      // Deleting SaleItems
      if (saleIds.length > 0) {
        console.log(`   [Tx] Deleting ${saleItemsCount} SaleItem records...`);
        await tx.saleItem.deleteMany({
          where: { saleId: { in: saleIds } }
        });
      }

      // Deleting Sales
      if (saleIds.length > 0) {
        console.log(`   [Tx] Deleting ${saleIds.length} Sale records...`);
        await tx.sale.deleteMany({
          where: { id: { in: saleIds } }
        });
      }

      // Deleting Adjustment Items
      if (adjustmentIds.length > 0) {
        console.log(`   [Tx] Deleting ${adjustmentItemsCount} InventoryAdjustmentItem records...`);
        await tx.inventoryAdjustmentItem.deleteMany({
          where: { inventoryAdjustmentId: { in: adjustmentIds } }
        });
      }

      // Deleting Adjustments
      if (adjustmentIds.length > 0) {
        console.log(`   [Tx] Deleting ${adjustmentIds.length} InventoryAdjustment records...`);
        await tx.inventoryAdjustment.deleteMany({
          where: { id: { in: adjustmentIds } }
        });
      }

      // Deleting Damage Items
      if (damageIds.length > 0) {
        console.log(`   [Tx] Deleting ${damageItemsCount} InventoryDamageItem records...`);
        await tx.inventoryDamageItem.deleteMany({
          where: { inventoryDamageId: { in: damageIds } }
        });
      }

      // Deleting Damages
      if (damageIds.length > 0) {
        console.log(`   [Tx] Deleting ${damageIds.length} InventoryDamage records...`);
        await tx.inventoryDamage.deleteMany({
          where: { id: { in: damageIds } }
        });
      }

      // Deleting Stock Ledgers
      if (ledgerIdsToDelete.length > 0) {
        console.log(`   [Tx] Deleting ${ledgerIdsToDelete.length} StockLedger entries...`);
        await tx.stockLedger.deleteMany({
          where: { id: { in: ledgerIdsToDelete } }
        });
      }

      // Deleting Journal Lines
      if (journalEntryIdsToDelete.length > 0) {
        console.log(`   [Tx] Deleting ${journalLinesCount} JournalEntryLine records...`);
        await tx.journalEntryLine.deleteMany({
          where: { journalEntryId: { in: journalEntryIdsToDelete } }
        });
      }

      // Deleting Journal Entries
      if (journalEntryIdsToDelete.length > 0) {
        console.log(`   [Tx] Deleting ${journalEntryIdsToDelete.length} JournalEntry records...`);
        await tx.journalEntry.deleteMany({
          where: { id: { in: journalEntryIdsToDelete } }
        });
      }

      // Deleting Voucher Lines
      if (voucherIdsToDelete.length > 0) {
        console.log(`   [Tx] Deleting ${voucherLinesCount} VoucherLine records...`);
        await tx.voucherLine.deleteMany({
          where: { voucherId: { in: voucherIdsToDelete } }
        });
      }

      // Deleting Vouchers
      if (voucherIdsToDelete.length > 0) {
        console.log(`   [Tx] Deleting ${voucherIdsToDelete.length} Voucher records...`);
        await tx.voucher.deleteMany({
          where: { id: { in: voucherIdsToDelete } }
        });
      }

      // Update Stock quantities
      console.log(`   [Tx] Recalculating stock quantities for ${stockUpdates.length} stock items...`);
      for (const update of stockUpdates) {
        await tx.stock.update({
          where: { id: update.id },
          data: {
            quantity: update.newQty,
            lastUpdated: new Date()
          }
        });
      }

      console.log("   [Tx] Re-enabling foreign key constraints (session role = origin)...");
      await tx.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    }, {
      timeout: 60000 // 60 seconds timeout
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Clean-up and stock recalculation completed!");
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
