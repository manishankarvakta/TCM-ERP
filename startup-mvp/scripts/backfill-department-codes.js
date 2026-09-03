const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== BACKFILLING MISSING DEPARTMENT CODES IN POSTGRESQL ===');

  const rows = await prisma.$queryRawUnsafe(`
    SELECT id, name, code, "organizationId" FROM "Department"
  `);

  console.log(`Found ${rows.length} rows in Department table.`);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.code) {
      // Derive uppercase code from name or ID
      const baseCode = r.name
        ? r.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()
        : `DEPT${i + 1}`;
      const uniqueCode = `${baseCode}_${i + 1}`;

      await prisma.$executeRawUnsafe(
        `UPDATE "Department" SET code = '${uniqueCode}' WHERE id = '${r.id}'`
      );
      console.log(`Updated Department [${r.id}] "${r.name}" -> Code: ${uniqueCode}`);
    }
  }

  console.log('✅ All Department rows now have non-null unique codes.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
