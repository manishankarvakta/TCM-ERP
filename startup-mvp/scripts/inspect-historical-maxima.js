const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING HISTORICAL SEQUENCE MAXIMA IN POSTGRESQL ===\n');

  // 1. Voucher Maxima
  const voucherMax = await prisma.$queryRawUnsafe(`
    SELECT "organizationId", MAX("voucherNumber") as max_num, COUNT(*) as cnt
    FROM "Voucher"
    GROUP BY "organizationId";
  `);
  console.log('Voucher Maxima:', voucherMax);

  // 2. Lead Maxima
  try {
    const leadMax = await prisma.$queryRawUnsafe(`
      SELECT "organizationId", MAX("leadCode") as max_num, COUNT(*) as cnt
      FROM "Lead"
      GROUP BY "organizationId";
    `);
    console.log('Lead Maxima:', leadMax);
  } catch (e) {
    console.log('Lead Maxima: No leadCode column or 0 rows');
  }

  // 3. Project Maxima
  try {
    const projMax = await prisma.$queryRawUnsafe(`
      SELECT "organizationId", MAX("code") as max_num, COUNT(*) as cnt
      FROM "Project"
      GROUP BY "organizationId";
    `);
    console.log('Project Maxima:', projMax);
  } catch (e) {
    console.log('Project Maxima: No code column or 0 rows');
  }

  // 4. Employee Maxima
  try {
    const empMax = await prisma.$queryRawUnsafe(`
      SELECT "organizationId", MAX("employeeId") as max_num, COUNT(*) as cnt
      FROM "Employee"
      GROUP BY "organizationId";
    `);
    console.log('Employee Maxima:', empMax);
  } catch (e) {
    console.log('Employee Maxima: No employeeId column or 0 rows');
  }

  console.log('\n=======================================================\n');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
