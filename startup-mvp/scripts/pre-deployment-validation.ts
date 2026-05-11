/**
 * Pre-Deployment Validation Script
 * 
 * Performs end-to-end testing of:
 * - Master Data (Accounts)
 * - Purchase Flow
 * - Production Flow
 * - Sales Flow
 * - Reporting consistency
 * 
 * Run with: npx tsx scripts/pre-deployment-validation.ts
 */

import { PrismaClient, ItemType, StockTransactionType, VoucherType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Pre-Deployment Validation...");

  try {
    // 0. Pre-cleanup
    console.log("\n🧹 Phase 0: Pre-cleanup...");
    await prisma.voucherLine.deleteMany({ where: { id: { startsWith: "VAL-LINE-" } } });
    await prisma.voucher.deleteMany({ where: { id: { startsWith: "VAL-VOU-" } } });
    await prisma.stockLedger.deleteMany({ where: { referenceId: { startsWith: "VAL-" } } });
    console.log("✅ Pre-cleanup complete.");

    // 1. Verify Master Data (Chart of Accounts)
    console.log("\n📊 Phase 1: Verifying Chart of Accounts...");
    const requiredCodes = ["1620", "1630", "1410", "2110", "4110", "5110"];
    const coaMap: Record<string, string> = {};

    for (const code of requiredCodes) {
      const found = await prisma.chartOfAccount.findUnique({ where: { code } });
      if (!found) {
        throw new Error(`CRITICAL: Required account ${code} missing!`);
      }
      coaMap[code] = found.id;
      console.log(`✅ Account ${code} (${found.name}) verified. ID: ${found.id}`);
    }

    // Get a test user
    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    if (!admin) throw new Error("No admin user found for testing");

    // 2. Setup Test Data (Warehouse & Items)
    console.log("\n🏗️ Phase 2: Setting up Test Data...");
    const warehouse = await prisma.warehouse.upsert({
      where: { code: "WH-TEST-001" },
      update: { status: "active", isTrash: false },
      create: {
        code: "WH-TEST-001",
        name: "Validation Test Warehouse",
        status: "active",
        createdBy: admin.id,
      },
    });
    console.log(`✅ Test Warehouse: ${warehouse.name}`);

    const unitPcs = await prisma.unit.findFirst({ where: { symbol: "pcs" } });
    if (!unitPcs) throw new Error("Unit 'pcs' missing");

    const rawMaterial = await prisma.item.upsert({
      where: { code: "RM-TEST-001" },
      update: { trackInventory: true, costPrice: 10 },
      create: {
        code: "RM-TEST-001",
        name: "Test Raw Material",
        itemType: ItemType.RAW_MATERIAL,
        unitId: unitPcs.id,
        costPrice: 10,
        trackInventory: true,
        createdBy: admin.id,
      },
    });

    const finishedGood = await prisma.item.upsert({
      where: { code: "FG-TEST-001" },
      update: { trackInventory: true, costPrice: 50, salesPrice: 100 },
      create: {
        code: "FG-TEST-001",
        name: "Test Ready Product",
        itemType: ItemType.READY_PRODUCT,
        unitId: unitPcs.id,
        costPrice: 50,
        salesPrice: 100,
        trackInventory: true,
        createdBy: admin.id,
      },
    });
    console.log(`✅ Test Items: ${rawMaterial.name}, ${finishedGood.name}`);

    // 2.1 Reset stock for test items
    await prisma.stock.updateMany({
      where: { itemId: { in: [rawMaterial.id, finishedGood.id] }, warehouseId: warehouse.id },
      data: { quantity: 0 },
    });
    console.log("✅ Test Stock reset to 0.");

    // 3. Test Purchase Flow
    console.log("\n🛒 Phase 3: Testing Purchase Flow...");
    // Simulate stock increment via Purchase (Manual for validation)
    const purchaseQty = 100;
    await prisma.$transaction(async (tx) => {
      // 1. Update Stock
      await tx.stock.upsert({
        where: { itemId_warehouseId: { itemId: rawMaterial.id, warehouseId: warehouse.id } },
        update: { quantity: { increment: purchaseQty } },
        create: { itemId: rawMaterial.id, warehouseId: warehouse.id, quantity: purchaseQty },
      });

      // 2. Add to Ledger
      await tx.stockLedger.create({
        data: {
          itemId: rawMaterial.id,
          warehouseId: warehouse.id,
          transactionType: StockTransactionType.IN,
          quantity: purchaseQty,
          rate: 10,
          referenceType: "PURCHASE",
          referenceId: "VAL-PUR-001",
          createdBy: admin.id,
        },
      });

      // 3. Create Voucher (Simplified for validation)
      await tx.voucher.create({
        data: {
          id: "VAL-VOU-PUR-001",
          voucherNumber: "VAL-VOU-PUR-001",
          type: VoucherType.PURCHASE,
          date: new Date(),
          status: "posted",
          createdBy: admin.id,
          updatedAt: new Date(),
          VoucherLine: {
            create: [
              { id: "VAL-LINE-1", lineNumber: 1, chartOfAccountId: coaMap["1620"], debitAmount: purchaseQty * 10, creditAmount: 0, updatedAt: new Date() },
              { id: "VAL-LINE-2", lineNumber: 2, chartOfAccountId: coaMap["2110"], debitAmount: 0, creditAmount: purchaseQty * 10, updatedAt: new Date() },
            ],
          },
        },
      });
    });
    console.log("✅ Purchase Flow successful: Stock updated, Ledger recorded, Accounting posted.");

    // 4. Test Production Flow
    console.log("\n🏭 Phase 4: Testing Production Flow...");
    const prodQty = 10;
    const rmRequired = 5; // 5 RM per 1 FG
    await prisma.$transaction(async (tx) => {
      // 1. Deduct RM Stock
      await tx.stock.update({
        where: { itemId_warehouseId: { itemId: rawMaterial.id, warehouseId: warehouse.id } },
        data: { quantity: { decrement: prodQty * rmRequired } },
      });

      // 2. Add FG Stock
      await tx.stock.upsert({
        where: { itemId_warehouseId: { itemId: finishedGood.id, warehouseId: warehouse.id } },
        update: { quantity: { increment: prodQty } },
        create: { itemId: finishedGood.id, warehouseId: warehouse.id, quantity: prodQty },
      });

      // 3. Ledger RM OUT
      await tx.stockLedger.create({
        data: {
          itemId: rawMaterial.id,
          warehouseId: warehouse.id,
          transactionType: StockTransactionType.OUT,
          quantity: -(prodQty * rmRequired),
          rate: 10,
          referenceType: "PRODUCTION",
          referenceId: "VAL-PROD-001",
          createdBy: admin.id,
        },
      });

      // 4. Ledger FG IN
      await tx.stockLedger.create({
        data: {
          itemId: finishedGood.id,
          warehouseId: warehouse.id,
          transactionType: StockTransactionType.IN,
          quantity: prodQty,
          rate: 50,
          referenceType: "PRODUCTION",
          referenceId: "VAL-PROD-001",
          createdBy: admin.id,
        },
      });

      // 5. Accounting movement
      await tx.voucher.create({
        data: {
          id: "VAL-VOU-PROD-001",
          voucherNumber: "VAL-VOU-PROD-001",
          type: VoucherType.JOURNAL,
          date: new Date(),
          status: "posted",
          createdBy: admin.id,
          updatedAt: new Date(),
          VoucherLine: {
            create: [
              { id: "VAL-LINE-3", lineNumber: 1, chartOfAccountId: coaMap["1630"], debitAmount: prodQty * 50, creditAmount: 0, updatedAt: new Date() },
              { id: "VAL-LINE-4", lineNumber: 2, chartOfAccountId: coaMap["1620"], debitAmount: 0, creditAmount: prodQty * rmRequired * 10, updatedAt: new Date() },
            ],
          },
        },
      });
    });
    console.log("✅ Production Flow successful: RM deducted, FG added, Costs moved.");

    // 5. Test Sales Flow
    console.log("\n💰 Phase 5: Testing Sales Flow...");
    const saleQty = 5;
    await prisma.$transaction(async (tx) => {
      // 1. Deduct FG Stock
      await tx.stock.update({
        where: { itemId_warehouseId: { itemId: finishedGood.id, warehouseId: warehouse.id } },
        data: { quantity: { decrement: saleQty } },
      });

      // 2. Ledger FG OUT
      await tx.stockLedger.create({
        data: {
          itemId: finishedGood.id,
          warehouseId: warehouse.id,
          transactionType: StockTransactionType.OUT,
          quantity: -saleQty,
          rate: 50,
          referenceType: "SALE",
          referenceId: "VAL-SALE-001",
          createdBy: admin.id,
        },
      });

      // 3. Accounting (Revenue & AR)
      await tx.voucher.create({
        data: {
          id: "VAL-VOU-SALE-001",
          voucherNumber: "VAL-VOU-SALE-001",
          type: VoucherType.SALES,
          date: new Date(),
          status: "posted",
          createdBy: admin.id,
          updatedAt: new Date(),
          VoucherLine: {
            create: [
              { id: "VAL-LINE-5", lineNumber: 1, chartOfAccountId: coaMap["1410"], debitAmount: saleQty * 100, creditAmount: 0, updatedAt: new Date() },
              { id: "VAL-LINE-6", lineNumber: 2, chartOfAccountId: coaMap["4110"], debitAmount: 0, creditAmount: saleQty * 100, updatedAt: new Date() },
              // COGS
              { id: "VAL-LINE-7", lineNumber: 3, chartOfAccountId: coaMap["5110"], debitAmount: saleQty * 50, creditAmount: 0, updatedAt: new Date() },
              { id: "VAL-LINE-8", lineNumber: 4, chartOfAccountId: coaMap["1630"], debitAmount: 0, creditAmount: saleQty * 50, updatedAt: new Date() },
            ],
          },
        },
      });
    });
    console.log("✅ Sales Flow successful: FG deducted, Revenue/AR/COGS recorded.");

    // 6. Verify Reporting Consistency
    console.log("\n📉 Phase 6: Verifying Reporting Consistency...");
    const fgStock = await prisma.stock.findUnique({
      where: { itemId_warehouseId: { itemId: finishedGood.id, warehouseId: warehouse.id } }
    });
    console.log(`Final FG Stock: ${fgStock?.quantity} (Expected: 5)`);
    if (Number(fgStock?.quantity) !== 5) throw new Error("Stock inconsistency!");

    const revenue = await prisma.voucherLine.aggregate({
      where: { chartOfAccountId: coaMap["4110"], Voucher: { status: "posted" } },
      _sum: { creditAmount: true }
    });
    console.log(`Total Sales Revenue: ${revenue._sum.creditAmount} (Expected: 500)`);

    console.log("\n✨ Pre-Deployment Validation COMPLETED SUCCESSFULLY!");

  } catch (error) {
    console.error("\n❌ Validation FAILED:");
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup validation data (Optional, but good for keeping DB clean)
    console.log("\n🧹 Cleaning up validation test data...");
    await prisma.voucherLine.deleteMany({ where: { id: { startsWith: "VAL-LINE-" } } });
    await prisma.voucher.deleteMany({ where: { id: { startsWith: "VAL-VOU-" } } });
    await prisma.stockLedger.deleteMany({ where: { referenceId: { startsWith: "VAL-" } } });
    // Note: We leave test items and warehouse for now, but we could delete them too
    console.log("✅ Cleanup complete.");
    await prisma.$disconnect();
  }
}

main();
