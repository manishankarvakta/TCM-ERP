const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== AUDITING HISTORICAL EMPLOYEE AND CLIENT MAXIMA IN POSTGRESQL ===\n');

  // 1. Employee Maxima Audit
  const employees = await prisma.$queryRawUnsafe(`
    SELECT "employeeId" FROM "Employee" WHERE "employeeId" IS NOT NULL;
  `);
  console.log(`Total Employee records with employeeId: ${employees.length}`);

  let maxEmpNum = 0;
  for (const emp of employees) {
    if (emp.employeeId) {
      const match = emp.employeeId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxEmpNum) maxEmpNum = num;
      }
    }
  }
  console.log(`Audited Highest Historical Employee Numeric Code: ${maxEmpNum}`);

  // 2. Client Maxima Audit
  let maxClientNum = 0;
  try {
    const clients = await prisma.$queryRawUnsafe(`
      SELECT "clientCode" FROM "Client" WHERE "clientCode" IS NOT NULL;
    `);
    console.log(`Total Client records with clientCode: ${clients.length}`);
    for (const c of clients) {
      if (c.clientCode) {
        const match = c.clientCode.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxClientNum) maxClientNum = num;
        }
      }
    }
  } catch (e) {
    console.log('Client table has no clientCode column or clientCode is null/cuid based.');
  }
  console.log(`Audited Highest Historical Client Numeric Code: ${maxClientNum}`);

  // 3. Backfill BusinessSequence for EMPLOYEE and CLIENT
  const orgId = 'default-org';
  const year = 2026;

  if (maxEmpNum > 0) {
    await prisma.$queryRawUnsafe(`
      INSERT INTO "BusinessSequence" (id, "organizationId", key, year, "currentValue", "createdAt", "updatedAt")
      VALUES ('seq_' || md5('default-org-EMPLOYEE-2026'), '${orgId}', 'EMPLOYEE', ${year}, ${maxEmpNum}, NOW(), NOW())
      ON CONFLICT ("organizationId", key, year)
      DO UPDATE SET "currentValue" = GREATEST("BusinessSequence"."currentValue", ${maxEmpNum}), "updatedAt" = NOW()
      RETURNING "currentValue";
    `);
    console.log(`✅ BusinessSequence for EMPLOYEE backfilled to ${maxEmpNum}`);
  }

  if (maxClientNum > 0) {
    await prisma.$queryRawUnsafe(`
      INSERT INTO "BusinessSequence" (id, "organizationId", key, year, "currentValue", "createdAt", "updatedAt")
      VALUES ('seq_' || md5('default-org-CLIENT-2026'), '${orgId}', 'CLIENT', ${year}, ${maxClientNum}, NOW(), NOW())
      ON CONFLICT ("organizationId", key, year)
      DO UPDATE SET "currentValue" = GREATEST("BusinessSequence"."currentValue", ${maxClientNum}), "updatedAt" = NOW()
      RETURNING "currentValue";
    `);
    console.log(`✅ BusinessSequence for CLIENT backfilled to ${maxClientNum}`);
  }

  console.log('\n=======================================================\n');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
