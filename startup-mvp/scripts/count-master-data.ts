import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function countData() {
  console.log("Checking Master Data Counts...");
  try {
    const units = await prisma.unit.count();
    console.log(`Units: ${units}`);

    const categories = await prisma.category.count();
    console.log(`Categories: ${categories}`);
    
    const items = await prisma.item.count();
    console.log(`Items: ${items}`);

    const moduleGroups = await prisma.moduleGroup.count();
    console.log(`ModuleGroups: ${moduleGroups}`);
    
    const moduleGroupItems = await prisma.moduleGroupItem.count();
    console.log(`ModuleGroupItems: ${moduleGroupItems}`);

  } catch (error) {
    console.error("❌ Count failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

countData();
