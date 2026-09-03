const dotenv = require("dotenv");
dotenv.config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.opportunity.count();
  console.log(`Total Opportunities in DB: ${count}`);

  const sampleOpps = await prisma.opportunity.findMany({
    take: 10
  });

  console.log("Opportunities in DB:");
  console.dir(sampleOpps, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
