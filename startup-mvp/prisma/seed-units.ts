import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds ONLY the units data
 * 
 * NOTE: `Unit.createdBy` is required (FK -> User). This seed does NOT create users.
 * Ensure at least one user exists (preferably admin) before running.
 */
async function main() {
  console.log("🌱 Seeding units...");

  // Find a user to set as creator (required by the schema)
  const creator =
    (await prisma.user.findFirst({
      where: { role: "admin", status: "active" },
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.user.findFirst({
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    }));

  if (!creator) {
    throw new Error(
      "No users found in DB. Cannot seed `Unit` because `Unit.createdBy` is required. Create an admin/user first, then re-run the seed."
    );
  }

  const units = [
    { symbol: "set", details: "Set", status: "active" },
    { symbol: "pc", details: "Piece", status: "active" },
    { symbol: "m", details: "Meter", status: "active" },
    { symbol: "sm", details: "Square Meter", status: "active" },
    { symbol: "mm", details: "Millimeter", status: "active" },
    { symbol: "smm", details: "Square Millimeter", status: "active" },
    { symbol: "ft", details: "Feet", status: "active" },
    { symbol: "sft", details: "Square Feet", status: "active" },
    { symbol: "rft", details: "Running Feet", status: "active" },
    { symbol: "in", details: "Inch", status: "active" },
  ] as const;

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { symbol: unit.symbol },
      update: {
        details: unit.details,
        status: unit.status,
      },
      create: {
        symbol: unit.symbol,
        details: unit.details,
        status: unit.status,
        createdBy: creator.id,
      },
    });
    console.log(`✅ Upserted unit: ${unit.symbol} - ${unit.details} (${unit.status})`);
  }

  // Best-effort cleanup: delete units not in the list (may fail if referenced by Items)
  try {
    const keepSymbols = units.map((u) => u.symbol);
    const res = await prisma.unit.deleteMany({
      where: { symbol: { notIn: keepSymbols } },
    });
    if (res.count > 0) {
      console.log(`🧹 Removed ${res.count} other unit(s) not in the requested list.`);
    }
  } catch (err) {
    console.warn(
      "⚠️ Could not delete other units (they may be referenced by items). Leaving existing extra units as-is."
    );
    console.warn(err);
  }

  console.log(`✅ Done. Seeded ${units.length} unit(s). Creator: ${creator.email ?? creator.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

