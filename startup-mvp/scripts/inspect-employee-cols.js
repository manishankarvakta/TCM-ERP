const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empCols = await prisma.$queryRawUnsafe(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'Employee';
  `);
  console.log('Employee Columns:', empCols.map(c => c.column_name));

  // Add organizationId if missing
  await prisma.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "organizationId" text DEFAULT 'default-org';`);
  console.log('Added organizationId to Employee table if missing.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
