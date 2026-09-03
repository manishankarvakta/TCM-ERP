const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== AUDITING 12 EXISTING DEPARTMENT ROWS IN POSTGRESQL ===');

  const depts = await prisma.department.findMany({
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total Departments Found: ${depts.length}\n`);

  depts.forEach((d, i) => {
    console.log(`[${i + 1}] ID: ${d.id}`);
    console.log(`    Name: "${d.name}" | Code: "${d.code}" | Status: ${d.status}`);
    console.log(`    OrgId: ${d.organizationId} | ManagerId: ${d.managerEmployeeId || 'None'} | CreatedAt: ${d.createdAt}`);
  });

  // Check code uniqueness within org
  const codesByOrg = {};
  let duplicatesFound = false;

  depts.forEach((d) => {
    const key = `${d.organizationId}:${d.code}`;
    if (codesByOrg[key]) {
      duplicatesFound = true;
      console.error(`⚠️ DUPLICATE CODE FOUND: ${d.code} in Org ${d.organizationId}`);
    } else {
      codesByOrg[key] = d.id;
    }
  });

  if (!duplicatesFound) {
    console.log('\n✅ Verified: Zero duplicate department codes exist within any organization.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
