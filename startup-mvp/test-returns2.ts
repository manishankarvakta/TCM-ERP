import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const voidLedgers = await prisma.stockLedger.findMany({
    where: { referenceId: "VOID_RETURN" }
  });
  console.log("VOID_RETURN ledgers:", voidLedgers.length);
  
  const saleReturnLedgers = await prisma.stockLedger.findMany({
    where: { referenceType: "SALE_RETURN" }
  });
  console.log("SALE_RETURN ledgers count:", saleReturnLedgers.length);
  
  const saleVoidLedgers = await prisma.stockLedger.findMany({
    where: { referenceType: "SALE_VOID" }
  });
  console.log("SALE_VOID ledgers count:", saleVoidLedgers.length);
  
  if (saleReturnLedgers.length > 0) {
      console.log(saleReturnLedgers[0]);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
