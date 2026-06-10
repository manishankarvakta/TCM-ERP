/**
 * Retroactively create accounting vouchers for existing transactions
 * 
 * This script creates vouchers for:
 * - RECEIVED purchases that don't have vouchers
 * - COMPLETED sales that don't have vouchers  
 * - COMPLETED production orders that don't have vouchers
 * 
 * Run with: npx tsx scripts/retroactive-accounting-vouchers.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createVouchersForPurchases() {
  console.log("\n📦 Creating vouchers for RECEIVED purchases...\n");
  console.log("Note: Purchase vouchers have been replaced by GRN vouchers. This script needs to be updated to generate GRNs first.");
}

async function createVouchersForSales() {
  console.log("\n💰 Creating vouchers for COMPLETED sales...\n");

  const sales = await prisma.sale.findMany({
    where: {
      status: "COMPLETED",
      voucherId: null,
    },
    take: 50,
  });

  console.log(`Found ${sales.length} sales without vouchers`);

  // Note: Sales vouchers are created in completeSale(), so if a sale is COMPLETED
  // but has no voucher, it means it was completed before the accounting integration
  // We would need to re-complete them, but that's not safe. Instead, we'll just log them.
  console.log("Note: Sales vouchers are created during completion. These sales may need to be re-completed.");
  for (const sale of sales) {
    console.log(`  - ${sale.saleNumber} (ID: ${sale.id})`);
  }
}

async function createVouchersForProductions() {
  console.log("\n🏭 Creating vouchers for COMPLETED production orders...\n");

  const productions = await prisma.productionOrder.findMany({
    where: {
      status: "COMPLETED",
      voucherId: null,
    },
    include: {
      bom: {
        include: {
          items: {
            include: {
              item: {
                select: {
                  costPrice: true,
                  trackInventory: true,
                },
              },
            },
          },
        },
      },
    },
    take: 50,
  });

  console.log(`Found ${productions.length} production orders without vouchers`);

  // Production vouchers are created in completeProductionOrder()
  // Similar to sales, we can't safely re-complete them
  console.log("Note: Production vouchers are created during completion. These orders may need to be re-completed.");
  for (const production of productions) {
    console.log(`  - ${production.code} (ID: ${production.id})`);
  }
}

async function main() {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Retroactive Accounting Vouchers");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    await createVouchersForPurchases();
    await createVouchersForSales();
    await createVouchersForProductions();

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Complete");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
