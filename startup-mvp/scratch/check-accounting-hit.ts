import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const purchaseCount = await prisma.purchase.count();
  const receivedPurchaseCount = await prisma.purchase.count({ where: { status: "RECEIVED" } });
  const purchaseVoucherCount = await prisma.purchase.count({ where: { voucherId: { not: null } } });

  const saleCount = await prisma.sale.count();
  const completedSaleCount = await prisma.sale.count({ where: { status: "COMPLETED" } });
  const saleVoucherCount = await prisma.sale.count({ where: { voucherId: { not: null } } });

  const voucherCount = await prisma.voucher.count();
  const postedVoucherCount = await prisma.voucher.count({ where: { status: "posted" } });
  
  const journalEntryCount = await prisma.journalEntry.count();

  const purchasesWithoutVoucher = await prisma.purchase.findMany({
    where: { status: "RECEIVED", voucherId: null },
    select: { id: true, purchaseNumber: true, createdAt: true }
  });

  const salesWithoutVoucher = await prisma.sale.findMany({
    where: { status: "COMPLETED", voucherId: null },
    select: { id: true, saleNumber: true, createdAt: true }
  });

  const purchasesWithVoucher = await prisma.purchase.findMany({
    where: { voucherId: { not: null } },
    select: { id: true, purchaseNumber: true, createdAt: true }
  });

  const salesWithVoucher = await prisma.sale.findMany({
    where: { voucherId: { not: null } },
    select: { id: true, saleNumber: true, createdAt: true }
  });

  console.log("--- Accounting Integration Report ---");
  console.log(`Total Purchases: ${purchaseCount}`);
  console.log(`Received Purchases: ${receivedPurchaseCount}`);
  console.log(`Purchases with Voucher: ${purchaseVoucherCount}`);
  if (purchasesWithVoucher.length > 0) {
    console.log("Purchases with vouchers:");
    purchasesWithVoucher.forEach(p => console.log(` + ${p.purchaseNumber} (Created: ${p.createdAt.toISOString()})`));
  }
  if (purchasesWithoutVoucher.length > 0) {
    console.log("Purchases missing vouchers:");
    purchasesWithoutVoucher.forEach(p => console.log(` - ${p.purchaseNumber} (Created: ${p.createdAt.toISOString()})`));
  }

  console.log("");
  console.log(`Total Sales: ${saleCount}`);
  console.log(`Completed Sales: ${completedSaleCount}`);
  console.log(`Sales with Voucher: ${saleVoucherCount}`);
  if (salesWithVoucher.length > 0) {
    console.log("Sales with vouchers:");
    salesWithVoucher.forEach(s => console.log(` + ${s.saleNumber} (Created: ${s.createdAt.toISOString()})`));
  }
  if (salesWithoutVoucher.length > 0) {
    console.log("Sales missing vouchers:");
    salesWithoutVoucher.forEach(s => console.log(` - ${s.saleNumber} (Created: ${s.createdAt.toISOString()})`));
  }

  console.log("");
  console.log(`Total Vouchers: ${voucherCount}`);
  console.log(`Posted Vouchers: ${postedVoucherCount}`);
  console.log(`Total Journal Entries: ${journalEntryCount}`);
  
  if (receivedPurchaseCount === purchaseVoucherCount && completedSaleCount === saleVoucherCount) {
    console.log("\nStatus: Accounting integration is working correctly. All completed/received transactions have associated vouchers.");
  } else {
    console.log("\nStatus: Potential discrepancy detected. Not all completed/received transactions have vouchers.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
