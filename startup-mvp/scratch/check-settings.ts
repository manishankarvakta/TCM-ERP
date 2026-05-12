import { prisma } from "../lib/prisma";
import { ACCOUNTING_OPERATIONS_KEY } from "../types/accounting-settings";

async function checkSettings() {
  const settings = await prisma.settings.findMany({
    where: {
      code: ACCOUNTING_OPERATIONS_KEY,
    },
  });
  console.log("Settings found in DB:", JSON.stringify(settings, null, 2));
}

checkSettings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
