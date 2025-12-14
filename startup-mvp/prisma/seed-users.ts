import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding default users...");

  // Hash passwords
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("password123", 10);

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

  // Create regular user
  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      password: userPassword,
      name: "Regular User",
      role: "user",
      status: "active",
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Created/found user: ${user.email}`);

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      password: userPassword,
      name: "Test User",
      role: "user",
      status: "active",
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Created/found test user: ${testUser.email}`);

  console.log("✅ Done seeding users!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

