import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.permissionTemplate.findMany();

  console.log('Permission Templates:');
  templates.forEach(t => {
    console.log(`Template: ${t.name}`);
    console.log(`Permissions: ${JSON.stringify(t.permissions, null, 2)}`);
    console.log('---');
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
