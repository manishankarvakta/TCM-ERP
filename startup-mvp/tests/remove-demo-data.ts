import { prisma } from "../lib/prisma";

async function main() {
  console.log("Removing demo sales, collections, and receipt vouchers from database...");

  // 1. Delete generated receipt vouchers
  const deleteVouchers = await prisma.voucher.deleteMany({
    where: {
      voucherNumber: {
        startsWith: "DEMO-VOU-"
      }
    }
  });
  console.log(`Deleted ${deleteVouchers.count} demo vouchers.`);

  // 2. Delete generated sales
  const deleteSales = await prisma.sale.deleteMany({
    where: {
      saleNumber: {
        startsWith: "DEMO-SAL-"
      }
    }
  });
  console.log(`Deleted ${deleteSales.count} demo sales.`);

  console.log("Cleanup completed successfully!");
}

main().catch(err => {
  console.error("Error during cleanup:", err);
});
