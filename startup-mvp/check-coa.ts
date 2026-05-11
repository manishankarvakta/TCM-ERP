import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.chartOfAccount.count();
  console.log("Chart of Account count:", count);
  
  if (count > 0) {
    const samples = await prisma.chartOfAccount.findMany({
      take: 5,
      select: { code: true, name: true, type: true }
    });
    console.log("Sample accounts:", JSON.stringify(samples, null, 2));
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
