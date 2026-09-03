const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING DEPARTMENT TABLE COLUMNS IN POSTGRESQL ===');

  await prisma.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "organizationId" text DEFAULT 'default-org';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "code" text;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "managerEmployeeId" text;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "sortOrder" integer DEFAULT 0;`);

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Department_organizationId_code_key" ON "Department" ("organizationId", "code");`).catch(e => console.log(e.message));
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Department_organizationId_idx" ON "Department" ("organizationId");`).catch(e => console.log(e.message));

  console.log('✅ Department table successfully updated with organizationId, code, managerEmployeeId');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
