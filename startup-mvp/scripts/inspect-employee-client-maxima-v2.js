const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== AUDITING HISTORICAL EMPLOYEE CODE AND CLIENT CODE MAXIMA ===\n');

  // 1. Employee employeeCode Audit
  const employees = await prisma.$queryRawUnsafe(`
    SELECT "employeeCode" FROM "Employee" WHERE "employeeCode" IS NOT NULL;
  `);
  console.log(`Total Employee records with employeeCode: ${employees.length}`);

  let maxEmpNum = 0;
  for (const emp of employees) {
    if (emp.employeeCode) {
      const match = emp.employeeCode.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxEmpNum) maxEmpNum = num;
      }
    }
  }
  console.log(`Audited Highest Historical Employee Numeric Code: ${maxEmpNum}`);

  // 2. Client clientCode Audit
  const clients = await prisma.$queryRawUnsafe(`
    SELECT "clientCode" FROM "Client" WHERE "clientCode" IS NOT NULL;
  `);
  console.log(`Total Client records with clientCode: ${clients.length}`);

  let maxClientNum = 0;
  for (const c of clients) {
    if (c.clientCode) {
      const match = c.clientCode.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxClientNum) maxClientNum = num;
      }
    }
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
