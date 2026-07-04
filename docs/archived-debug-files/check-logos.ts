import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const organizations = await prisma.organization.findMany();
  console.log('All Organizations:');
  console.log(JSON.stringify(organizations, null, 2));

  const clients = await prisma.client.findMany({
    where: { image: { not: null } }
  });
  console.log('Clients with images:');
  console.log(JSON.stringify(clients, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
