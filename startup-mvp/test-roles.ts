import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const roles = await prisma.user.groupBy({ by: ['role'], _count: true });
  console.log("Roles:", roles);
}
main().catch(console.error).finally(() => prisma.$disconnect());
