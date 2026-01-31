
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkSettings() {
  const settings = await prisma.settings.findMany({
    where: {
      code: "ACCOUNTING_OPERATIONS",
    },
  });

  console.log("Found settings:", JSON.stringify(settings, null, 2));
}

checkSettings()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
