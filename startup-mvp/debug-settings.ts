
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching accounting settings...");

  const settings = await prisma.settings.findMany({
    where: {
      code: "accounting.operationAccounts"
    },
    include: {
      user: {
        select: { email: true }
      }
    }
  });

  console.log(`Found ${settings.length} settings records.`);

  for (const setting of settings) {
    console.log("------------------------------------------------");
    console.log(`ID: ${setting.id}`);
    console.log(`User: ${setting.user?.email || "Global"}`);
    console.log(`IsGlobal: ${setting.isGlobal}`);
    console.log(`IsActive: ${setting.isActive}`);
    console.log("Settings JSON:");
    console.log(JSON.stringify(setting.settings, null, 2));
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
