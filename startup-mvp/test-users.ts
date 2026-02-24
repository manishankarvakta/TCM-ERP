import { prisma } from './lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, status: true, role: true }
  });
  console.log('All Users:');
  console.dir(users, { depth: null });
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
