const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loan = await prisma.employeeLoan.findUnique({ where: { id: "cmptz907i003vcklki3vkfl9v" } });
  console.log(loan ? "Found" : "Not Found");
}
main().catch(console.error).finally(() => prisma.$disconnect());
