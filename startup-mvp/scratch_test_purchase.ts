import { prisma } from "./lib/prisma";

async function main() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log("No user found");
      return;
    }
    const wh = await prisma.warehouse.findFirst();
    if (!wh) {
      console.log("No warehouse found");
      return;
    }

    console.log("Testing Purchase.create with supplierId: null...");
    const p = await prisma.purchase.create({
      data: {
        purchaseNumber: `TEST-PUR-${Date.now()}`,
        supplierId: null,
        warehouseId: wh.id,
        status: "DRAFT",
        subTotal: 100,
        grandTotal: 100,
        createdBy: user.id,
      }
    });
    console.log("SUCCESS! Created purchase:", p.id, p.purchaseNumber);

    // clean up test
    await prisma.purchase.delete({ where: { id: p.id } });
    console.log("Cleaned up test purchase");
  } catch (err) {
    console.error("ERROR creating purchase:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
