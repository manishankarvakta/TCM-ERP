
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const duplicates = await prisma.user.findMany({
    where: { email: 'admin@example.com' },
    orderBy: { createdAt: 'asc' }
  });

  if (duplicates.length < 2) {
    console.log("No duplicates found.");
    return;
  }

  const userToRenamed = duplicates[0]; // Specific older user
  console.log(`Renaming email for user ${userToRenamed.id} (${userToRenamed.email}) to admin+old@example.com`);

  await prisma.user.update({
    where: { id: userToRenamed.id },
    data: { email: `admin+old+${Date.now()}@example.com` }
  });
  
  console.log("Renamed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
