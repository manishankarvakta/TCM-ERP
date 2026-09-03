const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== APPLYING BUSINESS_SEQUENCE TABLE IN POSTGRESQL ===');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BusinessSequence" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL DEFAULT 'default-org',
      "key" TEXT NOT NULL,
      "year" INTEGER NOT NULL,
      "currentValue" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BusinessSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "BusinessSequence_organizationId_key_year_key" 
    ON "BusinessSequence"("organizationId", "key", "year");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BusinessSequence_organizationId_key_idx" 
    ON "BusinessSequence"("organizationId", "key");
  `);

  console.log('✅ BusinessSequence table and indexes created successfully in PostgreSQL.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
