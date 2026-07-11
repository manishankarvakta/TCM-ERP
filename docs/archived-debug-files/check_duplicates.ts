
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.groupBy({
    by: ['email'],
    _count: {
      email: true,
    },
    having: {
      email: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  console.log("Duplicate emails found:", users.length);

  for (const group of users) {
    console.log(`Email: ${group.email} Count: ${group._count.email}`);
    const duplicates = await prisma.user.findMany({
      where: { email: group.email },
      select: { id: true, name: true, createdAt: true, role: true }
    });
    console.log(JSON.stringify(duplicates, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
