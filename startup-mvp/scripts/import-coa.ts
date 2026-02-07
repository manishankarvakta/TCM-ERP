import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Helper to parse SQL values
// VALUES ('id', 'code', 'name', 'type', 'parentId', 'description', 'status', 'createdBy', 'createdAt', 'updatedAt', 'isControl')
function parseSqlInsert(line: string) {
  const valuesMatch = line.match(/VALUES \((.*)\);/);
  if (!valuesMatch) return null;
  
  // Split by comma, but handle quoted strings containing commas?
  // Our export script escaped quotes as '', but didn't handle commas inside quotes specifically for regex split.
  // But our export replaced ' with ''.
  // Let's use a simpler regex or just split by `', '` if consistent.
  // The export format: 'val', 'val', ... or NULL or TRUE/FALSE.
  // VALUES ('id', 'code', 'name', 'type', parent, desc, 'status', createdBy, createdAt, updatedAt, control)
  
  // Safe parsing by iterating characters or just simple split if we trust the content (exported by us).
  // The export script:
  // ('${acc.id}', '${acc.code}', '${acc.name}', '${acc.type}', ${parentId}, ${description}, '${acc.status}', ${createdBy}, ${createdAt}, ${updatedAt}, ${isControl})
  
  const rawValues = valuesMatch[1];
  // Simple CSV parser for SQL values
  const parts = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < rawValues.length; i++) {
    const c = rawValues[i];
    if (c === "'" && rawValues[i+1] === "'") { // Escaped quote
       current += "'";
       i++;
    } else if (c === "'") {
       inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
       parts.push(current.trim());
       current = '';
    } else {
       current += c;
    }
  }
  parts.push(current.trim());

  // Clean quotes
  const clean = (val: string) => {
    if (val === 'NULL') return null;
    if (val.startsWith("'") && val.endsWith("'")) return val.substring(1, val.length - 1);
    if (val === 'TRUE') return true;
    if (val === 'FALSE') return false;
    return val;
  };

  return {
    id: clean(parts[0]) as string,
    code: clean(parts[1]) as string,
    name: clean(parts[2]) as string,
    type: clean(parts[3]) as any, // Enum
    parentId: clean(parts[4]) as string | null,
    description: clean(parts[5]) as string | null,
    status: clean(parts[6]) as string,
    createdBy: clean(parts[7]) as string,
    createdAt: new Date(clean(parts[8]) as string),
    updatedAt: new Date(clean(parts[9]) as string),
    isControl: clean(parts[10]) as boolean
  };
}

async function importCoa() {
  console.log("Importing ChartOfAccount from SQL...");
  const sqlPath = path.join(process.cwd(), "chart_of_accounts.sql");
  
  if (!fs.existsSync(sqlPath)) {
      console.error("chart_of_accounts.sql not found!");
      return;
  }

  const content = fs.readFileSync(sqlPath, "utf-8");
  const lines = content.split('\n').filter(l => l.startsWith('INSERT INTO'));
  
  console.log(`Found ${lines.length} records to import.`);

  const records = [];
  for (const line of lines) {
      const rec = parseSqlInsert(line);
      if (rec) records.push(rec);
  }

  try {
    await prisma.$transaction(async (tx) => {
      
      // Pass 1: Upsert all with parentId = null
      console.log("Pass 1: Creating/Updating accounts (unlinked)...");
      for (const rec of records) {
        await tx.chartOfAccount.upsert({
          where: { id: rec.id },
          update: {
             ...rec,
             parentId: null // Temporarily null to avoid FK
          },
          create: {
             ...rec,
             parentId: null
          }
        });
      }

      // Pass 2: Link parents
      console.log("Pass 2: Linking parents...");
      let linkedCount = 0;
      for (const rec of records) {
        if (rec.parentId) {
            await tx.chartOfAccount.update({
                where: { id: rec.id },
                data: { parentId: rec.parentId }
            });
            linkedCount++;
        }
      }
      console.log(`Linked ${linkedCount} parent relationships.`);

    });
    
    console.log("✅ Successfully imported Chart of Accounts.");
  } catch (error) {
    console.error("❌ Import failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

importCoa();
