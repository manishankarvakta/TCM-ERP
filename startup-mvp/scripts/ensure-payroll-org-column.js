const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ENSURING ORGANIZATION_ID ON PAYROLL TABLE ===');
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "organizationId" text DEFAULT 'default-org';`);
  console.log('✅ Added organizationId column to Payroll table if missing.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
