import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const payrolls = await prisma.payroll.findMany({
    where: { isTrash: false },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  if (payrolls.length === 0) {
    console.log("No payrolls found in the database.");
    return;
  }

  for (const p of payrolls) {
    console.log(`Payroll: ${p.payrollNumber} (${p.month}/${p.year}) - ${p.status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
