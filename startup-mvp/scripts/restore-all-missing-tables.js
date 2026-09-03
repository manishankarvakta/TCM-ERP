const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== RESTORING ALL TABLES WITH NULLABLE organizationId ===");
  const targetOrgId = "cmltc6oik002yn1011ghceakr";

  // 1. Temporarily drop NOT NULL on organizationId for all tables that have it
  const tablesWithOrg = [
    "Opportunity", "Lead", "Invoice", "Issue", "Order", "Project", "Client", 
    "Contact", "Quotation", "Purchase", "Supplier", "Employee", "Task", 
    "User", "Voucher", "VoucherLine", "Warehouse", "BiometricDevice", 
    "CashBankAccount", "ChartOfAccount", "Delivery", "Item", "Payroll"
  ];

  for (const table of tablesWithOrg) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "organizationId" DROP NOT NULL;`);
    } catch (e) {
      // Column might not exist or already nullable
    }
  }

  // 2. Extract database dump
  const zipPath = path.join(process.cwd(), 'backups/database/backup-20260828-135853.zip');
  const zip = new AdmZip(zipPath);
  const dumpEntry = zip.getEntry('database.dump');

  if (!dumpEntry) {
    console.error("No database.dump found in backup ZIP!");
    process.exit(1);
  }

  const tempDumpPath = path.join(process.cwd(), 'tmp/full-restore.dump');
  fs.mkdirSync(path.dirname(tempDumpPath), { recursive: true });
  fs.writeFileSync(tempDumpPath, zip.readFile(dumpEntry));

  const dbUrl = new URL(process.env.DATABASE_URL);
  const host = dbUrl.hostname;
  const port = dbUrl.port || 5432;
  const db = dbUrl.pathname.slice(1).split('?')[0];
  const user = dbUrl.username;
  const password = dbUrl.password;

  // Run pg_restore data-only
  const cmd = `PGPASSWORD="${password}" pg_restore -h ${host} -p ${port} -U ${user} -d ${db} --data-only --disable-triggers "${tempDumpPath}"`;

  console.log("Executing data-only restore from backup dump...");

  exec(cmd, async (err, stdout, stderr) => {
    if (fs.existsSync(tempDumpPath)) fs.unlinkSync(tempDumpPath);
    console.log("Restore log:", stdout || stderr || "Done");

    console.log("\n=== BACKFILLING organizationId TO TECHSOUL ORG ===");
    for (const table of tablesWithOrg) {
      try {
        const updated = await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "organizationId" = '${targetOrgId}' WHERE "organizationId" IS NULL OR "organizationId" = '';`);
        const total = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}";`);
        console.log(`Table "${table}": Total rows = ${total[0].count}, Updated = ${updated}`);
      } catch (e) {
        console.warn(`Error updating ${table}: ${e.message}`);
      }
    }

    console.log("\n=== DONE ===");
    await prisma.$disconnect();
  });
}

main();
