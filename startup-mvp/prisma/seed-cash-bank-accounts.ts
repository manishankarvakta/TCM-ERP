import { PrismaClient, CashBankAccountType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds Cash & Bank Accounts
 * 
 * Creates CashBankAccount records linked to existing ChartOfAccount records:
 * - One Cash account linked to COA "Cash"
 * - One Bank account linked to COA "Bank"
 * 
 * Rules:
 * - Idempotent: Will not create duplicates
 * - Safe: Does not modify existing CashBankAccount records
 * - Graceful: Skips with warning if COA accounts are missing
 * 
 * NOTE: `CashBankAccount.createdBy` is required (FK -> User). This seed does NOT create users.
 * Ensure at least one user exists (preferably admin) before running.
 * 
 * This script is idempotent - it checks for existing records before creating, so it won't
 * create duplicates or affect existing CashBankAccount records.
 */
async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 Seeding Cash & Bank Accounts...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Find a user to set as creator (required by the schema)
  const creator =
    (await prisma.user.findFirst({
      where: { role: "admin", status: "active" },
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.user.findFirst({
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    }));

  if (!creator) {
    throw new Error(
      "No users found in DB. Cannot seed `CashBankAccount` because `CashBankAccount.createdBy` is required. Create an admin/user first, then re-run the seed."
    );
  }

  console.log(`\n👤 Using creator: ${creator.email ?? creator.id}\n`);

  // Define accounts to seed
  const accountsToSeed = [
    {
      coaName: "Cash",
      type: "CASH" as CashBankAccountType,
    },
    {
      coaName: "Bank",
      type: "BANK" as CashBankAccountType,
    },
  ];

  let createdCount = 0;
  let skippedCount = 0;
  let warningCount = 0;

  // Process each account
  for (const account of accountsToSeed) {
    // Find the Chart of Account by name
    const coa = await prisma.chartOfAccount.findFirst({
      where: {
        name: account.coaName,
        status: "active",
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (!coa) {
      console.log(`⚠️  WARNING: Chart of Account "${account.coaName}" not found. Skipping...`);
      warningCount++;
      continue;
    }

    // Check if CashBankAccount already exists for this COA
    const existing = await prisma.cashBankAccount.findUnique({
      where: {
        chartOfAccountId: coa.id,
      },
    });

    if (existing) {
      console.log(
        `✅ Found COA: ${coa.name} (${coa.code})\n⏭️  Skipped: CashBankAccount already exists for ${coa.name}`
      );
      skippedCount++;
      continue;
    }

    // Create new CashBankAccount
    await prisma.cashBankAccount.create({
      data: {
        chartOfAccountId: coa.id,
        type: account.type,
        status: "active",
        createdBy: creator.id,
        updatedAt: new Date(),
      },
    });

    console.log(
      `✅ Found COA: ${coa.name} (${coa.code})\n✅ Created CashBankAccount for ${coa.name} (type: ${account.type})`
    );
    createdCount++;
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ SUCCESS: Seeded ${createdCount} Cash & Bank Account(s)`);
  if (skippedCount > 0) {
    console.log(`⏭️  Skipped: ${skippedCount} account(s) already exist`);
  }
  if (warningCount > 0) {
    console.log(`⚠️  Warnings: ${warningCount} COA account(s) not found`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: Seeding Cash & Bank Accounts failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("💥 Fatal error details:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

