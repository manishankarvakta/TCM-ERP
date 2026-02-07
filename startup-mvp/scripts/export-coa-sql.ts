import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

async function exportCoa() {
  console.log("Exporting ChartOfAccount to SQL...");

  try {
    const accounts = await prisma.chartOfAccount.findMany();
    
    let sql = `-- ChartOfAccount Export\n`;
    sql += `-- Generated at ${new Date().toISOString()}\n\n`;

    for (const acc of accounts) {
      const parentId = acc.parentId ? `'${acc.parentId}'` : 'NULL';
      const description = acc.description ? `'${acc.description.replace(/'/g, "''")}'` : 'NULL'; // Escape single quotes
      const createdBy = `'${acc.createdBy}'`; 
      const createdAt = `'${acc.createdAt.toISOString()}'`;
      const updatedAt = `'${acc.updatedAt.toISOString()}'`;
      const isControl = acc.isControl ? 'TRUE' : 'FALSE';

      sql += `INSERT INTO "ChartOfAccount" ("id", "code", "name", "type", "parentId", "description", "status", "createdBy", "createdAt", "updatedAt", "isControl") VALUES ('${acc.id}', '${acc.code}', '${acc.name.replace(/'/g, "''")}', '${acc.type}', ${parentId}, ${description}, '${acc.status}', ${createdBy}, ${createdAt}, ${updatedAt}, ${isControl});\n`;
    }

    fs.writeFileSync("chart_of_accounts.sql", sql);
    console.log(`✅ Successfully exported ${accounts.length} accounts to chart_of_accounts.sql`);

  } catch (error) {
    console.error("❌ Export failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

exportCoa();
