const dotenv = require("dotenv");
dotenv.config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== REBINDING ALL RECORDS TO TECHSOUL ORGANIZATION ===");
  const targetOrgId = "cmltc6oik002yn1011ghceakr";

  // Get all table names in public schema
  const tableRows = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tableRows.map(r => r.table_name);

  for (const table of tables) {
    try {
      // Check if organizationId column exists
      const colCheck = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = 'organizationId';
      `);

      if (colCheck.length > 0) {
        const updated = await prisma.$executeRawUnsafe(`
          UPDATE "${table}" 
          SET "organizationId" = '${targetOrgId}' 
          WHERE "organizationId" IS NULL OR "organizationId" != '${targetOrgId}';
        `);
        if (updated > 0) {
          console.log(`✅ Table "${table}": Rebound ${updated} rows to TechSoul (${targetOrgId}).`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Table "${table}" rebind error: ${err.message}`);
    }
  }

  console.log("\n=== REBINDING USER ROLES & ORGANIZATIONS ===");
  const usersUpdated = await prisma.$executeRawUnsafe(`
    UPDATE "User" 
    SET "organizationId" = '${targetOrgId}' 
    WHERE "organizationId" IS NULL OR "organizationId" != '${targetOrgId}';
  `);
  console.log(`Updated ${usersUpdated} users to TechSoul org.`);

  console.log("=== Complete ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
