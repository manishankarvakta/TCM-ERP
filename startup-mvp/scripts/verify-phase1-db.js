const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== PHASE 1 POSTGRESQL DATABASE VERIFICATION ===');

  const deptCount = await prisma.department.count();
  const teamCount = await prisma.team.count();
  const empCount = await prisma.employee.count();

  const nullDept = await prisma.employee.count({ where: { departmentId: null } });
  const nullTeam = await prisma.employee.count({ where: { teamId: null } });
  const nullMgr = await prisma.employee.count({ where: { reportingManagerId: null } });

  const orphanDept = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "Employee" e 
    LEFT JOIN "Department" d ON e."departmentId" = d.id 
    WHERE e."departmentId" IS NOT NULL AND d.id IS NULL
  `);

  const orphanTeam = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "Employee" e 
    LEFT JOIN "Team" t ON e."teamId" = t.id 
    WHERE e."teamId" IS NOT NULL AND t.id IS NULL
  `);

  const crossOrgDeptMismatch = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "Employee" e 
    JOIN "Department" d ON e."departmentId" = d.id 
    WHERE e."organizationId" <> d."organizationId"
  `);

  const crossOrgTeamMismatch = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "Employee" e 
    JOIN "Team" t ON e."teamId" = t.id 
    WHERE e."organizationId" <> t."organizationId"
  `);

  const crossOrgManagerMismatch = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "Employee" e 
    JOIN "Employee" m ON e."reportingManagerId" = m.id 
    WHERE e."organizationId" <> m."organizationId"
  `);

  console.log(`Department Count: ${deptCount}`);
  console.log(`Team Count: ${teamCount}`);
  console.log(`Employee Count: ${empCount}`);
  console.log(`Employee NULL Department Count: ${nullDept}`);
  console.log(`Employee NULL Team Count: ${nullTeam}`);
  console.log(`Employee NULL Reporting Manager Count: ${nullMgr}`);
  console.log(`Orphan Department FK Count: ${orphanDept[0].count}`);
  console.log(`Orphan Team FK Count: ${orphanTeam[0].count}`);
  console.log(`Cross-Org Department Mismatch Count: ${crossOrgDeptMismatch[0].count}`);
  console.log(`Cross-Org Team Mismatch Count: ${crossOrgTeamMismatch[0].count}`);
  console.log(`Cross-Org Manager Mismatch Count: ${crossOrgManagerMismatch[0].count}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
