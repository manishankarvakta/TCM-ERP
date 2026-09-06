import { prisma } from "../lib/prisma";

async function main() {
  console.log("Testing employee fetch for appointment letters selection...");

  const employees = await prisma.employee.findMany({
    where: {
      appointmentLetters: {
        none: { isTrash: false }
      }
    },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      department: true,
      designation: true,
      status: true,
    },
    take: 10,
  });

  console.log(`✅ Successfully fetched ${employees.length} employees available for appointment letters:`);
  employees.forEach((emp) => {
    console.log(`  - [${emp.employeeCode || "NO_CODE"}] ${emp.name} (${emp.designation || "No Desig"}) - Status: '${emp.status}'`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
