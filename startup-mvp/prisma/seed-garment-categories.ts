/**
 * Garment Categories Seed Script
 *
 * Seeds requested garment categories: shirt, pant, t-shirt, polo, jeans.
 * Run this AFTER seed-clear-transactions.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Specific Garment Categories");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const now = new Date();

    const categories = [
      {
        name: "Shirt",
        description: "Formal and casual shirts for men, women, and kids",
        status: "active",
      },
      {
        name: "Pant",
        description: "Formal trousers, chinos, and other pants",
        status: "active",
      },
      {
        name: "T-Shirt",
        description: "Round neck, V-neck, and graphic t-shirts",
        status: "active",
      },
      {
        name: "Polo",
        description: "Pique and knit polo collar shirts",
        status: "active",
      },
      {
        name: "Jeans",
        description: "Denim jeans, jackets, and other denim apparel",
        status: "active",
      },
    ];

    console.log(`\n📁 Seeding ${categories.length} Garment Categories...\n`);

    for (const cat of categories) {
      const existing = await prisma.category.findFirst({
        where: { name: cat.name },
      });

      if (existing) {
        await prisma.category.update({
          where: { id: existing.id },
          data: {
            description: cat.description,
            status: cat.status,
            updatedAt: now,
          },
        });
        console.log(`🔄 Updated category: ${cat.name}`);
      } else {
        await prisma.category.create({
          data: {
            name: cat.name,
            description: cat.description,
            status: cat.status,
          },
        });
        console.log(`✅ Created category: ${cat.name}`);
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ SUCCESS: ${categories.length} garment categories seeded!`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: Seeding categories failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("💥 Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
