const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting cleanup of orphaned Sections in database...");

  // 1. Fetch all valid quotation IDs
  const quotations = await prisma.quotation.findMany({
    select: { id: true }
  });
  const quotationIds = new Set(quotations.map(q => q.id));
  console.log(`Loaded ${quotationIds.size} valid Quotations.`);

  // 2. Fetch all Section records
  const sections = await prisma.section.findMany({
    select: { id: true, quotationId: true }
  });
  console.log(`Loaded ${sections.length} total Sections.`);

  // 3. Filter Sections whose quotationId is not in the Quotation IDs set
  const orphanedSections = sections.filter(s => !quotationIds.has(s.quotationId));
  console.log(`Found ${orphanedSections.length} orphaned Sections referencing non-existent quotations.`);

  // 4. Delete the orphaned Sections
  if (orphanedSections.length > 0) {
    const idsToDelete = orphanedSections.map(s => s.id);
    const deleteResult = await prisma.section.deleteMany({
      where: {
        id: { in: idsToDelete }
      }
    });
    console.log(`Successfully deleted ${deleteResult.count} orphaned Sections.`);
  } else {
    console.log("No orphaned Sections found to delete.");
  }

  console.log("Cleanup finished successfully!");
}

main()
  .catch((e) => {
    console.error("Database cleanup script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
