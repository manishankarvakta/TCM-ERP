const dotenv = require("dotenv");
dotenv.config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Backfilling Organization IDs ===");
  const targetOrgId = "cmltc6oik002yn1011ghceakr";

  // Check if target org exists
  const org = await prisma.organization.findUnique({ where: { id: targetOrgId } });
  if (!org) {
    console.error(`Target organization ${targetOrgId} not found!`);
    process.exit(1);
  }
  console.log(`Using target organization: ${org.name} (${org.id})`);

  // List of tables that have organizationId column in current schema
  const tables = [
    "Lead", "Invoice", "Issue", "Order", "Project", "Client", 
    "Contact", "Opportunity", "Quotation", "Purchase", "Supplier",
    "Employee", "Task", "User", "Voucher", "VoucherLine", 
    "Warehouse", "BiometricDevice", "CashBankAccount", 
    "ChartOfAccount", "Delivery", "Item", "Payroll"
  ];

  for (const table of tables) {
    try {
      console.log(`Processing table "${table}"...`);
      // Add column if missing
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;`);
      
      // Update rows where organizationId is null
      const updated = await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "organizationId" = '${targetOrgId}' WHERE "organizationId" IS NULL OR "organizationId" = '';`);
      console.log(`✅ Table "${table}": updated ${updated} rows.`);
    } catch (err) {
      console.warn(`⚠️ Table "${table}" error: ${err.message}`);
    }
  }

  console.log("=== Backfill Complete ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
