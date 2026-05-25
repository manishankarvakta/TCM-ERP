import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const sessions = await prisma.session.findMany({
    include: {
      User: true
    }
  });
  console.log('Sessions count:', sessions.length);
  for (const s of sessions) {
    console.log(`Session: ${s.id}, User: ${s.User?.name} (${s.User?.email}), Expires: ${s.expires}`);
  }
}
main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
