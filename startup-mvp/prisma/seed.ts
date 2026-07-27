import { PrismaClient, ItemType, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedMembershipTiers } from "./seed-membership-tiers";

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
      name: "FashionFlow Garments Ltd",
      status: "active",
    },
    create: {
      id: "default-org",
      name: "FashionFlow Garments Ltd",
      details: "Premium garment manufacturing and export house",
      status: "active",
      createdBy: admin.id,
    },
  });

  const units = [
    { symbol: "kg", details: "Kilogram" },
    { symbol: "mtr", details: "Meter" },
    { symbol: "yd", details: "Yard" },
    { symbol: "roll", details: "Roll" },
    { symbol: "pcs", details: "Pieces" },
    { symbol: "pack", details: "Pack" },
    { symbol: "dz", details: "Dozen" },
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
    { name: "Raw Material", description: "All raw material types (Fabrics, trims, threads, labels)" },
    { name: "Product", description: "All finished product types (T-shirts, shirts, pants, jeans)" },
    { name: "Fabrics", description: "All types of fabrics (Cotton, Polyester, Denim)" },
    { name: "Trimmings & Accessories", description: "Buttons, Zippers, Thread, Labels" },
    { name: "Packaging Materials", description: "Poly bags, Cartons, Hangers" },
    { name: "Finished Goods - Tops", description: "T-shirts, Shirts, Sweaters" },
    { name: "Finished Goods - Bottoms", description: "Pants, Jeans, Shorts" },
    { name: "Fashion Accessories", description: "Caps, Belts, Socks" },
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

  const brands = [
    { name: "Ferrari Fashion", description: "In-house brand for clothing products" },
    { name: "Nike", description: "Premium sports brand apparel" },
    { name: "Adidas", description: "Premium sports and lifestyle brand" },
    { name: "Gucci", description: "Luxury fashion items" },
    { name: "Zara", description: "Fast fashion retail apparel" },
  ] as const;

  for (const b of brands) {
    const existing = await prisma.brand.findFirst({
      where: { name: b.name },
    });
    if (existing) {
      await prisma.brand.update({
        where: { id: existing.id },
        data: { description: b.description, status: "active" },
      });
    } else {
      await prisma.brand.create({
        data: { name: b.name, description: b.description, status: "active" },
      });
    }
  }

  const [kg, mtr, yd, roll, pcs, pack] = await Promise.all([
    prisma.unit.findUniqueOrThrow({ where: { symbol: "kg" } }),
    prisma.unit.findUniqueOrThrow({ where: { symbol: "mtr" } }),
    prisma.unit.findUniqueOrThrow({ where: { symbol: "yd" } }),
    prisma.unit.findUniqueOrThrow({ where: { symbol: "roll" } }),
    prisma.unit.findUniqueOrThrow({ where: { symbol: "pcs" } }),
    prisma.unit.findUniqueOrThrow({ where: { symbol: "pack" } }),
  ]);

  const [catFabric, catTrims, catPacking, catTops, catBottoms, catAccessories] = await Promise.all([
    prisma.category.findFirstOrThrow({ where: { name: "Fabrics" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Trimmings & Accessories" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Packaging Materials" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Finished Goods - Tops" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Finished Goods - Bottoms" } }),
    prisma.category.findFirstOrThrow({ where: { name: "Fashion Accessories" } }),
  ]);

  const year = new Date().getFullYear();
  const items = [
    // RAW MATERIALS - Fabrics
    {
      code: `RM-${year}-0001`,
      name: "Cotton Single Jersey Fabric",
      description: "100% Cotton, 160 GSM, White",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catFabric.id,
      unitId: kg.id,
      costPrice: tk(450),
      salesPrice: null,
      trackInventory: true,
      colors: ["White", "Black", "Navy"],
    },
    {
      code: `RM-${year}-0002`,
      name: "Polyester Interlock Fabric",
      description: "100% Polyester, 140 GSM",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catFabric.id,
      unitId: kg.id,
      costPrice: tk(350),
      salesPrice: null,
      trackInventory: true,
      colors: ["Royal Blue", "Red"],
    },
    {
      code: `RM-${year}-0003`,
      name: "Denim Fabric 12oz",
      description: "Indigo Blue Denim",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catFabric.id,
      unitId: yd.id,
      costPrice: tk(280),
      salesPrice: null,
      trackInventory: true,
    },
    // RAW MATERIALS - Trimmings & Accessories
    {
      code: `RM-${year}-0004`,
      name: "Sewing Thread 40/2",
      description: "Polyester Sewing Thread, 5000 Yards",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catTrims.id,
      unitId: roll.id,
      costPrice: tk(45),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0005`,
      name: "Plastic Button 18L",
      description: "4-Hole Shirt Button",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catTrims.id,
      unitId: pcs.id,
      costPrice: tk(0.5),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0006`,
      name: "YKK Nylon Zipper 15cm",
      description: "Closed-end Nylon Zipper",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catTrims.id,
      unitId: pcs.id,
      costPrice: tk(15),
      salesPrice: null,
      trackInventory: true,
    },
    {
      code: `RM-${year}-0007`,
      name: "Woven Main Label",
      description: "Brand Main Label",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catTrims.id,
      unitId: pcs.id,
      costPrice: tk(2.5),
      salesPrice: null,
      trackInventory: true,
    },
    // RAW MATERIALS - Packaging
    {
      code: `RM-${year}-0008`,
      name: "LDPE Poly Bag",
      description: "10x12 inch Transparent Poly Bag",
      itemType: "RAW_MATERIAL" as ItemType,
      categoryId: catPacking.id,
      unitId: pcs.id,
      costPrice: tk(1.2),
      salesPrice: null,
      trackInventory: true,
    },
    // FINISHED GOODS - Tops
    {
      code: `FG-${year}-0001`,
      name: "Basic Crew Neck T-shirt",
      description: "100% Cotton, Premium Quality",
      itemType: "READY_PRODUCT" as ItemType,
      categoryId: catTops.id,
      unitId: pcs.id,
      costPrice: tk(120),
      salesPrice: tk(350),
      trackInventory: true,
      sizes: ["S", "M", "L", "XL"],
      colors: ["White", "Black", "Grey"],
    },
    {
      code: `FG-${year}-0002`,
      name: "Polo Shirt - Solid",
      description: "Cotton Pique Fabric",
      itemType: "READY_PRODUCT" as ItemType,
      categoryId: catTops.id,
      unitId: pcs.id,
      costPrice: tk(250),
      salesPrice: tk(650),
      trackInventory: true,
      sizes: ["M", "L", "XL"],
      colors: ["Navy", "Royal Blue"],
    },
    // FINISHED GOODS - Bottoms
    {
      code: `FG-${year}-0003`,
      name: "Slim Fit Denim Jeans",
      description: "Classic 5-pocket Denim",
      itemType: "READY_PRODUCT" as ItemType,
      categoryId: catBottoms.id,
      unitId: pcs.id,
      costPrice: tk(450),
      salesPrice: tk(1200),
      trackInventory: true,
      sizes: ["30", "32", "34", "36"],
      colors: ["Indigo Blue"],
    },
    // RETAIL - Accessories
    {
      code: `RT-${year}-0001`,
      name: "Cotton Baseball Cap",
      description: "Adjustable Strap Back",
      itemType: "RETAIL" as ItemType,
      categoryId: catAccessories.id,
      unitId: pcs.id,
      costPrice: tk(80),
      salesPrice: tk(250),
      trackInventory: true,
    },
    {
      code: `RT-${year}-0002`,
      name: "Ankle Socks (3-Pack)",
      description: "Combed Cotton Socks",
      itemType: "RETAIL" as ItemType,
      categoryId: catAccessories.id,
      unitId: pack.id,
      costPrice: tk(120),
      salesPrice: tk(300),
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
      name: "Fabric Store",
      address: "123 Industrial Area",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
      status: "active",
    },
    {
      code: "WH-2026-0002",
      name: "Trims & Accessories Store",
      address: "123 Industrial Area",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
      status: "active",
    },
    {
      code: "WH-2026-0003",
      name: "Production Floor",
      address: "456 Production Street",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
      status: "active",
    },
    {
      code: "WH-2026-0004",
      name: "Finished Goods Store",
      address: "789 Commercial Road",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "Bangladesh",
      status: "active",
    },
    {
      code: "WH-2026-0005",
      name: "Packaging Store",
      address: "321 Packing Lane",
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

  // Seed Walkway Customer (default POS customer)
  console.log("\n🌱 Seeding Walkway Customer...");
  
  // If WALK-001 or WHL-001 is already taken by some other customer, let's update their clientCode to something unique first
  const conflictWalkway = await prisma.client.findFirst({
    where: { clientCode: "WALK-001", email: { not: "walkway@system.local" } }
  });
  if (conflictWalkway) {
    await prisma.client.update({
      where: { id: conflictWalkway.id },
      data: { clientCode: `CLI-CONFL-${Date.now().toString().slice(-4)}` }
    });
  }

  const conflictWholesale = await prisma.client.findFirst({
    where: { clientCode: "WHL-001", email: { not: "wholesale@fashionbulk.com" } }
  });
  if (conflictWholesale) {
    await prisma.client.update({
      where: { id: conflictWholesale.id },
      data: { clientCode: `CLI-CONFL-${Date.now().toString().slice(-4)}` }
    });
  }

  const walkwayCustomer = await prisma.client.upsert({
    where: { email: "walkway@system.local" },
    update: {
      name: "Walkway Customer",
      clientType: "walkway",
      status: "active",
      clientCode: "WALK-001",
    },
    create: {
      name: "Walkway Customer",
      email: "walkway@system.local",
      clientType: "walkway",
      clientCode: "WALK-001",
      status: "active",
      createdBy: admin.id,
    },
  });
  console.log(`✅ Seeded Walkway Customer: ${walkwayCustomer.id}`);

  // Seed sample wholesale client
  await prisma.client.upsert({
    where: { email: "wholesale@fashionbulk.com" },
    update: {
      name: "Fashion Bulk Trading",
      clientType: "wholesale",
      company: "Fashion Bulk Trading Ltd",
      status: "active",
      clientCode: "WHL-001",
    },
    create: {
      name: "Fashion Bulk Trading",
      email: "wholesale@fashionbulk.com",
      clientType: "wholesale",
      company: "Fashion Bulk Trading Ltd",
      clientCode: "WHL-001",
      status: "active",
      createdBy: admin.id,
    },
  });
  console.log("✅ Seeded sample wholesale client");

  // Seed Wholesale Items
  console.log("\n🌱 Seeding Wholesale items...");
  const wholesaleItems = [
    {
      code: `WS-${year}-0001`,
      name: "Basic T-Shirt Bulk Pack",
      description: "100% Cotton, Wholesale Bulk - Min 12pcs",
      itemType: "WHOLESALE" as ItemType,
      categoryId: catTops.id,
      unitId: pcs.id,
      costPrice: tk(80),
      salesPrice: tk(200),
      wholesalePrice: tk(150),
      trackInventory: true,
      sizes: ["S", "M", "L", "XL"],
      colors: ["White", "Black"],
    },
    {
      code: `WS-${year}-0002`,
      name: "Polo Shirt Wholesale",
      description: "Cotton Pique, Wholesale Pack",
      itemType: "WHOLESALE" as ItemType,
      categoryId: catTops.id,
      unitId: pcs.id,
      costPrice: tk(200),
      salesPrice: tk(500),
      wholesalePrice: tk(380),
      trackInventory: true,
      sizes: ["M", "L", "XL"],
      colors: ["Navy", "White"],
    },
    {
      code: `WS-${year}-0003`,
      name: "Denim Jeans Wholesale",
      description: "Slim Fit Denim, Wholesale Pricing",
      itemType: "WHOLESALE" as ItemType,
      categoryId: catBottoms.id,
      unitId: pcs.id,
      costPrice: tk(350),
      salesPrice: tk(900),
      wholesalePrice: tk(700),
      trackInventory: true,
      sizes: ["30", "32", "34", "36"],
      colors: ["Indigo Blue"],
    },
    {
      code: `WS-${year}-0004`,
      name: "Cotton Socks Wholesale (6-Pack)",
      description: "Combed Cotton, Wholesale 6-pack",
      itemType: "WHOLESALE" as ItemType,
      categoryId: catAccessories.id,
      unitId: pack.id,
      costPrice: tk(200),
      salesPrice: tk(500),
      wholesalePrice: tk(380),
      trackInventory: true,
    },
  ];

  for (const it of wholesaleItems) {
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
        wholesalePrice: it.wholesalePrice,
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
        wholesalePrice: it.wholesalePrice,
        trackInventory: it.trackInventory,
        status: "active",
        isTrash: false,
        createdBy: admin.id,
      },
    });
  }
  console.log(`✅ Seeded ${wholesaleItems.length} wholesale items`);

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

  // Register ModuleOperation rows for master.categories
  const categoryOps = [
    { operation: "create", label: "Create", description: "Create categories" },
    { operation: "view", label: "View", description: "View categories" },
    { operation: "edit", label: "Edit", description: "Edit categories" },
    { operation: "move-to-trash", label: "Move to Trash", description: "Move categories to trash" },
    { operation: "delete-permanently", label: "Delete Permanently", description: "Delete categories permanently" },
  ] as const;

  for (const op of categoryOps) {
    await prisma.moduleOperation.upsert({
      where: { module_operation: { module: "master.categories", operation: op.operation } },
      update: { label: op.label, description: op.description, isActive: true },
      create: {
        module: "master.categories",
        operation: op.operation,
        label: op.label,
        description: op.description,
        isActive: true,
      },
    });
  }

  // Register ModuleOperation rows for master.brands
  const brandOps = [
    { operation: "create", label: "Create", description: "Create brands" },
    { operation: "view", label: "View", description: "View brands" },
    { operation: "edit", label: "Edit", description: "Edit brands" },
    { operation: "move-to-trash", label: "Move to Trash", description: "Move brands to trash" },
    { operation: "delete-permanently", label: "Delete Permanently", description: "Delete brands permanently" },
  ] as const;

  for (const op of brandOps) {
    await prisma.moduleOperation.upsert({
      where: { module_operation: { module: "master.brands", operation: op.operation } },
      update: { label: op.label, description: op.description, isActive: true },
      create: {
        module: "master.brands",
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

  // Register ModuleOperation rows for inventory.count
  const countOperationsList = [
    { module: "inventory.count.scanner", operation: "view_scanner", label: "View Count Scanner Page" },
    { module: "inventory.count.scanner", operation: "create", label: "Submit Scan Entries" },
    { module: "inventory.count.entries", operation: "view_entries", label: "View All Count Entries Page" },
    { module: "inventory.count.entries", operation: "delete", label: "Delete Scanned Entries" },
    { module: "inventory.count.adjustment", operation: "view_adjustment", label: "View Auto Adjustment Page" },
    { module: "inventory.count.adjustment", operation: "approve", label: "Generate Auto Adjustment" },
  ];

  for (const op of countOperationsList) {
    await prisma.moduleOperation.upsert({
      where: {
        module_operation: {
          module: op.module,
          operation: op.operation,
        },
      },
      update: {
        label: op.label,
        isActive: true,
      },
      create: {
        module: op.module,
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

  // Register ModuleOperation rows for peoples modules (suppliers, clients, employees)
  const peoplesModulesOps = [
    {
      module: "peoples.suppliers",
      ops: [
        { operation: "create", label: "Create Supplier", description: "Create suppliers" },
        { operation: "view", label: "View Suppliers", description: "View suppliers list & details" },
        { operation: "edit", label: "Edit Supplier", description: "Edit supplier details" },
        { operation: "move-to-trash", label: "Move Supplier to Trash", description: "Soft delete supplier" },
        { operation: "delete-permanently", label: "Delete Supplier Permanently", description: "Permanently remove supplier" },
        { operation: "ledger", label: "View Ledger", description: "View supplier ledger statement" },
      ],
    },
    {
      module: "peoples.clients",
      ops: [
        { operation: "create", label: "Create Client", description: "Create clients" },
        { operation: "view", label: "View Clients", description: "View clients list & details" },
        { operation: "edit", label: "Edit Client", description: "Edit client details" },
        { operation: "move-to-trash", label: "Move Client to Trash", description: "Soft delete client" },
        { operation: "delete-permanently", label: "Delete Client Permanently", description: "Permanently remove client" },
        { operation: "ledger", label: "View Ledger", description: "View client ledger statement" },
      ],
    },
    {
      module: "peoples.employees",
      ops: [
        { operation: "create", label: "Create Employee", description: "Create employees" },
        { operation: "view", label: "View Employees", description: "View employees list & details" },
        { operation: "edit", label: "Edit Employee", description: "Edit employee details" },
        { operation: "move-to-trash", label: "Move Employee to Trash", description: "Soft delete employee" },
        { operation: "delete-permanently", label: "Delete Employee Permanently", description: "Permanently remove employee" },
        { operation: "ledger", label: "View Ledger", description: "View employee ledger statement" },
      ],
    },
  ];

  for (const modItem of peoplesModulesOps) {
    for (const op of modItem.ops) {
      await prisma.moduleOperation.upsert({
        where: {
          module_operation: {
            module: modItem.module,
            operation: op.operation,
          },
        },
        update: {
          label: op.label,
          description: op.description,
          isActive: true,
        },
        create: {
          module: modItem.module,
          operation: op.operation,
          label: op.label,
          description: op.description,
          isActive: true,
        },
      });
    }
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
          // Raw materials: higher quantities (kg, meters, etc.)
          if (item.name.toLowerCase().includes("fabric") || item.name.toLowerCase().includes("denim")) {
            quantity = Math.floor(Math.random() * 500) + 200; // 200-700 meters
          } else if (item.name.toLowerCase().includes("thread") || item.name.toLowerCase().includes("zipper") || item.name.toLowerCase().includes("button")) {
            quantity = Math.floor(Math.random() * 100) + 50; // 50-150 units
          } else if (item.name.toLowerCase().includes("label") || item.name.toLowerCase().includes("trim")) {
            quantity = Math.floor(Math.random() * 50) + 20; // 20-70 units
          } else if (item.name.toLowerCase().includes("chemical") || item.name.toLowerCase().includes("dye")) {
            quantity = Math.floor(Math.random() * 100) + 30; // 30-130 units
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

  // Delete all existing BOM and BOMItem records
  console.log("\n🗑️  Deleting existing BOM data...");
  try {
    const deletedBOMItems = await prisma.bOMItem.deleteMany({});
    const deletedBOMs = await prisma.bOM.deleteMany({});
    console.log(`✅ Deleted ${deletedBOMs.count} BOMs and ${deletedBOMItems.count} BOM items`);
  } catch (err) {
    console.log("⚠️ Could not delete some BOM data due to constraints, skipping deletion step.");
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

      // Create BOM
      const bomCode = `BOM-${new Date().getFullYear()}-${String(bomCount + 1).padStart(4, "0")}`;
      const bom = await prisma.bOM.create({
        data: {
          code: bomCode,
          name: `${fg.name} Specification`,
          description: `Bill of Materials for ${fg.name}`,
          itemId: fg.id,
          quantityPerUnit: 1.0, // Quantity of FG produced (1 piece)
          status: "active",
          isTrash: false,
          createdBy: admin.id,
        },
      });
      bomCount++;

      // Add raw materials based on garment type
      const bomItems: Array<{ itemId: string; quantityRequired: string }> = [];

      if (fg.name.includes("T-shirt")) {
        const fabric = findRawMaterial("Jersey");
        const thread = findRawMaterial("Thread");
        const label = findRawMaterial("Label");
        const poly = findRawMaterial("Poly Bag");

        if (fabric) bomItems.push({ itemId: fabric.id, quantityRequired: tk(0.25) }); // 250g fabric per shirt
        if (thread) bomItems.push({ itemId: thread.id, quantityRequired: tk(0.01) }); // 0.01 roll per shirt
        if (label) bomItems.push({ itemId: label.id, quantityRequired: tk(1) });
        if (poly) bomItems.push({ itemId: poly.id, quantityRequired: tk(1) });
      } else if (fg.name.includes("Polo")) {
        const fabric = findRawMaterial("Interlock") || findRawMaterial("Jersey");
        const thread = findRawMaterial("Thread");
        const button = findRawMaterial("Button");
        const label = findRawMaterial("Label");

        if (fabric) bomItems.push({ itemId: fabric.id, quantityRequired: tk(0.35) }); // 350g fabric per polo
        if (thread) bomItems.push({ itemId: thread.id, quantityRequired: tk(0.015) });
        if (button) bomItems.push({ itemId: button.id, quantityRequired: tk(3) });
        if (label) bomItems.push({ itemId: label.id, quantityRequired: tk(1) });
      } else if (fg.name.includes("Jeans")) {
        const fabric = findRawMaterial("Denim");
        const zipper = findRawMaterial("Zipper");
        const button = findRawMaterial("Button");
        const thread = findRawMaterial("Thread");

        if (fabric) bomItems.push({ itemId: fabric.id, quantityRequired: tk(1.2) }); // 1.2 yards per jeans
        if (zipper) bomItems.push({ itemId: zipper.id, quantityRequired: tk(1) });
        if (button) bomItems.push({ itemId: button.id, quantityRequired: tk(1) });
        if (thread) bomItems.push({ itemId: thread.id, quantityRequired: tk(0.05) });
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
  try {
    const deletedPurchaseItems = await prisma.purchaseItem.deleteMany({});
    const deletedPurchases = await prisma.purchase.deleteMany({});
    console.log(`✅ Deleted ${deletedPurchases.count} purchases and ${deletedPurchaseItems.count} purchase items`);
  } catch (err) {
    console.log("⚠️ Could not delete some purchase data due to constraints, skipping deletion step.");
  }

  // Seed Purchase data
  console.log("\n🌱 Seeding purchase data...");

  // Get or create suppliers for garments house
  const suppliers = [
    {
      name: "Global Textiles Ltd",
      email: "info@globaltextiles.com",
      phone: "+8801712345678",
      company: "Global Textiles Ltd",
      address: "Industrial Zone, Gazipur",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1700",
      country: "Bangladesh",
    },
    {
      name: "Fast Trims & Accessories",
      email: "sales@fasttrims.com",
      phone: "+8801712345679",
      company: "Fast Trims & Accessories",
      address: "Plot 45, EPZ Road",
      city: "Chittagong",
      state: "Chittagong",
      zip: "4223",
      country: "Bangladesh",
    },
    {
      name: "YKK Zipper Middle East",
      email: "order@ykk-me.com",
      phone: "+8801712345680",
      company: "YKK Zipper Middle East",
      address: "Free Zone Area",
      city: "Dubai",
      state: "Dubai",
      zip: "0000",
      country: "UAE",
    },
    {
      name: "Eco-Friendly Packing Ltd",
      email: "contact@ecopacking.com",
      phone: "+8801712345681",
      company: "Eco-Friendly Packing Ltd",
      address: "321 Green Lane",
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
      // Fabric purchase
      {
        supplier: seededSuppliers[0], // Global Textiles
        warehouse: warehousesForPurchase[0], // Fabric Store
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: "RECEIVED" as const,
        items: [
          { item: findItem("Cotton Single Jersey"), quantity: 500, unitPrice: 450 },
          { item: findItem("Polyester Interlock"), quantity: 300, unitPrice: 350 },
        ],
      },
      // Trims purchase
      {
        supplier: seededSuppliers[1], // Fast Trims
        warehouse: warehousesForPurchase[1], // Trims & Accessories Store
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: "RECEIVED" as const,
        items: [
          { item: findItem("Thread"), quantity: 100, unitPrice: 45 },
          { item: findItem("Plastic Button"), quantity: 5000, unitPrice: 0.5 },
        ],
      },
      // Zipper purchase
      {
        supplier: seededSuppliers[2], // YKK
        warehouse: warehousesForPurchase[1], // Trims Store
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: "RECEIVED" as const,
        items: [
          { item: findItem("Zipper"), quantity: 1000, unitPrice: 15 },
        ],
      },
      // Packing purchase
      {
        supplier: seededSuppliers[3], // Eco-Friendly Packing
        warehouse: warehousesForPurchase[4] || warehousesForPurchase[0], // Packaging Store or fallback
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: "RECEIVED" as const,
        items: [
          { item: findItem("Poly Bag"), quantity: 2000, unitPrice: 1.2 },
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

  // Delete all existing Sale and SaleItem records
  console.log("\n🗑️  Deleting existing sales data...");
  try {
    const deletedSaleItems = await prisma.saleItem.deleteMany({});
    const deletedSales = await prisma.sale.deleteMany({});
    console.log(`✅ Deleted ${deletedSales.count} sales and ${deletedSaleItems.count} sale items`);
  } catch (err) {
    console.log("⚠️ Could not delete some sales data due to constraints, skipping deletion step.");
  }

  // Seed Sales data
  console.log("\n🌱 Seeding sales data...");

  // Get or create clients for garments house
  const clients = [
    {
      name: "ZARA Global Sourcing",
      email: "sourcing@zara.com",
      phone: "+34123456789",
      company: "Inditex Group",
      address: "A Coruña",
      city: "Arteixo",
      state: "Galicia",
      zip: "15142",
      country: "Spain",
    },
    {
      name: "H&M Production Office",
      email: "bd.office@hm.com",
      phone: "+8801711111112",
      company: "Hennes & Mauritz",
      address: "Banani",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1213",
      country: "Bangladesh",
    },
    {
      name: "Local Boutique Shop",
      email: "local@boutique.com",
      phone: "+8801711111113",
      company: "Elegant Fashion",
      address: "Gulshan 1",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1212",
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
      // Completed sale - ZARA Bulk order
      {
        client: seededClients[0], // ZARA
        warehouse: warehousesForSale[3] || warehousesForSale[0], // Finished Goods Store
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: "COMPLETED" as const,
        items: [
          { item: findFGItem("Crew Neck T-shirt"), quantity: 1000, unitPrice: 350 },
          { item: findFGItem("Polo Shirt"), quantity: 500, unitPrice: 650 },
        ],
      },
      // Completed sale - H&M Order
      {
        client: seededClients[1], // H&M
        warehouse: warehousesForSale[3] || warehousesForSale[0], // FG Store
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: "COMPLETED" as const,
        items: [
          { item: findFGItem("Denim Jeans"), quantity: 800, unitPrice: 1200 },
        ],
      },
      // Retail sale - Local Boutique
      {
        client: seededClients[2], // Local Boutique
        warehouse: warehousesForSale[3] || warehousesForSale[0], // FG Store
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: "COMPLETED" as const,
        items: [
          { item: findRetailItem("Baseball Cap"), quantity: 50, unitPrice: 250 },
          { item: findRetailItem("Socks"), quantity: 100, unitPrice: 300 },
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

  await seedMembershipTiers();

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

