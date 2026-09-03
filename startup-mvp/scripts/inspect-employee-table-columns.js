const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING EMPLOYEE AND CLIENT COLUMNS IN POSTGRESQL ===\n');

  const empCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Employee';
  `);
  console.log('Employee Columns:', empCols);

  const clientCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Client';
  `);
  console.log('Client Columns:', clientCols);

  console.log('\n=======================================================\n');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
