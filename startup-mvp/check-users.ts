import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ 
      where: { id: { in: ['cmj9sd9xq0000o1010acd1hsq', 'cmltca6we003on101dexoqfjb'] } },
      select: { id: true, name: true, email: true }
  });
  console.log(users);
}
main();
