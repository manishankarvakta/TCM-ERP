const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ENSURING ORGANIZATION_ID ON USER TABLE ===');
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" text DEFAULT 'default-org';`);
  console.log('✅ Added organizationId column to User table if missing.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
