import { prisma } from "../lib/prisma";

async function listAllAccounts() {
  const accounts = await prisma.chartOfAccount.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
    },
    where: {
      OR: [
        { name: { contains: "Inventory", mode: "insensitive" } },
        { name: { contains: "Payable", mode: "insensitive" } },
        { name: { contains: "Sales", mode: "insensitive" } },
        { name: { contains: "Revenue", mode: "insensitive" } },
        { name: { contains: "WIP", mode: "insensitive" } },
        { name: { contains: "Product", mode: "insensitive" } },
      ]
    }
  });
  console.log("Filtered Accounts:", JSON.stringify(accounts, null, 2));
}

listAllAccounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
