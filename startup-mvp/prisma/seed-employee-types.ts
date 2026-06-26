import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 Seeding Dynamic Employee Types & Migrating Legacy Employees");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // 1. Find a creator user (preferably an admin)
    const user = await prisma.user.findFirst({
      where: {
        role: {
          in: ["ADMIN", "admin", "Admin"]
        }
      }
    }) || await prisma.user.findFirst();

    if (!user) {
      throw new Error("No users found in the database. Please seed or create a user first.");
    }

    console.log(`👤 Using user "${user.name || user.email}" (ID: ${user.id}) as creator.\n`);

    // 2. Define the hardcoded legacy types
    const legacyTypes = [
      { name: "Management", description: "Management level employee types" },
      { name: "Executive", description: "Executive level employee types" },
      { name: "Staff", description: "Regular staff members" },
      { name: "Manager", description: "Department/Team managers" },
      { name: "Sales Assistant", description: "Sales department assistants" }
    ];

    // 3. Process each employee type
    for (const typeInfo of legacyTypes) {
      let empType = await prisma.employeeType.findFirst({
        where: { name: typeInfo.name }
      });

      if (!empType) {
        empType = await prisma.employeeType.create({
          data: {
            name: typeInfo.name,
            description: typeInfo.description,
            status: "active",
            createdBy: user.id
          }
        });
        console.log(`➕ Created EmployeeType: "${empType.name}" (ID: ${empType.id})`);
      } else {
        console.log(`ℹ️  EmployeeType already exists: "${empType.name}" (ID: ${empType.id})`);
      }

      // 4. Update legacy employees matching this type name who do not have an employeeTypeId set
      const updated = await prisma.employee.updateMany({
        where: {
          type: typeInfo.name,
          employeeTypeId: null
        },
        data: {
          employeeTypeId: empType.id
        }
      });

      if (updated.count > 0) {
        console.log(`   └─ ✅ Linked ${updated.count} legacy employees to "${empType.name}"`);
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Seeding and legacy migration completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error("\n❌ ERROR: Seeding/migration failed!", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
