import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Categories");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Seed Categories
    console.log("\n📁 Seeding Categories...");
    const categories = [
      {
        id: "cmjalu72i00fzo001p2pmrebj",
        name: "Accessories",
        description: null,
        status: "active",
        createdAt: new Date("2025-12-17T22:50:17.034Z"),
        updatedAt: new Date("2025-12-17T22:50:17.034Z"),
      },
      {
        id: "cmjb4g9od000no001a4onyf2s",
        name: "Appliances",
        description: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:31:19.933Z"),
        updatedAt: new Date("2025-12-18T07:31:19.933Z"),
      },
      {
        id: "cmjdve7lc000co001nc7nemhf",
        name: "Fotile",
        description: null,
        status: "active",
        createdAt: new Date("2025-12-20T05:41:05.904Z"),
        updatedAt: new Date("2025-12-20T05:41:05.904Z"),
      },
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { id: category.id },
        update: {
          name: category.name,
          description: category.description,
          status: category.status,
          updatedAt: category.updatedAt,
        },
        create: category,
      });
      console.log(`✅ Upserted category: ${category.name}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Categories seeded!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: Seeding failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("💥 Fatal error details:", e);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

