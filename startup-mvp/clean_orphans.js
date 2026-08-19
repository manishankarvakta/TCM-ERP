const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking for orphaned Section records...");
  
  // 1. Get all sections
  const sections = await prisma.section.findMany({
    select: { id: true, quotationId: true }
  });
  
  // 2. Get all valid quotation IDs
  const quotations = await prisma.quotation.findMany({
    select: { id: true }
  });
  
  const quotationIds = new Set(quotations.map(q => q.id));
  
  // 3. Find sections whose quotationId doesn't exist in Quotation table
  const orphanIds = sections
    .filter(s => !quotationIds.has(s.quotationId))
    .map(s => s.id);
    
  console.log(`📊 Total Sections in DB: ${sections.length}`);
  console.log(`📊 Total Quotations in DB: ${quotations.length}`);
  console.log(`⚠️ Orphaned Sections found: ${orphanIds.length}`);
  
  if (orphanIds.length > 0) {
    console.log("🧹 Deleting orphaned sections (these belong to deleted quotations)...");
    const deleteResult = await prisma.section.deleteMany({
      where: {
        id: { in: orphanIds }
      }
    });
    console.log(`✅ Successfully deleted ${deleteResult.count} orphaned sections.`);
  } else {
    console.log("✨ No orphaned sections found. Database is clean!");
  }
}

main()
  .catch(e => {
    console.error("❌ Error running cleanup script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
