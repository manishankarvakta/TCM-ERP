const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== BACKFILLING NULL ORGANIZATION_ID IN VOUCHER TABLE ===');

  const result = await prisma.$executeRawUnsafe(`
    UPDATE "Voucher" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
  `);

  console.log(`Updated ${result} rows in Voucher table.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
