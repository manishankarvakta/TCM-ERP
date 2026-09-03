const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tablesWithOrgId = [
    'User', 'Employee', 'Lead', 'Client', 'Contact', 
    'Opportunity', 'Project', 'Task', 'Issue', 'Timesheet', 
    'Invoice', 'Order', 'Payroll', 'File', 'ChartOfAccount',
    'Quotation', 'Voucher'
  ];

  console.log('=== APPLYING SAFE ADDITIVE ORGANIZATION COLUMNS & BACKFILL ===');

  for (const table of tablesWithOrgId) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "organizationId" text DEFAULT 'default-org';`
      );
      console.log(`✅ Added/Verified organizationId on "${table}"`);

      // Backfill any NULL values to default-org
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;`
      );
      console.log(`  └─ Backfilled ${updated} rows in "${table}"`);
    } catch (e) {
      console.log(`⚠️ Note on "${table}": ${e.message}`);
    }
  }

  // Handle settings table (uses organization_id column name)
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "organization_id" text DEFAULT 'default-org';`
    );
    console.log(`✅ Added/Verified organization_id on "settings"`);
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "settings" SET "organization_id" = 'default-org' WHERE "organization_id" IS NULL;`
    );
    console.log(`  └─ Backfilled ${updated} rows in "settings"`);
  } catch (e) {
    console.log(`⚠️ Note on "settings": ${e.message}`);
  }

  console.log('=== BACKFILL COMPLETE ===');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
