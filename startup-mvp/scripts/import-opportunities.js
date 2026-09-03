const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== RESTORING OPPORTUNITIES ===");
  const targetOrgId = "cmltc6oik002yn1011ghceakr";

  const zipPath = path.join(process.cwd(), 'backups/database/backup-20260828-135853.zip');
  const zip = new AdmZip(zipPath);
  const dumpEntry = zip.getEntry('database.dump');

  if (!dumpEntry) {
    console.error("No database.dump found in backup ZIP!");
    process.exit(1);
  }

  const tempDumpPath = path.join(process.cwd(), 'tmp/temp-opp.dump');
  fs.mkdirSync(path.dirname(tempDumpPath), { recursive: true });
  fs.writeFileSync(tempDumpPath, zip.readFile(dumpEntry));

  const dbUrl = new URL(process.env.DATABASE_URL);
  const host = dbUrl.hostname;
  const port = dbUrl.port || 5432;
  const db = dbUrl.pathname.slice(1).split('?')[0];
  const user = dbUrl.username;
  const password = dbUrl.password;

  // Run pg_restore specifically for Opportunity table
  const cmd = `PGPASSWORD="${password}" pg_restore -h ${host} -p ${port} -U ${user} -d ${db} --data-only -t "Opportunity" "${tempDumpPath}"`;

  exec(cmd, async (err, stdout, stderr) => {
    if (fs.existsSync(tempDumpPath)) fs.unlinkSync(tempDumpPath);

    console.log("pg_restore output:", stdout || stderr || "Done");

    // Now update all Opportunities organizationId to TechSoul
    try {
      await prisma.$executeRawUnsafe(`UPDATE "Opportunity" SET "organizationId" = '${targetOrgId}' WHERE "organizationId" IS NULL OR "organizationId" != '${targetOrgId}';`);
      const count = await prisma.opportunity.count();
      console.log(`✅ Current Opportunities in DB after import: ${count}`);
    } catch (e) {
      console.error("Failed to update organizationId on Opportunities:", e.message);
    } finally {
      await prisma.$disconnect();
    }
  });
}

main();
