const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING DUPLICATE BUSINESS NUMBERS IN POSTGRESQL ===\n');

  // 1. Voucher Duplicates
  const voucherDups = await prisma.$queryRawUnsafe(`
    SELECT "organizationId", "voucherNumber", COUNT(*) as cnt
    FROM "Voucher"
    GROUP BY "organizationId", "voucherNumber"
    HAVING COUNT(*) > 1;
  `);
  console.log('Voucher Duplicate Groups:', voucherDups);

  // 2. Employee Duplicates
  const empDups = await prisma.$queryRawUnsafe(`
    SELECT "organizationId", "employeeCode", COUNT(*) as cnt
    FROM "Employee"
    WHERE "employeeCode" IS NOT NULL
    GROUP BY "organizationId", "employeeCode"
    HAVING COUNT(*) > 1;
  `);
  console.log('Employee Code Duplicate Groups:', empDups);

  // 3. Client Duplicates
  const clientDups = await prisma.$queryRawUnsafe(`
    SELECT "organizationId", "clientCode", COUNT(*) as cnt
    FROM "Client"
    WHERE "clientCode" IS NOT NULL
    GROUP BY "organizationId", "clientCode"
    HAVING COUNT(*) > 1;
  `);
  console.log('Client Code Duplicate Groups:', clientDups);

  console.log('\n=======================================================\n');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
