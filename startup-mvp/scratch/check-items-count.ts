import { prisma } from "../lib/prisma";

async function main() {
  const count = await prisma.item.count();
  console.log(`Total products/items in database: ${count}`);

  const sample = await prisma.item.findMany({
    take: 5,
    select: { id: true, name: true, code: true, barcode: true, itemType: true },
  });
  console.log("Sample items:", JSON.stringify(sample, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
