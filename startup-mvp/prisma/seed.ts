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
      console.log(`✅ Created/Updated unit: ${createdUnit.symbol} - ${createdUnit.details}`);
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

