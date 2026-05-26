/**
 * Seed POS default data:
 * 1. Walkway Customer (default retail customer)
 * 2. Sample retail items
 * 3. Sample wholesale items
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedPOSDefaults() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: POS Defaults");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Get system user (first admin, role is stored as lowercase "admin")
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    });
    if (!adminUser) {
      console.log("⚠️  No admin user found, skipping POS seed");
      return;
    }
    console.log(`\n👤 Using admin user: ${adminUser.email ?? adminUser.id}`);

    // ─── Unit ───────────────────────────────────────────────────────────────
    // Unit model: { id, details, symbol, status, createdBy }
    // "details" is the display name, "symbol" is the unique key.
    let defaultUnit = await prisma.unit.findFirst({
      where: { symbol: "pc" },
      select: { id: true },
    });
    if (!defaultUnit) {
      defaultUnit = await prisma.unit.create({
        data: {
          details: "Piece",
          symbol: "pc",
          status: "active",
          createdBy: adminUser.id,
        },
        select: { id: true },
      });
      console.log("✅ Created unit: pc (Piece)");
    } else {
      console.log("ℹ️  Unit pc already exists");
    }

    // ─── Categories ─────────────────────────────────────────────────────────
    // Category model: { id, name, description, status }  — NO createdBy field
    console.log("\n📁 Seeding Categories...");

    let productCategory = await prisma.category.findFirst({
      where: { name: "Product" },
      select: { id: true },
    });
    if (!productCategory) {
      productCategory = await prisma.category.create({
        data: {
          name: "Product",
          description: "Finished products for sale",
          status: "active",
        },
        select: { id: true },
      });
      console.log("✅ Created category: Product");
    } else {
      console.log("ℹ️  Category 'Product' already exists");
    }

    let wholesaleCategory = await prisma.category.findFirst({
      where: { name: "Wholesale" },
      select: { id: true },
    });
    if (!wholesaleCategory) {
      wholesaleCategory = await prisma.category.create({
        data: {
          name: "Wholesale",
          description: "Wholesale products",
          status: "active",
        },
        select: { id: true },
      });
      console.log("✅ Created category: Wholesale");
    } else {
      console.log("ℹ️  Category 'Wholesale' already exists");
    }

    // ─── Walkway Customer ────────────────────────────────────────────────────
    // Client model: { name, email, phone, clientCode, clientType (String), status, createdBy }
    console.log("\n🚶 Seeding Walkway Customer...");

    const existingWalkway = await prisma.client.findFirst({
      where: {
        OR: [
          { email: "walkway@pos.local" },
          { name: { contains: "Walkway", mode: "insensitive" } },
        ],
      },
    });

    if (!existingWalkway) {
      await prisma.client.create({
        data: {
          name: "Walkway Customer",
          email: "walkway@pos.local",
          phone: "0000000000",
          clientCode: "WALK-001",
          clientType: "retail",
          status: "active",
          createdBy: adminUser.id,
        },
      });
      console.log("✅ Created Walkway Customer");
    } else {
      console.log("ℹ️  Walkway Customer already exists");
    }

    // ─── Retail Items ────────────────────────────────────────────────────────
    // Item model uses ItemType enum: RETAIL, WHOLESALE, RAW_MATERIAL, READY_PRODUCT
    console.log("\n👕 Seeding Retail Items...");

    const retailItems = [
      {
        code: "RET-001",
        name: "Classic T-Shirt",
        salesPrice: 350,
        costPrice: 200,
        description: "Cotton blend classic fit t-shirt",
      },
      {
        code: "RET-002",
        name: "Polo Shirt",
        salesPrice: 550,
        costPrice: 300,
        description: "Premium polo shirt",
      },
      {
        code: "RET-003",
        name: "Denim Jeans",
        salesPrice: 1200,
        costPrice: 700,
        description: "Slim fit denim jeans",
      },
      {
        code: "RET-004",
        name: "Casual Shirt",
        salesPrice: 750,
        costPrice: 400,
        description: "Casual button-up shirt",
      },
      {
        code: "RET-005",
        name: "Sports Shorts",
        salesPrice: 450,
        costPrice: 250,
        description: "Comfortable sports shorts",
      },
    ];

    for (const item of retailItems) {
      await prisma.item.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          description: item.description,
          salesPrice: item.salesPrice,
          costPrice: item.costPrice,
        },
        create: {
          code: item.code,
          name: item.name,
          description: item.description,
          itemType: "RETAIL",
          salesPrice: item.salesPrice,
          costPrice: item.costPrice,
          unitId: defaultUnit.id,
          categoryId: productCategory.id,
          status: "active",
          createdBy: adminUser.id,
          trackInventory: false,
        },
      });
      console.log(`✅ Upserted retail item: ${item.name}`);
    }

    // ─── Wholesale Items ─────────────────────────────────────────────────────
    console.log("\n📦 Seeding Wholesale Items...");

    const wholesaleItems = [
      {
        code: "WHL-001",
        name: "T-Shirt (Wholesale)",
        salesPrice: 250,
        wholesalePrice: 180,
        costPrice: 120,
        description: "Bulk t-shirts for wholesale",
      },
      {
        code: "WHL-002",
        name: "Polo (Wholesale)",
        salesPrice: 420,
        wholesalePrice: 300,
        costPrice: 200,
        description: "Bulk polo shirts for wholesale",
      },
      {
        code: "WHL-003",
        name: "Jeans (Wholesale)",
        salesPrice: 900,
        wholesalePrice: 650,
        costPrice: 450,
        description: "Bulk denim jeans for wholesale",
      },
    ];

    for (const item of wholesaleItems) {
      await prisma.item.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          description: item.description,
          salesPrice: item.salesPrice,
          wholesalePrice: item.wholesalePrice,
          costPrice: item.costPrice,
        },
        create: {
          code: item.code,
          name: item.name,
          description: item.description,
          itemType: "WHOLESALE",
          salesPrice: item.salesPrice,
          wholesalePrice: item.wholesalePrice,
          costPrice: item.costPrice,
          unitId: defaultUnit.id,
          categoryId: wholesaleCategory.id,
          status: "active",
          createdBy: adminUser.id,
          trackInventory: false,
        },
      });
      console.log(`✅ Upserted wholesale item: ${item.name}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: POS defaults seeded!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: POS seed failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedPOSDefaults()
    .catch((e) => {
      console.error("💥 Fatal error details:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
