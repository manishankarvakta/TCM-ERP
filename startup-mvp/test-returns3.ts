import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const returnSales = await prisma.sale.findMany({
    where: { orderType: "RETURN" },
    include: { items: true }
  });
  
  console.log("Return Sales Count:", returnSales.length);
  for (const sale of returnSales) {
    const ledgers = await prisma.stockLedger.findMany({
      where: { referenceId: sale.id }
    });
    console.log(`Sale ${sale.saleNumber} has ${ledgers.length} ledgers`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
