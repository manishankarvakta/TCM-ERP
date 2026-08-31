import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const prefs = await prisma.settings.findMany({
    where: { code: 'app.preferences' }
  });

  console.log('App Preferences in DB:', JSON.stringify(prefs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
