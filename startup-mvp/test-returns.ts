import { PrismaClient } from "@prisma/client";
import { processSaleReturn, voidSale } from "./app/(dashboard)/dashboard/sales/_actions/sale.action";

const prisma = new PrismaClient();

async function main() {
  // First let's check a completed sale
  const sale = await prisma.sale.findFirst({
    where: { status: "COMPLETED" },
    include: { items: true }
  });
  
  if (!sale) {
    console.log("No completed sale found.");
    return;
  }
  
  console.log("Found sale:", sale.saleNumber);
  
  // Look at stock ledgers for this sale
  const ledgers = await prisma.stockLedger.findMany({
    where: { referenceId: sale.id }
  });
  
  console.log("Ledgers for this sale:", ledgers);
  
  // Find any return sales
  const returnSales = await prisma.sale.findMany({
    where: { orderType: "RETURN" },
    include: { items: true }
  });
  
  console.log("Return Sales Count:", returnSales.length);
  if (returnSales.length > 0) {
    const returnSale = returnSales[0];
    const returnLedgers = await prisma.stockLedger.findMany({
      where: { referenceId: returnSale.id }
    });
    console.log("Ledgers for return sale:", returnSale.saleNumber, returnLedgers);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
