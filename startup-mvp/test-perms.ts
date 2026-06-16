import { prisma } from './lib/prisma';
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const u of users) {
    const perms = await prisma.userPermission.findMany({ where: { userId: u.id, module: 'inventory.damage' } });
    if (perms.length) {
      console.log(u.email, perms[0].operations);
    }
  }
}
main();
