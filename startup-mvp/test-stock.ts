import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const stockCount = await prisma.stock.count();
  console.log("Stock count:", stockCount);
  const stockWithItem = await prisma.stock.findFirst({ include: { warehouse: true } });
  console.log("Sample stock:", stockWithItem);
}
main().catch(console.error).finally(() => prisma.$disconnect());
