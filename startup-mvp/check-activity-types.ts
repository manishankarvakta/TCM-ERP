import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const types = await prisma.activity.findMany({ select: { type: true, status: true }, distinct: ['type', 'status'] });
  console.log(types);
}
main();
