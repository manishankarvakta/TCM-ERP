import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Helper to parse SQL INSERTs
// Matches: INSERT INTO "Table" ("col", ...) VALUES (val, ...);
function parseInsert(line: string) {
  const tableMatch = line.match(/INSERT INTO "(\w+)"/);
  const colsMatch = line.match(/\(([^)]+)\) VALUES/);
  const valsMatch = line.match(/VALUES \((.+)\);/);

  if (!tableMatch || !colsMatch || !valsMatch) return null;

  const table = tableMatch[1];
  const cols = colsMatch[1].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
  
  // Value parsing is tricky with commas in strings.
  // Our export uses 'string', NULL, TRUE, FALSE.
  // We can use a regex that matches:
  // '([^']|'')*' | NULL | TRUE | FALSE | [0-9.]+
  
  const rawVals = valsMatch[1];
  const vals = [];
  let current = '';
  let inQuote = false;
  
  for (let i = 0; i < rawVals.length; i++) {
    const c = rawVals[i];
    if (c === "'" && rawVals[i+1] === "'") { // Escaped quote
        current += "'";
        i++;
    } else if (c === "'") {
        inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
        vals.push(current.trim());
        current = '';
    } else {
        current += c;
    }
  }
  vals.push(current.trim());

  if (vals.length !== cols.length) {
      console.warn(`Mismatch cols/vals for table ${table}: ${cols.length} vs ${vals.length}`);
      return null;
  }

  const data: any = {};
  cols.forEach((col, idx) => {
    let val = vals[idx];
    if (val === 'NULL') val = null;
    else if (val === 'TRUE') val = true;
    else if (val === 'FALSE') val = false;
    else if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1);
    else if (!isNaN(Number(val))) val = Number(val);
    
    // Date detection? 
    // If column ends in 'At' or represents date...
    // Prisma usually handles string -> Date conversion if field is DateTime?
    // Only if passed as Date object or ISO string.
    // Our export wraps date string in quotes.
    // We should parse it if it looks like ISO date?
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
        val = new Date(val);
    }
    // Unescape newlines
    if (typeof val === 'string') {
        val = val.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    }
    // Handle Decimal? Prisma expects Decimal or string/number.
    // Our export exports numbers as string/number? '20000.00' is in quotes?
    // Export script: typeof val === 'number' ? val.toString() : quote...
    // If it was Decimal in DB, prisma returns Decimal?
    // Export script treated everything as generic.
    
    data[col] = val;
  });

  return { table, data };
}

async function start() {
  console.log("Starting Reset and Restore...");
  
  try {
    // 1. CLEANUP PHASE
    console.log("🧹 Cleaning Transactional & Master Data...");
    
    // Transactional (Order-Aware)
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.purchaseItem.deleteMany({});
    await prisma.purchase.deleteMany({});
    
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.deliveryLedger.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.deliveryScheduleItem.deleteMany({});
    await prisma.deliverySchedule.deleteMany({});
    
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    
    await prisma.itemCategory.deleteMany({}); // Delete relations
    
    // Master data to restore
    console.log("Cleaning Master Data...");
    await prisma.moduleGroupItem.deleteMany({});
    await prisma.moduleGroup.deleteMany({});
    
    // Item is linked to QuotationItem?
    await prisma.quotationItem.deleteMany({});
    await prisma.quotation.deleteMany({}); // Delete quotations first
    
    await prisma.item.deleteMany({});
    await prisma.category.deleteMany({});
    
    // Unit linked to Item. Item deleted.
    await prisma.unit.deleteMany({});
    
    // Clients/Suppliers (Not in restore list, so wiping?)
    // User said "clean all data except user... and import items...".
    // Implies Clients/Suppliers should be deleted?
    // "Clean all data". Yes.
    await prisma.supplier.deleteMany({});
    await prisma.client.deleteMany({});
    
    // Clean remaining transactional
    await prisma.journalEntryLine.deleteMany({});
    await prisma.voucherLine.deleteMany({});
    // delete vouchers linked to...
    await prisma.voucher.deleteMany({});
    await prisma.journalEntry.deleteMany({}); // if any
    
    // Clean Orphans
    await prisma.notification.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.userLog.deleteMany({});
    // NOT UserPermission
    
    console.log("✅ Cleanup Complete.");

    // 2. IMPORT PHASE
    console.log("📥 Importing Master Data...");
    
    const importOrder = [
        "unit.sql",
        "category.sql",
        "item.sql",
        "itemcategory.sql",
        "modulegroup.sql",
        "modulegroupitem.sql"
    ];

    for (const filename of importOrder) {
        const filePath = path.join(process.cwd(), filename);
        if (!fs.existsSync(filePath)) {
            console.error(`⚠️ File not found: ${filename}`);
            continue;
        }

        console.log(`Processing ${filename}...`);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(l => l.startsWith('INSERT INTO'));
        
        let count = 0;
        for (const line of lines) {
            const parsed = parseInsert(line);
            if (!parsed) continue;
            
            const { table, data } = parsed;
            try {
                // @ts-ignore
                await prisma[table].upsert({
                    where: { id: data.id },
                    update: data,
                    create: data
                });
                count++;
            } catch (err: any) {
                console.error(`❌ Failed to import ${table} record (ID: ${data.id}, Code: ${data.code || 'N/A'}): ${err.message}`);
                // throw err; // Re-throw to stop, or continue?
                // For debugging, catching one might be enough, but let's let it run/fail.
                throw err;
            }
        }
        console.log(`✅ Imported ${count} records from ${filename}`);
    }

    console.log("🎉 Reset and Restore Successful!");

  } catch (error) {
    console.error("❌ Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

start();
