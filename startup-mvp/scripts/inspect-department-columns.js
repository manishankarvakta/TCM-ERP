const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deptCols = await prisma.$queryRawUnsafe(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'Department';
  `);
  console.log('Department Columns:', deptCols.map(c => c.column_name));

  const teamCols = await prisma.$queryRawUnsafe(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'Team';
  `);
  console.log('Team Columns:', teamCols.map(c => c.column_name));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
