import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 'cmltc8xg90038n101g771qq2x' }
  });
  console.log(user);
}
main();
