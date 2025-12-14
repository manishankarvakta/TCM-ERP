import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Admin User & Organization");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Hash admin password (using 12 rounds to match rest of codebase)
    console.log("🔐 Hashing admin password...");
    const adminPassword = await bcrypt.hash("admin123", 12);

    // Create admin user
    console.log("👤 Creating/updating admin user...");
    const admin = await prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        email: "admin@example.com",
        password: adminPassword,
        name: "Admin User",
        role: "admin",
        status: "active",
        emailVerified: new Date(),
      },
    });
    console.log(`✅ Admin user ready: ${admin.email} (ID: ${admin.id})`);

    // Create default organization
    console.log("🏢 Creating/updating default organization...");
    const organization = await prisma.organization.upsert({
      where: { id: "default-org" },
      update: {},
      create: {
        id: "default-org",
        name: "Default Organization",
        details: "Default organization for quotations",
        status: "active",
        createdBy: admin.id,
      },
    });
    console.log(`✅ Organization ready: ${organization.name} (ID: ${organization.id})`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Seeding completed!");
    console.log("📧 Login credentials: admin@example.com / admin123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ CRITICAL ERROR: User seeding failed!");
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

