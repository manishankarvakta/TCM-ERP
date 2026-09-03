const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = [
    'User', 'Employee', 'Client', 'ChartOfAccount', 'Voucher', 
    'VoucherLine', 'JournalEntryLine', 'Organization', 'settings', 'File'
  ];
  console.log('=== PREFLIGHT COUNTS ===');
  for (const table of tables) {
    try {
      const res = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`${table}:`, res[0].count.toString());
    } catch (e) {
      console.log(`${table}: table not found or empty`);
    }
  }

  // Check Quotation/Voucher organizationId nulls if table exists
  try {
    const nullVouchers = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Voucher" WHERE "organizationId" IS NULL`);
    console.log('Voucher (NULL orgId):', nullVouchers[0].count.toString());
  } catch (e) {}

  const org = await prisma.organization.findFirst();
  console.log('Primary Organization:', org);
}

main()
  .catch((e) => {
    console.error('Preflight error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
