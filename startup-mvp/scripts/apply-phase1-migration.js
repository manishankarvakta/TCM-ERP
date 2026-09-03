const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== APPLYING SAFE PHASE 1 INDEXES TO POSTGRESQL ===');

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Department_organizationId_code_key" ON "Department" ("organizationId", "code");`).catch(e => console.log(e.message));
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Department_organizationId_idx" ON "Department" ("organizationId");`).catch(e => console.log(e.message));
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Department_organizationId_status_idx" ON "Department" ("organizationId", "status");`).catch(e => console.log(e.message));
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Team_organizationId_departmentId_code_key" ON "Team" ("organizationId", "departmentId", "code");`).catch(e => console.log(e.message));
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Team_organizationId_idx" ON "Team" ("organizationId");`).catch(e => console.log(e.message));
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Team_departmentId_idx" ON "Team" ("departmentId");`).catch(e => console.log(e.message));
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Employee_departmentId_idx" ON "Employee" ("departmentId");`).catch(e => console.log(e.message));
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Employee_teamId_idx" ON "Employee" ("teamId");`).catch(e => console.log(e.message));
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Employee_reportingManagerId_idx" ON "Employee" ("reportingManagerId");`).catch(e => console.log(e.message));

  console.log('=== INDEX MIGRATION COMPLETE ===');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
