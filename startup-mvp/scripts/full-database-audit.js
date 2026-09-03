const dotenv = require("dotenv");
dotenv.config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== COMPREHENSIVE DATABASE AUDIT ===");
  const targetOrgId = "cmltc6oik002yn1011ghceakr"; // TechSoul

  // Get all table names in public schema
  const tableRows = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tableRows.map(r => r.table_name);
  console.log(`Found ${tables.length} tables in PostgreSQL database.\n`);

  const auditReport = [];

  for (const table of tables) {
    try {
      // Get row count
      const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}";`);
      const count = Number(countResult[0].count);

      // Check if organizationId column exists
      const colCheck = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = 'organizationId';
      `);

      const hasOrgId = colCheck.length > 0;
      let nullOrgCount = 0;
      let targetOrgCount = 0;

      if (hasOrgId && count > 0) {
        const nullRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}" WHERE "organizationId" IS NULL OR "organizationId" = '';`);
        nullOrgCount = Number(nullRes[0].count);

        const targetRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}" WHERE "organizationId" = '${targetOrgId}';`);
        targetOrgCount = Number(targetRes[0].count);
      }

      auditReport.push({
        table,
        count,
        hasOrgId,
        nullOrgCount,
        targetOrgCount
      });
    } catch (err) {
      console.warn(`Error auditing table "${table}": ${err.message}`);
    }
  }

  console.log("TABLE SUMMARY:");
  console.table(auditReport.filter(r => r.count > 0));

  console.log("\nTABLES WITH NULL organizationId:");
  const nullOrgTables = auditReport.filter(r => r.nullOrgCount > 0);
  console.table(nullOrgTables);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
