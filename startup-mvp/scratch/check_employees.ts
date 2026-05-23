import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { status: "active" }
  });

  console.log(`Found ${employees.length} active employees.`);
  for (const emp of employees) {
    console.log(`- ${emp.name} (Salary: ${emp.salary || 'NOT SET'})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
