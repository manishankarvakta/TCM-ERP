import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Users");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Seed Users
    console.log("\n👤 Seeding Users...");
    const users = [
      {
        id: "cmj9sd9xq0000o1010acd1hsq",
        name: "Admin User",
        email: "admin@example.com",
        emailVerified: new Date("2025-12-17T09:05:18.733Z"),
        password: "$2b$12$c.vyi5n7QaMCPy4L5yauveKrwXQYMfV2hEuGmMXCtz2OGRAE1qJfy",
        image: "https://dev.espaciobd.com/api/files/cmj9sd9xq0000o1010acd1hsq/1.jpg",
        role: "admin",
        status: "active",
        createdAt: new Date("2025-12-17T09:05:18.734Z"),
        updatedAt: new Date("2025-12-17T12:37:58.554Z"),
      },
      {
        id: "cmjaf1zyl000so001apq1aznq",
        name: "Mahidul Anik",
        email: "anik@techsoulbd.com",
        emailVerified: null,
        password: "$2b$12$0NUPAwHbqvS8UqDYehPn4eoPxW1l0gYsVH3Ea/by2gxtFAzL63ssO",
        image: null,
        role: "admin",
        status: "active",
        createdAt: new Date("2025-12-17T19:40:23.757Z"),
        updatedAt: new Date("2025-12-17T19:40:23.757Z"),
      },
      {
        id: "cmjb4b49o000ao001hm29q5o6",
        name: "Rakib",
        email: "rakib@techsoulbd.com",
        emailVerified: null,
        password: "$2b$12$HbdbeqKVvNAcwNGDfaqjDuHfZ4zem57aQaLOTK8KThvoEBXeZJdeC",
        image: null,
        role: "admin",
        status: "active",
        createdAt: new Date("2025-12-18T07:27:19.645Z"),
        updatedAt: new Date("2025-12-18T07:27:19.645Z"),
      },
    ];

    for (const user of users) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          emailVerified: user.emailVerified,
          password: user.password,
          image: user.image,
          role: user.role,
          status: user.status,
          updatedAt: user.updatedAt,
        },
        create: user,
      });
      console.log(`✅ Upserted user: ${user.email}`);
    }

    // Seed Organization
    console.log("\n🏢 Seeding Organization...");
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
    if (!adminUser) {
      throw new Error("Admin user not found after seeding");
    }

    const organization = {
      id: "default-org",
      name: "My Organization",
      details: "Default organization",
      address: null,
      phone: null,
      email: null,
      website: null,
      logo: null,
      status: "active",
      createdBy: adminUser.id,
      createdAt: new Date("2025-12-17T09:05:18.738Z"),
      updatedAt: new Date("2025-12-17T09:05:18.738Z"),
    };

    await prisma.organization.upsert({
      where: { id: organization.id },
      update: {
        name: organization.name,
        details: organization.details,
        status: organization.status,
        updatedAt: organization.updatedAt,
      },
      create: organization,
    });
    console.log(`✅ Upserted organization: ${organization.name}`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Users and Organization seeded!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: Seeding failed!");
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

