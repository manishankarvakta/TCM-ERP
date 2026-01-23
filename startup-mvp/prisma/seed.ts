import { PrismaClient, ItemType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function tk(n: number): string {
  // Prisma Decimal accepts string or Decimal-like; using string is simplest
  return n.toFixed(2);
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 Seeding database (master: categories/units/items/warehouses)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const adminEmail = "admin@example.com";
  const adminPassword = "admin123";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Admin",
      password: adminPasswordHash,
      role: "admin",
      status: "active",
    },
    create: {
      name: "Admin",
      email: adminEmail,
      password: adminPasswordHash,
      role: "admin",
      status: "active",
    },
    select: { id: true, email: true },
  });

  await prisma.organization.upsert({
    where: { id: "default-org" },
    update: {
      name: "Bhagyakul Biryani House",
      status: "active",
    },
    create: {
      id: "default-org",
      name: "Bhagyakul Biryani House",
      details: "Premium biryani production house",
      status: "active",
      createdBy: admin.id,
    },
  });

  const units = [
    { symbol: "kg", details: "Kilogram" },
    { symbol: "g", details: "Gram" },
    { symbol: "l", details: "Liter" },
    { symbol: "ml", details: "Milliliter" },
    { symbol: "pcs", details: "Pieces" },
    { symbol: "pack", details: "Pack" },
  ] as const;

  for (const u of units) {
    await prisma.unit.upsert({
      where: { symbol: u.symbol },
      update: {
        details: u.details,
        status: "active",
      },
      create: {
        symbol: u.symbol,
        details: u.details,
        status: "active",
        createdBy: admin.id,
      },
    });
  }

  const categories = [
    { name: "Rice & Grains", description: "Rice varieties and grains" },
    { name: "Meat & Poultry", description: "Chicken, mutton, beef" },
    { name: "Spices & Seasonings", description: "Whole spices, ground spices, masalas" },
    { name: "Dairy & Fats", description: "Yogurt, ghee, butter, cream" },
    { name: "Vegetables", description: "Onions, tomatoes, potatoes, etc." },
    { name: "Beverages", description: "Soft drinks, juices, water" },
    { name: "Sides & Accompaniments", description: "Raita, salad, pickles, chutney" },
    { name: "Biryani Dishes", description: "Finished biryani products" },
  ] as const;

  for (const c of categories) {
    const existing = await prisma.category.findFirst({
      where: { name: c.name },
    });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { description: c.description, status: "active" },
      });
    } else {
      await prisma.category.create({
        data: { name: c.name, description: c.description, status: "active" },
      });
    }
  }

  const [kg, g, l, ml, pcs, pack] = await Promise.all([
    prisma.unit.findUniqueOrThrow({ where: { symbol: "kg" } }),
    prisma.unit.findUniqueOrThrow({ where: { symbol: "g" } }),
    prisma.unit.findUniqueOrThrow({ where: { symbol: "l" } }),
    prisma.unit.findUniqueOrThrow({ where: { symbol: "ml" } }),
    prisma.unit.findUniqueOrThrow({ where: { symbol: "pcs" } }),
    prisma.unit.findUniqueOrThrow({ where: { symbol: "pack" } }),
  ]);

  const [catRice, catMeat, catSpices, catDairy, catVeg, catBeverages, catSides, catBiryani] = await Promise.all([
    prisma.category.findFirstOrThrow({ where: { name: "Rice & Grains" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Meat & Poultry" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Spices & Seasonings" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Dairy & Fats" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Vegetables" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Beverages" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Sides & Accompaniments" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Biryani Dishes" } }),
  ]);

  const year = new Date().getFullYear();
  const items = [
    // RAW MATERIALS - Rice & Grains
    {
      code: `RM-${year}-0001`,
      name: "Basmati Rice (Premium)",
      description: "Premium quality basmati rice for biryani",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catRice.id,
      unitId: kg.id,
      costPrice: tk(120),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0002`,
      name: "Kali Jeera Rice",
      description: "Traditional biryani rice variety",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catRice.id,
      unitId: kg.id,
      costPrice: tk(95),
      salesPrice: null,
      trackInventory: true,
    },
    // RAW MATERIALS - Meat & Poultry
    {
      code: `RM-${year}-0003`,
      name: "Chicken (Whole)",
      description: "Fresh whole chicken for biryani",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catMeat.id,
      unitId: kg.id,
      costPrice: tk(180),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0004`,
      name: "Mutton (Goat Meat)",
      description: "Premium mutton for biryani",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catMeat.id,
      unitId: kg.id,
      costPrice: tk(650),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0005`,
      name: "Beef",
      description: "Beef for beef biryani",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catMeat.id,
      unitId: kg.id,
      costPrice: tk(550),
      salesPrice: null,
      trackInventory: true,
    },
    // RAW MATERIALS - Spices
    {
      code: `RM-${year}-0006`,
      name: "Garam Masala",
      description: "Mixed spice blend for biryani",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catSpices.id,
      unitId: g.id,
      costPrice: tk(1.5),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0007`,
      name: "Biryani Masala",
      description: "Special biryani spice mix",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catSpices.id,
      unitId: g.id,
      costPrice: tk(2.0),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0008`,
      name: "Turmeric Powder",
      description: "Ground turmeric",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catSpices.id,
      unitId: g.id,
      costPrice: tk(0.8),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0009`,
      name: "Red Chili Powder",
      description: "Ground red chili",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catSpices.id,
      unitId: g.id,
      costPrice: tk(1.2),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0010`,
      name: "Cumin Seeds",
      description: "Whole cumin seeds",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catSpices.id,
      unitId: g.id,
      costPrice: tk(1.0),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0011`,
      name: "Cardamom (Green)",
      description: "Green cardamom pods",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catSpices.id,
      unitId: g.id,
      costPrice: tk(3.5),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0012`,
      name: "Cinnamon Sticks",
      description: "Cinnamon bark",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catSpices.id,
      unitId: g.id,
      costPrice: tk(2.5),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0013`,
      name: "Bay Leaves",
      description: "Dried bay leaves",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catSpices.id,
      unitId: g.id,
      costPrice: tk(1.8),
      salesPrice: null,
      trackInventory: true,
    },
    // RAW MATERIALS - Dairy & Fats
    {
      code: `RM-${year}-0014`,
      name: "Ghee (Clarified Butter)",
      description: "Pure ghee for biryani",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catDairy.id,
      unitId: kg.id,
      costPrice: tk(850),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0015`,
      name: "Yogurt (Curd)",
      description: "Fresh yogurt for marination",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catDairy.id,
      unitId: kg.id,
      costPrice: tk(80),
      salesPrice: null,
      trackInventory: true,
    },
    // RAW MATERIALS - Vegetables
    {
      code: `RM-${year}-0016`,
      name: "Onions",
      description: "Fresh onions for biryani",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catVeg.id,
      unitId: kg.id,
      costPrice: tk(45),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0017`,
      name: "Tomatoes",
      description: "Fresh tomatoes",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catVeg.id,
      unitId: kg.id,
      costPrice: tk(60),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0018`,
      name: "Ginger",
      description: "Fresh ginger root",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catVeg.id,
      unitId: kg.id,
      costPrice: tk(200),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0019`,
      name: "Garlic",
      description: "Fresh garlic bulbs",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catVeg.id,
      unitId: kg.id,
      costPrice: tk(150),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0020`,
      name: "Green Chilies",
      description: "Fresh green chilies",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catVeg.id,
      unitId: kg.id,
      costPrice: tk(120),
      salesPrice: null,
      trackInventory: true,
    },
    // FINISHED GOODS - Biryani Dishes
    {
      code: `FG-${year}-0001`,
      name: "Chicken Biryani (Half)",
      description: "Half portion chicken biryani",
      itemType: "FINISHED_GOOD" as ItemType,
      categoryId: catBiryani.id,
      unitId: pcs.id,
      costPrice: tk(90),
      salesPrice: tk(180),
      trackInventory: true,
    },
    {
      code: `FG-${year}-0002`,
      name: "Chicken Biryani (Full)",
      description: "Full portion chicken biryani",
      itemType: "FINISHED_GOOD" as ItemType,
      categoryId: catBiryani.id,
      unitId: pcs.id,
      costPrice: tk(160),
      salesPrice: tk(320),
      trackInventory: true,
    },
    {
      code: `FG-${year}-0003`,
      name: "Mutton Biryani (Half)",
      description: "Half portion mutton biryani",
      itemType: "FINISHED_GOOD" as ItemType,
      categoryId: catBiryani.id,
      unitId: pcs.id,
      costPrice: tk(220),
      salesPrice: tk(450),
      trackInventory: true,
    },
    {
      code: `FG-${year}-0004`,
      name: "Mutton Biryani (Full)",
      description: "Full portion mutton biryani",
      itemType: "FINISHED_GOOD" as ItemType,
      categoryId: catBiryani.id,
      unitId: pcs.id,
      costPrice: tk(400),
      salesPrice: tk(800),
      trackInventory: true,
    },
    {
      code: `FG-${year}-0005`,
      name: "Beef Biryani (Half)",
      description: "Half portion beef biryani",
      itemType: "FINISHED_GOOD" as ItemType,
      categoryId: catBiryani.id,
      unitId: pcs.id,
      costPrice: tk(180),
      salesPrice: tk(380),
      trackInventory: true,
    },
    {
      code: `FG-${year}-0006`,
      name: "Beef Biryani (Full)",
      description: "Full portion beef biryani",
      itemType: "FINISHED_GOOD" as ItemType,
      categoryId: catBiryani.id,
      unitId: pcs.id,
      costPrice: tk(320),
      salesPrice: tk(650),
      trackInventory: true,
    },
    {
      code: `FG-${year}-0007`,
      name: "Special Biryani (Half)",
      description: "Half portion special biryani with extra meat",
      itemType: "FINISHED_GOOD" as ItemType,
      categoryId: catBiryani.id,
      unitId: pcs.id,
      costPrice: tk(250),
      salesPrice: tk(500),
      trackInventory: true,
    },
    {
      code: `FG-${year}-0008`,
      name: "Special Biryani (Full)",
      description: "Full portion special biryani with extra meat",
      itemType: "FINISHED_GOOD" as ItemType,
      categoryId: catBiryani.id,
      unitId: pcs.id,
      costPrice: tk(450),
      salesPrice: tk(900),
      trackInventory: true,
    },
    // RETAIL - Beverages
    {
      code: `RT-${year}-0001`,
      name: "Coca Cola (500ml)",
      description: "Soft drink",
      itemType: "RETAIL" as ItemType,
      categoryId: catBeverages.id,
      unitId: pcs.id,
      costPrice: tk(30),
      salesPrice: tk(40),
      trackInventory: true,
    },
    {
      code: `RT-${year}-0002`,
      name: "Pepsi (500ml)",
      description: "Soft drink",
      itemType: "RETAIL" as ItemType,
      categoryId: catBeverages.id,
      unitId: pcs.id,
      costPrice: tk(30),
      salesPrice: tk(40),
      trackInventory: true,
    },
    {
      code: `RT-${year}-0003`,
      name: "7UP (500ml)",
      description: "Soft drink",
      itemType: "RETAIL" as ItemType,
      categoryId: catBeverages.id,
      unitId: pcs.id,
      costPrice: tk(30),
      salesPrice: tk(40),
      trackInventory: true,
    },
    {
      code: `RT-${year}-0004`,
      name: "Mineral Water (500ml)",
      description: "Bottled water",
      itemType: "RETAIL" as ItemType,
      categoryId: catBeverages.id,
      unitId: pcs.id,
      costPrice: tk(12),
      salesPrice: tk(20),
      trackInventory: true,
    },
    {
      code: `RT-${year}-0005`,
      name: "Lassi (Sweet)",
      description: "Sweet yogurt drink",
      itemType: "RETAIL" as ItemType,
      categoryId: catBeverages.id,
      unitId: pcs.id,
      costPrice: tk(25),
      salesPrice: tk(50),
      trackInventory: true,
    },
    // RETAIL - Sides & Accompaniments
    {
      code: `RT-${year}-0006`,
      name: "Raita (Bowl)",
      description: "Yogurt raita with cucumber",
      itemType: "RETAIL" as ItemType,
      categoryId: catSides.id,
      unitId: pcs.id,
      costPrice: tk(15),
      salesPrice: tk(30),
      trackInventory: true,
    },
    {
      code: `RT-${year}-0007`,
      name: "Salad (Bowl)",
      description: "Fresh mixed salad",
      itemType: "RETAIL" as ItemType,
      categoryId: catSides.id,
      unitId: pcs.id,
      costPrice: tk(10),
      salesPrice: tk(25),
      trackInventory: true,
    },
    {
      code: `RT-${year}-0008`,
      name: "Pickle (Small)",
      description: "Mixed pickle",
      itemType: "RETAIL" as ItemType,
      categoryId: catSides.id,
      unitId: pcs.id,
      costPrice: tk(8),
      salesPrice: tk(15),
      trackInventory: true,
    },
    {
      code: `RT-${year}-0009`,
      name: "Chutney (Small)",
      description: "Mint chutney",
      itemType: "RETAIL" as ItemType,
      categoryId: catSides.id,
      unitId: pcs.id,
      costPrice: tk(5),
      salesPrice: tk(10),
      trackInventory: true,
    },
    {
      code: `RT-${year}-0010`,
      name: "Boiled Egg",
      description: "Boiled egg",
      itemType: "RETAIL" as ItemType,
      categoryId: catSides.id,
      unitId: pcs.id,
      costPrice: tk(8),
      salesPrice: tk(15),
      trackInventory: true,
    },
  ] as const;

  for (const it of items) {
    await prisma.item.upsert({
      where: { code: it.code },
      update: {
        name: it.name,
        description: it.description,
        itemType: it.itemType,
        categoryId: it.categoryId,
        unitId: it.unitId,
        costPrice: it.costPrice,
        salesPrice: it.salesPrice,
        trackInventory: it.trackInventory,
        status: "active",
        isTrash: false,
      },
      create: {
        code: it.code,
        name: it.name,
        description: it.description,
        itemType: it.itemType,
        categoryId: it.categoryId,
        unitId: it.unitId,
        costPrice: it.costPrice,
        salesPrice: it.salesPrice,
        trackInventory: it.trackInventory,
        status: "active",
        isTrash: false,
        createdBy: admin.id,
      },
    });
  }

  // Seed Warehouses
  const warehouses = [
    {
      code: "WH-2026-0001",
      name: "Main Warehouse",
      address: "123 Industrial Area",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
      status: "active",
    },
    {
      code: "WH-2026-0002",
      name: "Kitchen Warehouse",
      address: "456 Production Street",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
      status: "active",
    },
    {
      code: "WH-2026-0003",
      name: "Retail Outlet Store",
      address: "789 Commercial Road",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
      status: "active",
    },
    {
      code: "WH-2026-0004",
      name: "Cold Storage Unit",
      address: "321 Freezer Lane",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
      status: "active",
    },
    {
      code: "WH-2026-0005",
      name: "Spice Storage",
      address: "654 Spice Market",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
      status: "active",
    },
  ];

  for (const w of warehouses) {
    await prisma.warehouse.upsert({
      where: { code: w.code },
      update: {
        name: w.name,
        address: w.address,
        city: w.city,
        state: w.state,
        zip: w.zip,
        country: w.country,
        status: w.status,
        isTrash: false,
      },
      create: {
        code: w.code,
        name: w.name,
        address: w.address,
        city: w.city,
        state: w.state,
        zip: w.zip,
        country: w.country,
        status: w.status,
        isTrash: false,
        createdBy: admin.id,
      },
    });
  }

  console.log(`✅ Seeded ${warehouses.length} warehouses`);

  // Register ModuleOperation rows for inventory.warehouses
  const warehouseOperations = [
    { operation: "view", label: "View Warehouses" },
    { operation: "create", label: "Create Warehouses" },
    { operation: "edit", label: "Edit Warehouses" },
    { operation: "move-to-trash", label: "Delete Warehouses" },
    { operation: "delete-permanently", label: "Permanently Delete Warehouses" },
  ];

  for (const op of warehouseOperations) {
    await prisma.moduleOperation.upsert({
      where: {
        module_operation: {
          module: "inventory.warehouses",
          operation: op.operation,
        },
      },
      update: {
        label: op.label,
        isActive: true,
      },
      create: {
        module: "inventory.warehouses",
        operation: op.operation,
        label: op.label,
        isActive: true,
      },
    });
  }

  // Register ModuleOperation rows for master.items
  const ops = [
    { operation: "create", label: "Create", description: "Create items" },
    { operation: "view", label: "View", description: "View items" },
    { operation: "edit", label: "Edit", description: "Edit items" },
    { operation: "move-to-trash", label: "Move to Trash", description: "Move items to trash" },
    { operation: "delete-permanently", label: "Delete Permanently", description: "Delete items permanently" },
  ] as const;

  for (const op of ops) {
    await prisma.moduleOperation.upsert({
      where: { module_operation: { module: "master.items", operation: op.operation } },
      update: { label: op.label, description: op.description, isActive: true },
      create: {
        module: "master.items",
        operation: op.operation,
        label: op.label,
        description: op.description,
        isActive: true,
      },
    });
  }

  // Register ModuleOperation rows for inventory.stock
  const stockOperations = [
    { operation: "view", label: "View Stock" },
    { operation: "adjust", label: "Adjust Stock" },
  ];

  for (const op of stockOperations) {
    await prisma.moduleOperation.upsert({
      where: {
        module_operation: {
          module: "inventory.stock",
          operation: op.operation,
        },
      },
      update: {
        label: op.label,
        isActive: true,
      },
      create: {
        module: "inventory.stock",
        operation: op.operation,
        label: op.label,
        isActive: true,
      },
    });
  }

  // Seed Stock data
  console.log("\n🌱 Seeding inventory stock data...");
  
  // Get all active warehouses
  const activeWarehouses = await prisma.warehouse.findMany({
    where: { status: "active", isTrash: false },
    orderBy: { createdAt: "asc" },
  });

  // Get all items that track inventory
  const itemsWithInventory = await prisma.item.findMany({
    where: {
      trackInventory: true,
      status: "active",
      isTrash: false,
    },
    orderBy: { createdAt: "asc" },
  });

  if (activeWarehouses.length > 0 && itemsWithInventory.length > 0) {
    let stockCount = 0;
    let ledgerCount = 0;

    // Create stock entries for each item in each warehouse
    for (const item of itemsWithInventory) {
      for (const warehouse of activeWarehouses) {
        // Generate realistic stock quantities based on item type
        let quantity = 0;
        let reservedQuantity = 0;

        if (item.itemType === "RAW_MATERIAL") {
          // Raw materials: higher quantities (kg, liters, etc.)
          if (item.name.toLowerCase().includes("rice") || item.name.toLowerCase().includes("basmati")) {
            quantity = Math.floor(Math.random() * 500) + 200; // 200-700 kg
          } else if (item.name.toLowerCase().includes("chicken") || item.name.toLowerCase().includes("mutton") || item.name.toLowerCase().includes("beef")) {
            quantity = Math.floor(Math.random() * 100) + 50; // 50-150 kg
          } else if (item.name.toLowerCase().includes("spice") || item.name.toLowerCase().includes("masala")) {
            quantity = Math.floor(Math.random() * 50) + 20; // 20-70 kg
          } else if (item.name.toLowerCase().includes("oil") || item.name.toLowerCase().includes("ghee")) {
            quantity = Math.floor(Math.random() * 100) + 30; // 30-130 liters
          } else {
            quantity = Math.floor(Math.random() * 200) + 50; // 50-250 units
          }
        } else if (item.itemType === "FINISHED_GOOD") {
          // Finished goods: lower quantities (pieces)
          quantity = Math.floor(Math.random() * 50) + 10; // 10-60 pieces
          reservedQuantity = Math.floor(Math.random() * 10); // 0-10 reserved
        } else if (item.itemType === "RETAIL") {
          // Retail items: medium quantities (pieces)
          quantity = Math.floor(Math.random() * 200) + 50; // 50-250 pieces
        }

        // Create or update stock
        const stock = await prisma.stock.upsert({
          where: {
            itemId_warehouseId: {
              itemId: item.id,
              warehouseId: warehouse.id,
            },
          },
          update: {
            quantity: quantity,
            reservedQuantity: reservedQuantity,
            lastUpdated: new Date(),
          },
          create: {
            itemId: item.id,
            warehouseId: warehouse.id,
            quantity: quantity,
            reservedQuantity: reservedQuantity,
            lastUpdated: new Date(),
          },
        });

        stockCount++;

        // Create initial StockLedger entry for the stock
        await prisma.stockLedger.create({
          data: {
            itemId: item.id,
            warehouseId: warehouse.id,
            transactionType: "ADJUSTMENT",
            quantity: quantity,
            referenceType: "ADJUSTMENT",
            referenceId: stock.id,
            notes: `Initial stock seed - ${item.name} in ${warehouse.name}`,
            createdBy: admin.id,
          },
        });

        ledgerCount++;

        // Create some additional ledger entries for variety (simulating purchases)
        if (Math.random() > 0.7) { // 30% chance
          const purchaseQty = Math.floor(Math.random() * 100) + 20;
          await prisma.stockLedger.create({
            data: {
              itemId: item.id,
              warehouseId: warehouse.id,
              transactionType: "IN",
              quantity: purchaseQty,
              referenceType: "PURCHASE",
              referenceId: `seed-purchase-${stock.id}`,
              notes: `Simulated purchase receipt - ${item.name}`,
              createdBy: admin.id,
              createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date in last 7 days
            },
          });
          ledgerCount++;
        }
      }
    }

    console.log(`✅ Seeded ${stockCount} stock records`);
    console.log(`✅ Seeded ${ledgerCount} stock ledger entries`);
  } else {
    console.log("⚠️  Skipping stock seed: No warehouses or items with inventory tracking found");
  }

  console.log("\n✅ Seed complete.");
  console.log(`- Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

