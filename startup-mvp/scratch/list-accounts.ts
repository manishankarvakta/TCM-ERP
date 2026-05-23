import { prisma } from "../lib/prisma";

async function listAccounts() {
  const accounts = await prisma.chartOfAccount.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      status: true,
    },
    take: 20,
  });
  console.log("Accounts found in DB:", JSON.stringify(accounts, null, 2));
}

listAccounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
