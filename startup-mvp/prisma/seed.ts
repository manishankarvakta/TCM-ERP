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
  for (const user of users) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
      },
    });
    console.log(`✅ Created/Updated user: ${createdUser.email}`);

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

