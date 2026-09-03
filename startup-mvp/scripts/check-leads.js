const dotenv = require("dotenv");
dotenv.config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.lead.count();
  console.log(`Total Leads in DB: ${count}`);

  const sampleLeads = await prisma.lead.findMany({
    take: 10,
    select: {
      id: true,
      leadNumber: true,
      name: true,
      email: true,
      organizationId: true,
      ownerId: true,
      status: true,
      isTrash: true,
      createdAt: true
    }
  });

  console.log("Sample Leads in DB:");
  console.dir(sampleLeads, { depth: null });

  const users = await prisma.user.findMany({
    take: 10,
    select: { id: true, email: true, role: true, organizationId: true }
  });
  console.log("Sample Users in DB:");
  console.dir(users, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
