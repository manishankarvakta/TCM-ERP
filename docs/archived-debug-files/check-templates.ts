import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.permissionTemplate.findMany();
  console.log('--- ALL TEMPLATES ---');
  for (const t of templates) {
    console.log(`Template ID: ${t.id}`);
    console.log(`Name: ${t.name}`);
    console.log(`Permissions:`, JSON.stringify(t.permissions, null, 2));
    console.log('----------------------');
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
