import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const byItem = await prisma.stock.count({ where: { itemId: { not: null } } });
  const byVariant = await prisma.stock.count({ where: { variantId: { not: null } } });
  console.log("By Item:", byItem, "By Variant:", byVariant);
}
main().catch(console.error).finally(() => prisma.$disconnect());
