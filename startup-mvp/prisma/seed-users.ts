import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding default admin user and organization...");

  // Hash admin password (using 12 rounds to match rest of codebase)
  const adminPassword = await bcrypt.hash("admin123", 12);

  // Create admin user
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
  console.log(`✅ Created/found admin: ${admin.email}`);

  // Create default organization
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
  console.log(`✅ Created/found organization: ${organization.name}`);

  console.log("✅ Done! Admin user and default organization ready.");
  console.log("📧 Login with: admin@example.com / admin123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

