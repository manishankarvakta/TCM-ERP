import { prisma } from "../lib/prisma";

async function clearProductData() {
  console.log("🚀 Starting complete product data cleanup via TRUNCATE CASCADE...");

  // Execute raw CASCADE truncate on Item table
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Item" CASCADE;`);

  const remainingCount = await prisma.item.count();
  console.log("✅ All product data cleared successfully!");
  console.log(`Remaining products/items in database: ${remainingCount}`);
}

clearProductData()
  .catch((err) => {
    console.error("❌ Error clearing product data:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
