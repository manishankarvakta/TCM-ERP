const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING ALL 13 DEPARTMENT ROWS IN POSTGRESQL ===');

  const depts = await prisma.department.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: { Employees: true, Teams: true },
      },
    },
  });

  console.log(`Total Department rows in DB: ${depts.length}\n`);

  depts.forEach((d, i) => {
    console.log(`[${i + 1}] ID: ${d.id}`);
    console.log(`    Name: "${d.name}" | Code: "${d.code}" | Status: ${d.status}`);
    console.log(`    OrgId: ${d.organizationId} | CreatedBy: ${d.createdBy || 'N/A'} | CreatedAt: ${d.createdAt}`);
    console.log(`    Employees: ${d._count.Employees} | Teams: ${d._count.Teams}\n`);
  });

  // Check if any row was created during test runs (e.g. orgId != default-org or created during tests)
  const testDepts = depts.filter(d => d.organizationId !== 'default-org' || d.id.includes('test') || d.id.includes('gate') || d.id.includes('p1a'));
  
  if (testDepts.length > 0) {
    console.log(`Found ${testDepts.length} test fixture department(s):`);
    for (const td of testDepts) {
      console.log(`  Deleting test fixture Department: [${td.id}] "${td.name}"`);
      await prisma.department.delete({ where: { id: td.id } });
    }
  }

  const finalCount = await prisma.department.count();
  console.log(`\nFinal Department Count in PostgreSQL: ${finalCount}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
