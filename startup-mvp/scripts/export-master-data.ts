import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

// Helper to escape strings
function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'number') return val.toString();
  // Escape newlines and single quotes
  return `'${String(val).replace(/'/g, "''").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;
}

async function exportTable(tableName: string, modelName: string) {
  console.log(`Exporting ${tableName}...`);
  // @ts-ignore
  const records = await prisma[modelName].findMany();
  
  if (records.length === 0) {
      console.log(`No records for ${tableName}.`);
      return;
  }

  let sql = `-- ${tableName} Export\n`;
  sql += `-- Generated at ${new Date().toISOString()}\n\n`;

  for (const rec of records) {
    const keys = Object.keys(rec);
    const cols = keys.map(k => `"${k}"`).join(", ");
    const vals = keys.map(k => esc(rec[k])).join(", ");
    
    sql += `INSERT INTO "${tableName}" (${cols}) VALUES (${vals});\n`;
  }

  fs.writeFileSync(`${tableName.toLowerCase()}.sql`, sql);
  console.log(`✅ Exported ${records.length} records to ${tableName.toLowerCase()}.sql`);
}

async function exportAll() {
  try {
    await exportTable("Unit", "unit");
    await exportTable("Category", "category");
    await exportTable("Item", "item");
    await exportTable("ItemCategory", "itemCategory"); // Added
    await exportTable("ModuleGroup", "moduleGroup");
    await exportTable("ModuleGroupItem", "moduleGroupItem");
  } catch (error) {
    console.error("❌ Export failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

exportAll();
