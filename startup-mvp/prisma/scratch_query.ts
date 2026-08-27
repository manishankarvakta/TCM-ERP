import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany();
  console.log("=== EMPLOYEE STATUSES ===");
  employees.forEach(e => {
    console.log(`- ${e.name} (ID: ${e.id}, Status: "${e.status}", UserID: "${e.userId}")`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
