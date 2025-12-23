import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Users, Categories, and Units");
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
      createdBy: "cmj9sd9xq0000o1010acd1hsq",
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

    // Seed Categories
    console.log("\n📁 Seeding Categories...");
    const categories = [
      {
        id: "cmjalu72i00fzo001p2pmrebj",
        name: "Accessories",
        description: null,
        status: "active",
        createdAt: new Date("2025-12-17T22:50:17.034Z"),
        updatedAt: new Date("2025-12-17T22:50:17.034Z"),
      },
      {
        id: "cmjb4g9od000no001a4onyf2s",
        name: "Appliances",
        description: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:31:19.933Z"),
        updatedAt: new Date("2025-12-18T07:31:19.933Z"),
      },
      {
        id: "cmjdve7lc000co001nc7nemhf",
        name: "Fotile",
        description: null,
        status: "active",
        createdAt: new Date("2025-12-20T05:41:05.904Z"),
        updatedAt: new Date("2025-12-20T05:41:05.904Z"),
      },
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { id: category.id },
        update: {
          name: category.name,
          description: category.description,
          status: category.status,
          updatedAt: category.updatedAt,
        },
        create: category,
      });
      console.log(`✅ Upserted category: ${category.name}`);
    }

    // Seed Units
    console.log("\n📏 Seeding Units...");
    const units = [
      {
        id: "cmj9sdwix0006o101irp1g5yv",
        details: "Millimeter",
        symbol: "mm",
        status: "active",
        createdBy: "cmj9sd9xq0000o1010acd1hsq",
        createdAt: new Date("2025-12-17T09:05:48.009Z"),
        updatedAt: new Date("2025-12-17T18:56:21.262Z"),
      },
      {
        id: "cmj9se2bp000ao101xqyl20n4",
        details: "Feet",
        symbol: "ft",
        status: "active",
        createdBy: "cmj9sd9xq0000o1010acd1hsq",
        createdAt: new Date("2025-12-17T09:05:55.525Z"),
        updatedAt: new Date("2025-12-17T18:56:21.269Z"),
      },
      {
        id: "cmj9sfj0c000eo101ef5ktf85",
        details: "Meter",
        symbol: "m",
        status: "active",
        createdBy: "cmj9sd9xq0000o1010acd1hsq",
        createdAt: new Date("2025-12-17T09:07:03.804Z"),
        updatedAt: new Date("2025-12-17T18:56:21.255Z"),
      },
      {
        id: "cmjadhczi0001o08s5u47x58x",
        details: "Set",
        symbol: "set",
        status: "active",
        createdBy: "cmj9sd9xq0000o1010acd1hsq",
        createdAt: new Date("2025-12-17T18:56:21.246Z"),
        updatedAt: new Date("2025-12-17T18:56:21.246Z"),
      },
      {
        id: "cmjadhczn0003o08stvt3ixd0",
        details: "Piece",
        symbol: "pc",
        status: "active",
        createdBy: "cmj9sd9xq0000o1010acd1hsq",
        createdAt: new Date("2025-12-17T18:56:21.252Z"),
        updatedAt: new Date("2025-12-17T18:56:21.252Z"),
      },
      {
        id: "cmjadhczu0007o08slg6d0gyv",
        details: "Square Meter",
        symbol: "sm",
        status: "active",
        createdBy: "cmj9sd9xq0000o1010acd1hsq",
        createdAt: new Date("2025-12-17T18:56:21.259Z"),
        updatedAt: new Date("2025-12-17T18:56:21.259Z"),
      },
      {
        id: "cmjadhd01000bo08sbl1f0p48",
        details: "Square Millimeter",
        symbol: "smm",
        status: "active",
        createdBy: "cmj9sd9xq0000o1010acd1hsq",
        createdAt: new Date("2025-12-17T18:56:21.266Z"),
        updatedAt: new Date("2025-12-17T18:56:21.266Z"),
      },
      {
        id: "cmjadhd09000fo08s2wvkaekb",
        details: "Square Feet",
        symbol: "sft",
        status: "active",
        createdBy: "cmj9sd9xq0000o1010acd1hsq",
        createdAt: new Date("2025-12-17T18:56:21.273Z"),
        updatedAt: new Date("2025-12-17T18:56:21.273Z"),
      },
      {
        id: "cmjadhd0c000ho08sxw29b47e",
        details: "Running Feet",
        symbol: "rft",
        status: "active",
        createdBy: "cmj9sd9xq0000o1010acd1hsq",
        createdAt: new Date("2025-12-17T18:56:21.276Z"),
        updatedAt: new Date("2025-12-17T18:56:21.276Z"),
      },
      {
        id: "cmjadhd0g000jo08sb8twuy9z",
        details: "Inch",
        symbol: "in",
        status: "active",
        createdBy: "cmj9sd9xq0000o1010acd1hsq",
        createdAt: new Date("2025-12-17T18:56:21.280Z"),
        updatedAt: new Date("2025-12-17T18:56:21.280Z"),
      },
    ];

    for (const unit of units) {
      await prisma.unit.upsert({
        where: { symbol: unit.symbol },
        update: {
          details: unit.details,
          status: unit.status,
          updatedAt: unit.updatedAt,
        },
        create: unit,
      });
      console.log(`✅ Upserted unit: ${unit.symbol} - ${unit.details}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Users, Categories, and Units seeded!");
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

