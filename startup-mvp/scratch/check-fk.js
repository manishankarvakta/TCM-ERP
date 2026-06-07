const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const variants = await prisma.productVariant.findMany({
    select: {
      id: true,
      sku: true,
      itemId: true
    }
  });

  const items = await prisma.item.findMany({
    select: { id: true }
  });

  const itemIds = new Set(items.map(i => i.id));

  const invalidVariants = variants.filter(v => !itemIds.has(v.itemId));

  console.log('Total Variants:', variants.length);
  console.log('Total Items:', items.length);
  console.log('Invalid Variants:', invalidVariants.length);
  if (invalidVariants.length > 0) {
    console.log('Some Invalid Variants:', invalidVariants.slice(0, 5));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
