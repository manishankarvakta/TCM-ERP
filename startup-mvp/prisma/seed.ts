import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Create sample users with hashed passwords
  const users = [
    {
      name: "Admin User",
      email: "admin@example.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
    },
    {
      name: "John Doe",
      email: "john@example.com",
      password: await bcrypt.hash("password123", 10),
      role: "user",
    },
    {
      name: "Jane Smith",
      email: "jane@example.com",
      password: await bcrypt.hash("password123", 10),
      role: "user",
    },
  ];

  // Create or update users
  let adminUser: { id: string } | null = null;
  for (const user of users) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
      },
    });
    console.log(`✅ Created/Updated user: ${createdUser.email}`);

    // Store admin user for creating units
    if (createdUser.role === "admin") {
      adminUser = { id: createdUser.id };
    }

    // Create some user logs for each user
    const logActions = ["LOGIN", "LOGOUT", "PROFILE_UPDATE", "SETTINGS_CHANGE"];
    
    for (let i = 0; i < 5; i++) {
      const action = logActions[Math.floor(Math.random() * logActions.length)];
      await prisma.userLog.create({
        data: {
          userId: createdUser.id,
          action,
          details: `${action} action performed`,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
    }
  }

  // Create sample units
  if (adminUser) {
    const units = [
      // Basic weight units
      { symbol: "kg", details: "Kilogram" },
      { symbol: "g", details: "Gram" },
      { symbol: "mg", details: "Milligram" },
      { symbol: "lb", details: "Pound" },
      { symbol: "oz", details: "Ounce" },
      
      // Basic length units
      { symbol: "m", details: "Meter" },
      { symbol: "cm", details: "Centimeter" },
      { symbol: "mm", details: "Millimeter" },
      { symbol: "km", details: "Kilometer" },
      { symbol: "ft", details: "Foot" },
      { symbol: "in", details: "Inch" },
      { symbol: "yd", details: "Yard" },
      
      // Area units (interior industry)
      { symbol: "sqm", details: "Square Meter" },
      { symbol: "sqft", details: "Square Foot" },
      { symbol: "sqin", details: "Square Inch" },
      { symbol: "sqyd", details: "Square Yard" },
      
      // Volume units
      { symbol: "L", details: "Liter" },
      { symbol: "mL", details: "Milliliter" },
      { symbol: "gal", details: "Gallon" },
      { symbol: "qt", details: "Quart" },
      { symbol: "pt", details: "Pint" },
      { symbol: "fl oz", details: "Fluid Ounce" },
      { symbol: "cu m", details: "Cubic Meter" },
      { symbol: "cu ft", details: "Cubic Foot" },
      
      // Linear measurements (interior industry)
      { symbol: "lm", details: "Linear Meter" },
      { symbol: "lf", details: "Linear Foot" },
      { symbol: "rm", details: "Running Meter" },
      { symbol: "rf", details: "Running Foot" },
      
      // Interior industry specific units
      { symbol: "roll", details: "Roll" },
      { symbol: "sheet", details: "Sheet" },
      { symbol: "panel", details: "Panel" },
      { symbol: "tile", details: "Tile" },
      { symbol: "board", details: "Board" },
      { symbol: "bf", details: "Board Foot" },
      { symbol: "sq", details: "Square" },
      { symbol: "bundle", details: "Bundle" },
      { symbol: "carton", details: "Carton" },
      { symbol: "case", details: "Case" },
      
      // Count/Quantity units
      { symbol: "pcs", details: "Pieces" },
      { symbol: "box", details: "Box" },
      { symbol: "pack", details: "Pack" },
      { symbol: "set", details: "Set" },
      { symbol: "pair", details: "Pair" },
      { symbol: "dozen", details: "Dozen" },
      { symbol: "lot", details: "Lot" },
      { symbol: "unit", details: "Unit" },
    ];

    const unitMap = new Map<string, string>();
    for (const unit of units) {
      const createdUnit = await prisma.unit.upsert({
        where: { 
          symbol: unit.symbol,
        },
        update: {},
        create: {
          symbol: unit.symbol,
          details: unit.details,
          status: "active",
          createdBy: adminUser.id,
        },
      });
      unitMap.set(unit.symbol, createdUnit.id);
      console.log(`✅ Created/Updated unit: ${createdUnit.symbol} - ${createdUnit.details}`);
    }

    // Create sample categories
    const categories = [
      { name: "Furniture", description: "Furniture items including sofas, tables, chairs, and other furniture pieces", status: "active" },
      { name: "Flooring", description: "Flooring materials including hardwood, tiles, carpet, and vinyl", status: "active" },
      { name: "Paint", description: "Paint and finishes including interior, exterior, primer, and varnish", status: "active" },
      { name: "Lighting", description: "Lighting fixtures including ceiling lights, chandeliers, and LED strips", status: "active" },
      { name: "Wall Coverings", description: "Wall coverings including wallpaper, wall panels, and decorative molding", status: "active" },
      { name: "Hardware", description: "Hardware and accessories including door handles, hinges, and screws", status: "active" },
      { name: "Fabrics", description: "Fabrics and textiles including curtain fabric, upholstery, and cushion covers", status: "active" },
      { name: "Bathroom", description: "Bathroom fixtures and accessories including tiles, glass panels, and mirrors", status: "active" },
      { name: "Kitchen", description: "Kitchen fixtures and accessories including cabinets, countertops, and faucets", status: "active" },
      { name: "Windows", description: "Windows and window treatments including curtains, blinds, and window frames", status: "active" },
      { name: "Doors", description: "Doors and door accessories including interior doors, exterior doors, and door frames", status: "active" },
      { name: "Ceiling", description: "Ceiling materials and treatments including ceiling tiles, panels, and decorative elements", status: "active" },
      { name: "Accessories", description: "Decorative accessories and home decor items", status: "active" },
      { name: "Outdoor", description: "Outdoor furniture and accessories", status: "inactive" },
    ];

    for (const category of categories) {
      try {
        const existingCategory = await prisma.category.findFirst({
          where: { name: category.name },
        });

        if (existingCategory) {
          await prisma.category.update({
            where: { id: existingCategory.id },
            data: {
              description: category.description,
              status: category.status,
            },
          });
          console.log(`✅ Updated category: ${category.name} (${category.status})`);
        } else {
          await prisma.category.create({
            data: {
              name: category.name,
              description: category.description,
              status: category.status,
            },
          });
          console.log(`✅ Created category: ${category.name} (${category.status})`);
        }
      } catch (error) {
        console.error(`❌ Failed to create/update category ${category.name}:`, error);
      }
    }

    // Create sample items
    const items = [
      // Furniture Items
      { code: "FURN-001", description: "Modern Sofa Set 3-Seater", unitId: unitMap.get("pcs")!, unitPrice: 1250.00, category: "Furniture", status: "active" },
      { code: "FURN-002", description: "Dining Table 6-Seater", unitId: unitMap.get("pcs")!, unitPrice: 850.00, category: "Furniture", status: "active" },
      { code: "FURN-003", description: "Office Chair Ergonomic", unitId: unitMap.get("pcs")!, unitPrice: 320.00, category: "Furniture", status: "active" },
      { code: "FURN-004", description: "Coffee Table Glass Top", unitId: unitMap.get("pcs")!, unitPrice: 450.00, category: "Furniture", status: "active" },
      
      // Flooring Items
      { code: "FLR-001", description: "Hardwood Flooring Oak", unitId: unitMap.get("sqft")!, unitPrice: 12.50, category: "Flooring", status: "active" },
      { code: "FLR-002", description: "Ceramic Tile 12x12", unitId: unitMap.get("sqft")!, unitPrice: 8.75, category: "Flooring", status: "active" },
      { code: "FLR-003", description: "Carpet Premium", unitId: unitMap.get("sqyd")!, unitPrice: 35.00, category: "Flooring", status: "active" },
      { code: "FLR-004", description: "Vinyl Plank Flooring", unitId: unitMap.get("sqft")!, unitPrice: 6.25, category: "Flooring", status: "inactive" },
      
      // Paint & Finishes
      { code: "PNT-001", description: "Interior Paint Premium White", unitId: unitMap.get("gal")!, unitPrice: 45.00, category: "Paint", status: "active" },
      { code: "PNT-002", description: "Exterior Paint Weatherproof", unitId: unitMap.get("gal")!, unitPrice: 52.00, category: "Paint", status: "active" },
      { code: "PNT-003", description: "Primer Base Coat", unitId: unitMap.get("gal")!, unitPrice: 28.00, category: "Paint", status: "active" },
      { code: "PNT-004", description: "Varnish Clear Gloss", unitId: unitMap.get("qt")!, unitPrice: 18.50, category: "Paint", status: "active" },
      
      // Lighting
      { code: "LGT-001", description: "LED Ceiling Light 12W", unitId: unitMap.get("pcs")!, unitPrice: 25.00, category: "Lighting", status: "active" },
      { code: "LGT-002", description: "Chandelier 6-Light", unitId: unitMap.get("pcs")!, unitPrice: 350.00, category: "Lighting", status: "active" },
      { code: "LGT-003", description: "Track Lighting Kit", unitId: unitMap.get("set")!, unitPrice: 125.00, category: "Lighting", status: "active" },
      { code: "LGT-004", description: "LED Strip Light 5m", unitId: unitMap.get("roll")!, unitPrice: 45.00, category: "Lighting", status: "inactive" },
      
      // Wall Coverings
      { code: "WAL-001", description: "Wallpaper Premium Pattern", unitId: unitMap.get("roll")!, unitPrice: 65.00, category: "Wall Coverings", status: "active" },
      { code: "WAL-002", description: "Wall Panel MDF", unitId: unitMap.get("sqft")!, unitPrice: 15.00, category: "Wall Coverings", status: "active" },
      { code: "WAL-003", description: "Decorative Molding", unitId: unitMap.get("lf")!, unitPrice: 8.50, category: "Wall Coverings", status: "active" },
      
      // Hardware & Accessories
      { code: "HRD-001", description: "Door Handle Set Chrome", unitId: unitMap.get("set")!, unitPrice: 35.00, category: "Hardware", status: "active" },
      { code: "HRD-002", description: "Cabinet Hinge Soft Close", unitId: unitMap.get("pair")!, unitPrice: 12.00, category: "Hardware", status: "active" },
      { code: "HRD-003", description: "Drawer Slide 18 inch", unitId: unitMap.get("pair")!, unitPrice: 22.00, category: "Hardware", status: "active" },
      { code: "HRD-004", description: "Screws Assorted Pack", unitId: unitMap.get("box")!, unitPrice: 15.00, category: "Hardware", status: "active" },
      
      // Fabrics & Textiles
      { code: "FAB-001", description: "Curtain Fabric Premium", unitId: unitMap.get("yd")!, unitPrice: 28.00, category: "Fabrics", status: "active" },
      { code: "FAB-002", description: "Upholstery Fabric", unitId: unitMap.get("yd")!, unitPrice: 35.00, category: "Fabrics", status: "active" },
      { code: "FAB-003", description: "Cushion Cover Set", unitId: unitMap.get("set")!, unitPrice: 45.00, category: "Fabrics", status: "active" },
      
      // Bathroom
      { code: "BTH-001", description: "Bathroom Tile 8x8", unitId: unitMap.get("sqft")!, unitPrice: 9.50, category: "Bathroom", status: "active" },
      { code: "BTH-002", description: "Shower Glass Panel", unitId: unitMap.get("sqft")!, unitPrice: 85.00, category: "Bathroom", status: "active" },
      { code: "BTH-003", description: "Vanity Mirror", unitId: unitMap.get("pcs")!, unitPrice: 125.00, category: "Bathroom", status: "active" },
      
      // Kitchen
      { code: "KIT-001", description: "Kitchen Cabinet Base", unitId: unitMap.get("lf")!, unitPrice: 150.00, category: "Kitchen", status: "active" },
      { code: "KIT-002", description: "Countertop Granite", unitId: unitMap.get("sqft")!, unitPrice: 75.00, category: "Kitchen", status: "active" },
      { code: "KIT-003", description: "Kitchen Faucet Chrome", unitId: unitMap.get("pcs")!, unitPrice: 180.00, category: "Kitchen", status: "active" },
    ];

    for (const item of items) {
      try {
        const createdItem = await prisma.item.upsert({
          where: { 
            code: item.code,
          },
          update: {
            status: item.status, // Update status if item exists
          },
          create: {
            code: item.code,
            description: item.description,
            unitId: item.unitId,
            unitPrice: item.unitPrice,
            category: item.category,
            status: item.status,
          },
        });
        console.log(`✅ Created/Updated item: ${createdItem.code} - ${createdItem.description} (${item.status})`);
      } catch (error) {
        console.error(`❌ Failed to create item ${item.code}:`, error);
      }
    }
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

