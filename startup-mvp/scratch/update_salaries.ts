import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.employee.updateMany({
    where: { 
      status: "active",
      salary: null
    },
    data: {
      salary: 50000
    }
  });

  console.log(`Updated salaries for ${result.count} employees.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
