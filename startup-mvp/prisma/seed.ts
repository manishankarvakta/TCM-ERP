import { PrismaClient, ItemType, Prisma } from "@prisma/client";
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

  // Check if admin user exists
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true },
  });

  if (!admin) {
    // Create admin user if doesn't exist
    admin = await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        password: adminPasswordHash,
        role: "admin",
        status: "active",
      },
      select: { id: true, email: true },
    });
  } else {
    // Update existing admin user
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: {
        name: "Admin",
        password: adminPasswordHash,
        role: "admin",
        status: "active",
      },
      select: { id: true, email: true },
    });
  }


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
      itemType: "READY_PRODUCT" as ItemType,
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
      itemType: "READY_PRODUCT" as ItemType,
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
      itemType: "READY_PRODUCT" as ItemType,
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
      itemType: "READY_PRODUCT" as ItemType,
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
      itemType: "READY_PRODUCT" as ItemType,
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
      itemType: "READY_PRODUCT" as ItemType,
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
      itemType: "READY_PRODUCT" as ItemType,
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
      itemType: "READY_PRODUCT" as ItemType,
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

  // Register ModuleOperation rows for production.boms
  const bomOperations = [
    { operation: "create", label: "Create BOM" },
    { operation: "view", label: "View BOM" },
    { operation: "edit", label: "Edit BOM" },
    { operation: "move-to-trash", label: "Move BOM to Trash" },
    { operation: "delete-permanently", label: "Delete BOM Permanently" },
  ];

  for (const op of bomOperations) {
    await prisma.moduleOperation.upsert({
      where: {
        module_operation: {
          module: "production.boms",
          operation: op.operation,
        },
      },
      update: {
        label: op.label,
        isActive: true,
      },
      create: {
        module: "production.boms",
        operation: op.operation,
        label: op.label,
        isActive: true,
      },
    });
  }

  // Register ModuleOperation rows for production.orders
  const productionOrderOperations = [
    { operation: "view", label: "View Production Orders" },
    { operation: "create", label: "Create Production Order" },
    { operation: "edit", label: "Edit Production Order" },
    { operation: "start", label: "Start Production Order" },
    { operation: "complete", label: "Complete Production Order" },
    { operation: "cancel", label: "Cancel Production Order" },
  ];

  for (const op of productionOrderOperations) {
    await prisma.moduleOperation.upsert({
      where: {
        module_operation: {
          module: "production.orders",
          operation: op.operation,
        },
      },
      update: {
        label: op.label,
        isActive: true,
      },
      create: {
        module: "production.orders",
        operation: op.operation,
        label: op.label,
        isActive: true,
      },
    });
  }

  // Register ModuleOperation rows for sales.sales
  const saleOperations = [
    { operation: "view", label: "View Sales" },
    { operation: "create", label: "Create Sale" },
    { operation: "edit", label: "Edit Sale" },
    { operation: "approve", label: "Complete Sale" },
    { operation: "move-to-trash", label: "Move Sale to Trash" },
    { operation: "delete-permanently", label: "Delete Sale Permanently" },
  ];

  for (const op of saleOperations) {
    await prisma.moduleOperation.upsert({
      where: {
        module_operation: {
          module: "sales.sales",
          operation: op.operation,
        },
      },
      update: {
        label: op.label,
        isActive: true,
      },
      create: {
        module: "sales.sales",
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
        } else if (item.itemType === "READY_PRODUCT") {
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

  // Seed BOM data
  console.log("\n🌱 Seeding BOM data...");
  
  // Get finished goods (biryani dishes)
  const finishedGoods = await prisma.item.findMany({
    where: {
      itemType: ItemType.READY_PRODUCT,
      status: "active",
      isTrash: false,
    },
    orderBy: { name: "asc" },
  });

  // Get raw materials
  const rawMaterials = await prisma.item.findMany({
    where: {
      itemType: ItemType.RAW_MATERIAL,
      status: "active",
      isTrash: false,
    },
    orderBy: { name: "asc" },
  });

  if (finishedGoods.length > 0 && rawMaterials.length > 0) {
    let bomCount = 0;
    let bomItemCount = 0;

    // Helper to find raw material by name
    const findRawMaterial = (name: string) => {
      return rawMaterials.find((rm) => rm.name.toLowerCase().includes(name.toLowerCase()));
    };

    // Create BOMs for each finished good
    for (const fg of finishedGoods) {
      // Skip if BOM already exists
      const existingBOM = await prisma.bOM.findFirst({
        where: { itemId: fg.id, isTrash: false },
      });
      if (existingBOM) continue;

      // Determine quantity per unit based on portion size
      const quantityPerUnit = fg.name.includes("Half") ? 0.5 : 1.0;

      // Create BOM
      const bomCode = `BOM-${new Date().getFullYear()}-${String(bomCount + 1).padStart(4, "0")}`;
      const bom = await prisma.bOM.create({
        data: {
          code: bomCode,
          name: `${fg.name} Recipe`,
          description: `Bill of Materials for ${fg.name}`,
          itemId: fg.id,
          quantityPerUnit: quantityPerUnit,
          status: "active",
          isTrash: false,
          createdBy: admin.id,
        },
      });
      bomCount++;

      // Add raw materials based on biryani type
      const bomItems: Array<{ itemId: string; quantityRequired: string }> = [];

      // Common ingredients for all biryani
      const rice = findRawMaterial("basmati") || findRawMaterial("rice");
      const onion = findRawMaterial("onion");
      const ghee = findRawMaterial("ghee");
      const biryaniMasala = findRawMaterial("biryani masala");
      const salt = findRawMaterial("salt");
      const turmeric = findRawMaterial("turmeric");
      const redChili = findRawMaterial("red chili");
      const ginger = findRawMaterial("ginger");
      const garlic = findRawMaterial("garlic");
      const yogurt = findRawMaterial("yogurt");
      const mint = findRawMaterial("mint");
      const coriander = findRawMaterial("coriander");

      // Rice (main ingredient)
      if (rice) {
        bomItems.push({ itemId: rice.id, quantityRequired: tk(0.15) }); // 150g per portion
      }

      // Meat (varies by biryani type)
      if (fg.name.includes("Chicken")) {
        const chicken = findRawMaterial("chicken");
        if (chicken) {
          bomItems.push({ itemId: chicken.id, quantityRequired: tk(0.2) }); // 200g per portion
        }
      } else if (fg.name.includes("Mutton")) {
        const mutton = findRawMaterial("mutton");
        if (mutton) {
          bomItems.push({ itemId: mutton.id, quantityRequired: tk(0.15) }); // 150g per portion
        }
      } else if (fg.name.includes("Beef")) {
        const beef = findRawMaterial("beef");
        if (beef) {
          bomItems.push({ itemId: beef.id, quantityRequired: tk(0.15) }); // 150g per portion
        }
      } else if (fg.name.includes("Special")) {
        // Special biryani uses more meat
        const chicken = findRawMaterial("chicken");
        const mutton = findRawMaterial("mutton");
        if (chicken) {
          bomItems.push({ itemId: chicken.id, quantityRequired: tk(0.15) });
        }
        if (mutton) {
          bomItems.push({ itemId: mutton.id, quantityRequired: tk(0.1) });
        }
      }

      // Spices and seasonings
      if (biryaniMasala) {
        bomItems.push({ itemId: biryaniMasala.id, quantityRequired: tk(0.01) }); // 10g
      }
      if (salt) {
        bomItems.push({ itemId: salt.id, quantityRequired: tk(0.005) }); // 5g
      }
      if (turmeric) {
        bomItems.push({ itemId: turmeric.id, quantityRequired: tk(0.003) }); // 3g
      }
      if (redChili) {
        bomItems.push({ itemId: redChili.id, quantityRequired: tk(0.002) }); // 2g
      }
      if (ginger) {
        bomItems.push({ itemId: ginger.id, quantityRequired: tk(0.01) }); // 10g
      }
      if (garlic) {
        bomItems.push({ itemId: garlic.id, quantityRequired: tk(0.01) }); // 10g
      }

      // Cooking ingredients
      if (ghee) {
        bomItems.push({ itemId: ghee.id, quantityRequired: tk(0.02) }); // 20g
      }
      if (onion) {
        bomItems.push({ itemId: onion.id, quantityRequired: tk(0.05) }); // 50g
      }
      if (yogurt) {
        bomItems.push({ itemId: yogurt.id, quantityRequired: tk(0.03) }); // 30g
      }
      if (mint) {
        bomItems.push({ itemId: mint.id, quantityRequired: tk(0.005) }); // 5g
      }
      if (coriander) {
        bomItems.push({ itemId: coriander.id, quantityRequired: tk(0.005) }); // 5g
      }

      // Create BOM items
      for (const bomItem of bomItems) {
        await prisma.bOMItem.create({
          data: {
            bomId: bom.id,
            itemId: bomItem.itemId,
            quantityRequired: bomItem.quantityRequired,
          },
        });
        bomItemCount++;
      }
    }

  console.log(`✅ Seeded ${bomCount} BOM records`);
  console.log(`✅ Seeded ${bomItemCount} BOM item records`);
  } else {
    console.log("⚠️  Skipping BOM seed: No finished goods or raw materials found");
  }

  // Delete all existing Purchase and PurchaseItem records
  console.log("\n🗑️  Deleting existing purchase data...");
  const deletedPurchaseItems = await prisma.purchaseItem.deleteMany({});
  const deletedPurchases = await prisma.purchase.deleteMany({});
  console.log(`✅ Deleted ${deletedPurchases.count} purchases and ${deletedPurchaseItems.count} purchase items`);

  // Seed Purchase data
  console.log("\n🌱 Seeding purchase data...");

  // Get or create suppliers for biryani house
  const suppliers = [
    {
      name: "Premium Rice Suppliers Ltd",
      email: "rice@supplier.com",
      phone: "+8801712345678",
      company: "Premium Rice Suppliers Ltd",
      address: "123 Grain Market",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
    },
    {
      name: "Fresh Meat & Poultry Co",
      email: "meat@supplier.com",
      phone: "+8801712345679",
      company: "Fresh Meat & Poultry Co",
      address: "456 Meat Market",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
    },
    {
      name: "Spice Traders International",
      email: "spices@supplier.com",
      phone: "+8801712345680",
      company: "Spice Traders International",
      address: "789 Spice Bazaar",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
    },
    {
      name: "Dairy & Fats Distributors",
      email: "dairy@supplier.com",
      phone: "+8801712345681",
      company: "Dairy & Fats Distributors",
      address: "321 Dairy Lane",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
    },
    {
      name: "Fresh Vegetables Market",
      email: "vegetables@supplier.com",
      phone: "+8801712345682",
      company: "Fresh Vegetables Market",
      address: "654 Veg Street",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
    },
  ];

  const seededSuppliers = [];
  for (const s of suppliers) {
    const supplier = await prisma.supplier.upsert({
      where: { email: s.email },
      update: {
        name: s.name,
        phone: s.phone,
        company: s.company,
        address: s.address,
        city: s.city,
        state: s.state,
        zip: s.zip,
        country: s.country,
        status: "active",
      },
      create: {
        name: s.name,
        email: s.email,
        phone: s.phone,
        company: s.company,
        address: s.address,
        city: s.city,
        state: s.state,
        zip: s.zip,
        country: s.country,
        status: "active",
        createdBy: admin.id,
      },
    });
    seededSuppliers.push(supplier);
  }

  // Get active warehouses for purchases
  const warehousesForPurchase = await prisma.warehouse.findMany({
    where: { status: "active", isTrash: false },
    orderBy: { createdAt: "asc" },
  });

  // Get raw material items
  const rawMaterialItems = await prisma.item.findMany({
    where: {
      itemType: "RAW_MATERIAL",
      status: "active",
      isTrash: false,
    },
    orderBy: { name: "asc" },
  });

  if (seededSuppliers.length > 0 && warehousesForPurchase.length > 0 && rawMaterialItems.length > 0) {
    let purchaseCount = 0;
    let purchaseItemCount = 0;

    // Helper to find item by name pattern
    const findItem = (pattern: string) => {
      return rawMaterialItems.find((item) =>
        item.name.toLowerCase().includes(pattern.toLowerCase())
      );
    };

    // Helper to generate purchase number
    const generatePurchaseNumber = (index: number) => {
      const year = new Date().getFullYear();
      return `PUR${year}${String(index).padStart(6, "0")}`;
    };

    // Create purchase orders
    const purchaseOrders = [
      // Rice purchase
      {
        supplier: seededSuppliers[0], // Premium Rice Suppliers
        warehouse: warehousesForPurchase[0], // Main Warehouse
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        status: "RECEIVED" as const,
        items: [
          { item: findItem("basmati"), quantity: 500, unitPrice: 120 },
          { item: findItem("kali jeera"), quantity: 300, unitPrice: 95 },
        ],
      },
      // Meat purchase
      {
        supplier: seededSuppliers[1], // Fresh Meat & Poultry
        warehouse: warehousesForPurchase[1], // Kitchen Warehouse
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: "RECEIVED" as const,
        items: [
          { item: findItem("chicken"), quantity: 100, unitPrice: 180 },
          { item: findItem("mutton"), quantity: 50, unitPrice: 650 },
          { item: findItem("beef"), quantity: 40, unitPrice: 550 },
        ],
      },
      // Spices purchase
      {
        supplier: seededSuppliers[2], // Spice Traders
        warehouse: warehousesForPurchase[4] || warehousesForPurchase[0], // Spice Storage or fallback
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: "RECEIVED" as const,
        items: [
          { item: findItem("garam masala"), quantity: 50, unitPrice: 1.5 },
          { item: findItem("biryani masala"), quantity: 30, unitPrice: 2.0 },
          { item: findItem("turmeric"), quantity: 25, unitPrice: 0.8 },
          { item: findItem("red chili"), quantity: 20, unitPrice: 1.2 },
          { item: findItem("cumin"), quantity: 15, unitPrice: 1.0 },
          { item: findItem("cardamom"), quantity: 10, unitPrice: 3.5 },
          { item: findItem("cinnamon"), quantity: 12, unitPrice: 2.5 },
          { item: findItem("bay leaves"), quantity: 8, unitPrice: 1.8 },
        ],
      },
      // Dairy purchase
      {
        supplier: seededSuppliers[3], // Dairy & Fats
        warehouse: warehousesForPurchase[3] || warehousesForPurchase[0], // Cold Storage or fallback
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: "RECEIVED" as const,
        items: [
          { item: findItem("ghee"), quantity: 50, unitPrice: 850 },
          { item: findItem("yogurt"), quantity: 100, unitPrice: 80 },
        ],
      },
      // Vegetables purchase
      {
        supplier: seededSuppliers[4], // Fresh Vegetables
        warehouse: warehousesForPurchase[1] || warehousesForPurchase[0], // Kitchen Warehouse or fallback
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: "RECEIVED" as const,
        items: [
          { item: findItem("onion"), quantity: 200, unitPrice: 45 },
          { item: findItem("tomato"), quantity: 150, unitPrice: 60 },
          { item: findItem("ginger"), quantity: 20, unitPrice: 200 },
          { item: findItem("garlic"), quantity: 15, unitPrice: 150 },
          { item: findItem("green chili"), quantity: 10, unitPrice: 120 },
        ],
      },
      // Large rice purchase (partially received)
      {
        supplier: seededSuppliers[0], // Premium Rice Suppliers
        warehouse: warehousesForPurchase[0], // Main Warehouse
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        status: "PARTIALLY_RECEIVED" as const,
        items: [
          { item: findItem("basmati"), quantity: 1000, unitPrice: 118 },
        ],
      },
      // Approved purchase (not yet received)
      {
        supplier: seededSuppliers[1], // Fresh Meat & Poultry
        warehouse: warehousesForPurchase[1] || warehousesForPurchase[0], // Kitchen Warehouse or fallback
        date: new Date(), // Today
        status: "APPROVED" as const,
        items: [
          { item: findItem("chicken"), quantity: 150, unitPrice: 175 },
          { item: findItem("mutton"), quantity: 60, unitPrice: 640 },
        ],
      },
      // Draft purchase
      {
        supplier: seededSuppliers[2], // Spice Traders
        warehouse: warehousesForPurchase[4] || warehousesForPurchase[0], // Spice Storage or fallback
        date: new Date(), // Today
        status: "DRAFT" as const,
        items: [
          { item: findItem("biryani masala"), quantity: 50, unitPrice: 2.0 },
          { item: findItem("garam masala"), quantity: 40, unitPrice: 1.5 },
        ],
      },
    ];

    for (const po of purchaseOrders) {
      // Filter out null items
      const validItems = po.items.filter((item) => item.item !== undefined);
      if (validItems.length === 0) continue;

      // Calculate totals
      const subTotal = validItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const discountRaw = Math.random() > 0.7 ? subTotal * 0.05 : 0; // 30% chance of 5% discount
      const discount = Math.min(discountRaw, 999.99); // Cap at Decimal(5,2) max
      const taxRaw = (subTotal - discount) * 0.15; // 15% VAT
      const tax = Math.min(taxRaw, 999.99); // Cap at Decimal(5,2) max
      const grandTotal = subTotal - discount + tax;

      // Create purchase
      const purchase = await prisma.purchase.create({
        data: {
          purchaseNumber: generatePurchaseNumber(purchaseCount + 1),
          supplierId: po.supplier.id,
          warehouseId: po.warehouse.id,
          date: po.date,
          status: po.status,
          notes: `Purchase order for ${po.supplier.name}`,
          subTotal: new Prisma.Decimal(subTotal.toFixed(2)),
          discount: discount > 0 ? new Prisma.Decimal(discount.toFixed(2)) : null,
          tax: new Prisma.Decimal(tax.toFixed(2)),
          grandTotal: new Prisma.Decimal(grandTotal.toFixed(2)),
          createdBy: admin.id,
          items: {
            create: validItems.map((item) => ({
              itemId: item.item!.id,
              description: item.item!.name,
              quantity: new Prisma.Decimal(item.quantity.toFixed(2)),
              unitPrice: new Prisma.Decimal(item.unitPrice.toFixed(2)),
              amount: new Prisma.Decimal((item.quantity * item.unitPrice).toFixed(2)),
            })),
          },
        },
      });

      purchaseCount++;
      purchaseItemCount += validItems.length;
    }

    console.log(`✅ Seeded ${purchaseCount} purchase records`);
    console.log(`✅ Seeded ${purchaseItemCount} purchase item records`);
  } else {
    console.log("⚠️  Skipping purchase seed: No suppliers, warehouses, or raw materials found");
  }

  // Seed Sales data
  console.log("\n🌱 Seeding sales data...");

  // Get or create clients for biryani house
  const clients = [
    {
      name: "Rahman Restaurant",
      email: "rahman@restaurant.com",
      phone: "+8801711111111",
      company: "Rahman Restaurant",
      address: "123 Food Street",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
    },
    {
      name: "Karim Catering Services",
      email: "karim@catering.com",
      phone: "+8801711111112",
      company: "Karim Catering Services",
      address: "456 Event Avenue",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
    },
    {
      name: "Walk-in Customer",
      email: "walkin@customer.com",
      phone: "+8801711111113",
      company: null,
      address: "N/A",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
    },
  ];

  const seededClients = [];
  for (const c of clients) {
    const client = await prisma.client.upsert({
      where: { email: c.email },
      update: {
        name: c.name,
        phone: c.phone,
        company: c.company,
        address: c.address,
        city: c.city,
        state: c.state,
        zip: c.zip,
        country: c.country,
        status: "active",
      },
      create: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        address: c.address,
        city: c.city,
        state: c.state,
        zip: c.zip,
        country: c.country,
        status: "active",
        createdBy: admin.id,
      },
    });
    seededClients.push(client);
  }

  // Get active warehouses for sales
  const warehousesForSale = await prisma.warehouse.findMany({
    where: { status: "active", isTrash: false },
    orderBy: { createdAt: "asc" },
  });

  // Get finished goods and retail items for sales
  const finishedGoodsForSale = await prisma.item.findMany({
    where: {
      itemType: ItemType.READY_PRODUCT,
      status: "active",
      isTrash: false,
    },
    orderBy: { name: "asc" },
  });

  const retailItemsForSale = await prisma.item.findMany({
    where: {
      itemType: ItemType.RETAIL,
      status: "active",
      isTrash: false,
    },
    orderBy: { name: "asc" },
  });

  if (seededClients.length > 0 && warehousesForSale.length > 0 && (finishedGoodsForSale.length > 0 || retailItemsForSale.length > 0)) {
    let saleCount = 0;
    let saleItemCount = 0;

    // Helper to generate sale number
    const generateSaleNumber = (index: number) => {
      const year = new Date().getFullYear();
      return `SAL-${year}-${String(index).padStart(4, "0")}`;
    };

    // Helper to find item by name pattern
    const findFGItem = (pattern: string) => {
      return finishedGoodsForSale.find((item) =>
        item.name.toLowerCase().includes(pattern.toLowerCase())
      );
    };

    const findRetailItem = (pattern: string) => {
      return retailItemsForSale.find((item) =>
        item.name.toLowerCase().includes(pattern.toLowerCase())
      );
    };


    // Create sales orders
    const salesOrders = [
      // Completed sale - Restaurant order
      {
        client: seededClients[0], // Rahman Restaurant
        warehouse: warehousesForSale[0], // Main Warehouse
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: "COMPLETED" as const,
        items: [
          { item: findFGItem("chicken biryani half"), quantity: 10, unitPrice: 180 },
          { item: findFGItem("chicken biryani full"), quantity: 5, unitPrice: 320 },
          { item: findRetailItem("coca cola"), quantity: 15, unitPrice: 40 },
          { item: findRetailItem("lassi"), quantity: 10, unitPrice: 50 },
        ],
      },
      // Completed sale - Catering order
      {
        client: seededClients[1], // Karim Catering
        warehouse: warehousesForSale[0], // Main Warehouse
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: "COMPLETED" as const,
        items: [
          { item: findFGItem("mutton biryani full"), quantity: 20, unitPrice: 800 },
          { item: findFGItem("special biryani full"), quantity: 10, unitPrice: 900 },
          { item: findRetailItem("salad"), quantity: 30, unitPrice: 25 },
          { item: findRetailItem("raita"), quantity: 30, unitPrice: 30 },
        ],
      },
      // Completed sale - Walk-in customer
      {
        client: seededClients[2], // Walk-in Customer
        warehouse: warehousesForSale[0], // Main Warehouse
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: "COMPLETED" as const,
        items: [
          { item: findFGItem("beef biryani half"), quantity: 2, unitPrice: 380 },
          { item: findRetailItem("pepsi"), quantity: 2, unitPrice: 40 },
          { item: findRetailItem("mineral water"), quantity: 2, unitPrice: 20 },
        ],
      },
      // Draft sale - Pending order
      {
        client: seededClients[0], // Rahman Restaurant
        warehouse: warehousesForSale[0], // Main Warehouse
        date: new Date(), // Today
        status: "DRAFT" as const,
        items: [
          { item: findFGItem("chicken biryani half"), quantity: 15, unitPrice: 180 },
          { item: findFGItem("mutton biryani half"), quantity: 8, unitPrice: 450 },
          { item: findRetailItem("coca cola"), quantity: 20, unitPrice: 40 },
        ],
      },
      // Another completed sale
      {
        client: seededClients[1], // Karim Catering
        warehouse: warehousesForSale[0], // Main Warehouse
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        status: "COMPLETED" as const,
        items: [
          { item: findFGItem("special biryani half"), quantity: 12, unitPrice: 500 },
          { item: findFGItem("beef biryani full"), quantity: 6, unitPrice: 650 },
          { item: findRetailItem("7up"), quantity: 18, unitPrice: 40 },
          { item: findRetailItem("pickle"), quantity: 10, unitPrice: 15 },
        ],
      },
    ];

    for (const so of salesOrders) {
      // Filter out null items
      const validItems = so.items.filter((item) => item.item !== undefined);
      if (validItems.length === 0) continue;

      // Calculate totals
      const subTotal = validItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const discountRaw = Math.random() > 0.8 ? subTotal * 0.05 : 0; // 20% chance of 5% discount
      const discount = Math.min(discountRaw, 999.99); // Cap at Decimal(5,2) max
      const taxRaw = (subTotal - discount) * 0.15; // 15% VAT
      const tax = Math.min(taxRaw, 999.99); // Cap at Decimal(5,2) max
      const grandTotal = subTotal - discount + tax;

      // Create sale
      const sale = await prisma.sale.create({
        data: {
          saleNumber: generateSaleNumber(saleCount + 1),
          clientId: so.client.id,
          warehouseId: so.warehouse.id,
          date: so.date,
          status: so.status,
          notes: so.status === "COMPLETED" ? `Sale to ${so.client.name}` : `Draft order for ${so.client.name}`,
          subTotal: new Prisma.Decimal(subTotal.toFixed(2)),
          discount: discount > 0 ? new Prisma.Decimal(discount.toFixed(2)) : null,
          tax: new Prisma.Decimal(tax.toFixed(2)),
          grandTotal: new Prisma.Decimal(grandTotal.toFixed(2)),
          completedAt: so.status === "COMPLETED" ? so.date : null,
          createdBy: admin.id,
          items: {
            create: validItems.map((item) => ({
              itemId: item.item!.id,
              description: item.item!.name,
              quantity: new Prisma.Decimal(item.quantity.toFixed(2)),
              unitPrice: new Prisma.Decimal(item.unitPrice.toFixed(2)),
              amount: new Prisma.Decimal((item.quantity * item.unitPrice).toFixed(2)),
            })),
          },
        },
      });

      saleCount++;
      saleItemCount += validItems.length;
    }

    console.log(`✅ Seeded ${saleCount} sale records`);
    console.log(`✅ Seeded ${saleItemCount} sale item records`);
  } else {
    console.log("⚠️  Skipping sales seed: No clients, warehouses, or sellable items found");
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

