import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Units");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Get admin user for createdBy reference
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
    if (!adminUser) {
      throw new Error("Admin user not found. Please run seed-users.ts first.");
    }
    const adminUserId = adminUser.id;

    // Seed Units
    console.log("\n📏 Seeding Units...");
    const units = [
      {
        id: "cmj9sdwix0006o101irp1g5yv",
        details: "Millimeter",
        symbol: "mm",
        status: "active",
        createdBy: adminUserId,
        createdAt: new Date("2025-12-17T09:05:48.009Z"),
        updatedAt: new Date("2025-12-17T18:56:21.262Z"),
      },
      {
        id: "cmj9se2bp000ao101xqyl20n4",
        details: "Feet",
        symbol: "ft",
        status: "active",
        createdBy: adminUserId,
        createdAt: new Date("2025-12-17T09:05:55.525Z"),
        updatedAt: new Date("2025-12-17T18:56:21.269Z"),
      },
      {
        id: "cmj9sfj0c000eo101ef5ktf85",
        details: "Meter",
        symbol: "m",
        status: "active",
        createdBy: adminUserId,
        createdAt: new Date("2025-12-17T09:07:03.804Z"),
        updatedAt: new Date("2025-12-17T18:56:21.255Z"),
      },
      {
        id: "cmjadhczi0001o08s5u47x58x",
        details: "Set",
        symbol: "set",
        status: "active",
        createdBy: adminUserId,
        createdAt: new Date("2025-12-17T18:56:21.246Z"),
        updatedAt: new Date("2025-12-17T18:56:21.246Z"),
      },
      {
        id: "cmjadhczn0003o08stvt3ixd0",
        details: "Piece",
        symbol: "pc",
        status: "active",
        createdBy: adminUserId,
        createdAt: new Date("2025-12-17T18:56:21.252Z"),
        updatedAt: new Date("2025-12-17T18:56:21.252Z"),
      },
      {
        id: "cmjadhczu0007o08slg6d0gyv",
        details: "Square Meter",
        symbol: "sm",
        status: "active",
        createdBy: adminUserId,
        createdAt: new Date("2025-12-17T18:56:21.259Z"),
        updatedAt: new Date("2025-12-17T18:56:21.259Z"),
      },
      {
        id: "cmjadhd01000bo08sbl1f0p48",
        details: "Square Millimeter",
        symbol: "smm",
        status: "active",
        createdBy: adminUserId,
        createdAt: new Date("2025-12-17T18:56:21.266Z"),
        updatedAt: new Date("2025-12-17T18:56:21.266Z"),
      },
      {
        id: "cmjadhd09000fo08s2wvkaekb",
        details: "Square Feet",
        symbol: "sft",
        status: "active",
        createdBy: adminUserId,
        createdAt: new Date("2025-12-17T18:56:21.273Z"),
        updatedAt: new Date("2025-12-17T18:56:21.273Z"),
      },
      {
        id: "cmjadhd0c000ho08sxw29b47e",
        details: "Running Feet",
        symbol: "rft",
        status: "active",
        createdBy: adminUserId,
        createdAt: new Date("2025-12-17T18:56:21.276Z"),
        updatedAt: new Date("2025-12-17T18:56:21.276Z"),
      },
      {
        id: "cmjadhd0g000jo08sb8twuy9z",
        details: "Inch",
        symbol: "in",
        status: "active",
        createdBy: adminUserId,
        createdAt: new Date("2025-12-17T18:56:21.280Z"),
        updatedAt: new Date("2025-12-17T18:56:21.280Z"),
      },
    ];

    for (const unit of units) {
      // Check if unit exists with this symbol but different ID
      const existingUnit = await prisma.unit.findUnique({
        where: { symbol: unit.symbol },
      });

      if (existingUnit && existingUnit.id !== unit.id) {
        // Unit exists with different ID - we need to delete and recreate
        // But first check if any items reference it
        const itemsUsingUnit = await prisma.item.findMany({
          where: { unitId: existingUnit.id },
          select: { id: true },
        });

        if (itemsUsingUnit.length > 0) {
          console.log(`⚠️  Warning: Unit ${unit.symbol} exists with different ID (${existingUnit.id} vs ${unit.id})`);
          console.log(`   ${itemsUsingUnit.length} items are using the old ID. Skipping unit update.`);
          continue;
        }

        // No items using it, safe to delete and recreate
        await prisma.unit.delete({ where: { id: existingUnit.id } });
      }

      await prisma.unit.upsert({
        where: { id: unit.id },
        update: {
          details: unit.details,
          symbol: unit.symbol,
          status: unit.status,
          createdBy: unit.createdBy,
          updatedAt: unit.updatedAt,
        },
        create: unit,
      });
      console.log(`✅ Upserted unit: ${unit.symbol} - ${unit.details}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Units seeded!");
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

