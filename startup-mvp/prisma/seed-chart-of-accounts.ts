import { PrismaClient, AccountType } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

/**
 * Generate unique ID for ChartOfAccount
 */
function generateAccountId(): string {
  return `coa_${Date.now()}_${randomBytes(8).toString("hex")}`;
}

/**
 * Seeds comprehensive Chart of Accounts
 * 
 * Creates a complete chart of accounts structure with:
 * - Assets (Current Assets, Bank Accounts, Digital Wallets, Receivables, Inventory, Fixed Assets)
 * - Liabilities (Current Liabilities)
 * - Equity (Owner's Capital, Retained Earnings, Current Year Profit/Loss)
 * - Income (Sales Revenue, Service Revenue, Other Income)
 * - Cost of Goods Sold
 * - Operating Expenses
 * 
 * NOTE: `ChartOfAccount.createdBy` is required (FK -> User). This seed does NOT create users.
 * Ensure at least one user exists (preferably admin) before running.
 * 
 * This script is idempotent - it uses upsert based on account code, so it won't affect
 * existing accounts that are already in the database.
 */
async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 Seeding Chart of Accounts...");
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
      "No users found in DB. Cannot seed `ChartOfAccount` because `ChartOfAccount.createdBy` is required. Create an admin/user first, then re-run the seed."
    );
  }

  console.log(`\n👤 Using creator: ${creator.email ?? creator.id}\n`);

  // Define all accounts with their hierarchy
  // Note: INCOME type is mapped to REVENUE as per Prisma schema
  const accounts = [
    // ============================================
    // ASSETS
    // ============================================
    {
      code: "1000",
      name: "Assets",
      type: "ASSET" as AccountType,
      parentCode: null,
      description: "Root asset group",
      isPostable: false,
      isControl: false,
    },
    {
      code: "1100",
      name: "Current Assets",
      type: "ASSET" as AccountType,
      parentCode: "1000",
      description: "Short-term assets",
      isPostable: false,
      isControl: false,
    },
    {
      code: "1110",
      name: "Cash on Hand",
      type: "ASSET" as AccountType,
      parentCode: "1100",
      description: "Physical cash available",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1120",
      name: "Petty Cash",
      type: "ASSET" as AccountType,
      parentCode: "1100",
      description: "Small cash expenses",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1200",
      name: "Bank Accounts",
      type: "ASSET" as AccountType,
      parentCode: "1100",
      description: "All bank accounts",
      isPostable: false,
      isControl: false,
    },
    {
      code: "1210",
      name: "Bank – Primary Account",
      type: "ASSET" as AccountType,
      parentCode: "1200",
      description: "Main bank account",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1220",
      name: "Bank – Secondary Account",
      type: "ASSET" as AccountType,
      parentCode: "1200",
      description: "Secondary bank account",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1300",
      name: "Digital Wallets",
      type: "ASSET" as AccountType,
      parentCode: "1100",
      description: "Mobile and digital wallets",
      isPostable: false,
      isControl: false,
    },
    {
      code: "1310",
      name: "bKash Wallet",
      type: "ASSET" as AccountType,
      parentCode: "1300",
      description: "bKash mobile wallet",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1320",
      name: "Nagad Wallet",
      type: "ASSET" as AccountType,
      parentCode: "1300",
      description: "Nagad mobile wallet",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1330",
      name: "Rocket Wallet",
      type: "ASSET" as AccountType,
      parentCode: "1300",
      description: "Rocket mobile wallet",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1400",
      name: "Receivables",
      type: "ASSET" as AccountType,
      parentCode: "1100",
      description: "Amounts receivable",
      isPostable: false,
      isControl: true,
    },
    {
      code: "1410",
      name: "Accounts Receivable",
      type: "ASSET" as AccountType,
      parentCode: "1400",
      description: "Customer balances (control account)",
      isPostable: true,
      isControl: true,
    },
    {
      code: "1500",
      name: "Other Current Assets",
      type: "ASSET" as AccountType,
      parentCode: "1100",
      description: "Other short-term assets",
      isPostable: false,
      isControl: false,
    },
    {
      code: "1510",
      name: "Advance to Suppliers",
      type: "ASSET" as AccountType,
      parentCode: "1500",
      description: "Supplier advances",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1520",
      name: "Prepaid Expenses",
      type: "ASSET" as AccountType,
      parentCode: "1500",
      description: "Expenses paid in advance",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1600",
      name: "Inventory",
      type: "ASSET" as AccountType,
      parentCode: "1000",
      description: "Inventory assets",
      isPostable: false,
      isControl: true,
    },
    {
      code: "1610",
      name: "Inventory Stock",
      type: "ASSET" as AccountType,
      parentCode: "1600",
      description: "Goods held for sale",
      isPostable: true,
      isControl: true,
    },
    {
      code: "1620",
      name: "Raw Material Inventory",
      type: "ASSET" as AccountType,
      parentCode: "1600",
      description: "Raw materials inventory",
      isPostable: true,
      isControl: true,
    },
    {
      code: "1630",
      name: "Ready Products Inventory",
      type: "ASSET" as AccountType,
      parentCode: "1600",
      description: "Finished goods inventory",
      isPostable: true,
      isControl: true,
    },
    {
      code: "1640",
      name: "Retail Inventory",
      type: "ASSET" as AccountType,
      parentCode: "1600",
      description: "Retail items inventory",
      isPostable: true,
      isControl: true,
    },
    {
      code: "1650",
      name: "Work In Progress (WIP)",
      type: "ASSET" as AccountType,
      parentCode: "1600",
      description: "Value of items in production",
      isPostable: true,
      isControl: true,
    },
    {
      code: "1700",
      name: "Fixed Assets",
      type: "ASSET" as AccountType,
      parentCode: "1000",
      description: "Long-term assets",
      isPostable: false,
      isControl: false,
    },
    {
      code: "1710",
      name: "Furniture & Fixtures",
      type: "ASSET" as AccountType,
      parentCode: "1700",
      description: "Furniture and fixtures",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1720",
      name: "Office Equipment",
      type: "ASSET" as AccountType,
      parentCode: "1700",
      description: "Computers and equipment",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1730",
      name: "Vehicles",
      type: "ASSET" as AccountType,
      parentCode: "1700",
      description: "Company vehicles",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1790",
      name: "Accumulated Depreciation",
      type: "ASSET" as AccountType,
      parentCode: "1700",
      description: "Depreciation group",
      isPostable: false,
      isControl: false,
    },
    {
      code: "1791",
      name: "Accumulated Depreciation – Furniture",
      type: "ASSET" as AccountType,
      parentCode: "1790",
      description: "Depreciation for furniture",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1792",
      name: "Accumulated Depreciation – Equipment",
      type: "ASSET" as AccountType,
      parentCode: "1790",
      description: "Depreciation for equipment",
      isPostable: true,
      isControl: false,
    },
    {
      code: "1793",
      name: "Accumulated Depreciation – Vehicles",
      type: "ASSET" as AccountType,
      parentCode: "1790",
      description: "Depreciation for vehicles",
      isPostable: true,
      isControl: false,
    },
    // ============================================
    // LIABILITIES
    // ============================================
    {
      code: "2000",
      name: "Liabilities",
      type: "LIABILITY" as AccountType,
      parentCode: null,
      description: "Root liability group",
      isPostable: false,
      isControl: false,
    },
    {
      code: "2100",
      name: "Current Liabilities",
      type: "LIABILITY" as AccountType,
      parentCode: "2000",
      description: "Short-term obligations",
      isPostable: false,
      isControl: true,
    },
    {
      code: "2110",
      name: "Accounts Payable",
      type: "LIABILITY" as AccountType,
      parentCode: "2100",
      description: "Supplier balances (control account)",
      isPostable: true,
      isControl: true,
    },
    {
      code: "2120",
      name: "Accrued Expenses",
      type: "LIABILITY" as AccountType,
      parentCode: "2100",
      description: "Expenses incurred but unpaid",
      isPostable: true,
      isControl: false,
    },
    {
      code: "2130",
      name: "Salaries Payable",
      type: "LIABILITY" as AccountType,
      parentCode: "2100",
      description: "Salaries owed to staff",
      isPostable: true,
      isControl: false,
    },
    {
      code: "2140",
      name: "Tax Payable",
      type: "LIABILITY" as AccountType,
      parentCode: "2100",
      description: "Taxes owed to authorities",
      isPostable: true,
      isControl: false,
    },
    // ============================================
    // EQUITY
    // ============================================
    {
      code: "3000",
      name: "Equity",
      type: "EQUITY" as AccountType,
      parentCode: null,
      description: "Owner's equity",
      isPostable: false,
      isControl: false,
    },
    {
      code: "3110",
      name: "Owner's Capital",
      type: "EQUITY" as AccountType,
      parentCode: "3000",
      description: "Owner investment",
      isPostable: true,
      isControl: false,
    },
    {
      code: "3120",
      name: "Retained Earnings",
      type: "EQUITY" as AccountType,
      parentCode: "3000",
      description: "Accumulated profits",
      isPostable: true,
      isControl: false,
    },
    {
      code: "3130",
      name: "Current Year Profit/Loss",
      type: "EQUITY" as AccountType,
      parentCode: "3000",
      description: "System-calculated net result",
      isPostable: true,
      isControl: false,
    },
    // ============================================
    // INCOME (mapped to REVENUE)
    // ============================================
    {
      code: "4000",
      name: "Income",
      type: "REVENUE" as AccountType,
      parentCode: null,
      description: "Revenue accounts",
      isPostable: false,
      isControl: false,
    },
    {
      code: "4110",
      name: "Sales Revenue",
      type: "REVENUE" as AccountType,
      parentCode: "4000",
      description: "Product sales income",
      isPostable: true,
      isControl: false,
    },
    {
      code: "4120",
      name: "Service Revenue",
      type: "REVENUE" as AccountType,
      parentCode: "4000",
      description: "Service income",
      isPostable: true,
      isControl: false,
    },
    {
      code: "4130",
      name: "Inventory Adjustment Revenue",
      type: "REVENUE" as AccountType,
      parentCode: "4000",
      description: "Gains from stock adjustments",
      isPostable: true,
      isControl: false,
    },
    {
      code: "4190",
      name: "Other Income",
      type: "REVENUE" as AccountType,
      parentCode: "4000",
      description: "Miscellaneous income",
      isPostable: true,
      isControl: false,
    },
    // ============================================
    // COST OF GOODS SOLD
    // ============================================
    {
      code: "5000",
      name: "Cost of Goods Sold",
      type: "EXPENSE" as AccountType,
      parentCode: null,
      description: "Direct cost of sales",
      isPostable: false,
      isControl: false,
    },
    {
      code: "5110",
      name: "Cost of Goods Sold",
      type: "EXPENSE" as AccountType,
      parentCode: "5000",
      description: "Cost of sold inventory",
      isPostable: true,
      isControl: false,
    },
    // ============================================
    // EXPENSES
    // ============================================
    {
      code: "6000",
      name: "Operating Expenses",
      type: "EXPENSE" as AccountType,
      parentCode: null,
      description: "Operating costs",
      isPostable: false,
      isControl: false,
    },
    {
      code: "6110",
      name: "Rent Expense",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Office rent",
      isPostable: true,
      isControl: false,
    },
    {
      code: "6120",
      name: "Utilities Expense",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Electricity, water, gas",
      isPostable: true,
      isControl: false,
    },
    {
      code: "6130",
      name: "Salary Expense",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Employee salaries",
      isPostable: true,
      isControl: false,
    },
    {
      code: "6140",
      name: "Office Supplies",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Stationery & supplies",
      isPostable: true,
      isControl: false,
    },
    {
      code: "6150",
      name: "Internet & Communication",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Internet and phone",
      isPostable: true,
      isControl: false,
    },
    {
      code: "6160",
      name: "Transportation Expense",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Travel & transport",
      isPostable: true,
      isControl: false,
    },
    {
      code: "6170",
      name: "Mobile Wallet Charges",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "bKash/Nagad fees",
      isPostable: true,
      isControl: false,
    },
    {
      code: "6180",
      name: "Bank Charges",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Bank service fees",
      isPostable: true,
      isControl: false,
    },
    {
      code: "6190",
      name: "Miscellaneous Expense",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Other small expenses",
      isPostable: true,
      isControl: false,
    },
    {
      code: "6200",
      name: "Inventory Adjustment Expense",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Losses/Shrinkage from stock adjustments",
      isPostable: true,
      isControl: false,
    },
    {
      code: "6300",
      name: "Production Variance",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Difference between standard and actual production costs",
      isPostable: true,
      isControl: false,
    },
  ];

  // Sort accounts to ensure parents are created before children
  const sortedAccounts = [...accounts].sort((a, b) => {
    // If a has a parent and b doesn't, a comes after b
    if (a.parentCode && !b.parentCode) return 1;
    if (!a.parentCode && b.parentCode) return -1;
    // If both have parents, compare by code (numeric)
    if (a.parentCode && b.parentCode) {
      return parseInt(a.code) - parseInt(b.code);
    }
    // If neither has parent, compare by code
    return parseInt(a.code) - parseInt(b.code);
  });

  // First, create/update all accounts without parent relationships
  const accountMap = new Map<string, { id: string; code: string }>();

  console.log("📝 Creating/updating accounts...\n");

  for (const account of sortedAccounts) {
    // Check if account already exists
    const existing = await prisma.chartOfAccount.findUnique({
      where: { code: account.code },
      select: { id: true },
    });

    const accountId = existing?.id || generateAccountId();

    const upserted = await prisma.chartOfAccount.upsert({
      where: { code: account.code },
      update: {
        name: account.name,
        type: account.type,
        description: account.description,
        isControl: account.isControl,
        status: "active",
        // Note: We don't update parentId here to avoid breaking existing hierarchies
        // Only set parentId if the account doesn't exist yet
      },
      create: {
        id: accountId,
        code: account.code,
        name: account.name,
        type: account.type,
        description: account.description,
        isControl: account.isControl,
        status: "active",
        parentId: null, // Will be set later if needed
        createdBy: creator.id,
        updatedAt: new Date(),
      },
    });

    accountMap.set(account.code, { id: upserted.id, code: upserted.code });
    
    const postableStatus = account.isPostable ? "Postable" : "Group";
    console.log(
      `✅ ${account.code.padEnd(6)} ${account.name.padEnd(50)} (${account.type.padEnd(9)} ${postableStatus})`
    );
  }

  // Now update parent relationships only for accounts that don't exist yet
  // This ensures we don't break existing hierarchies
  console.log("\n🔗 Linking parent-child relationships...\n");

  for (const account of sortedAccounts) {
    if (account.parentCode) {
      const parent = accountMap.get(account.parentCode);
      if (parent) {
        // Only update if parentId is currently null (new account)
        const existing = await prisma.chartOfAccount.findUnique({
          where: { code: account.code },
          select: { parentId: true },
        });

        if (existing && existing.parentId === null) {
          await prisma.chartOfAccount.update({
            where: { code: account.code },
            data: { parentId: parent.id },
          });
          console.log(`  ↳ Linked ${account.code} (${account.name}) to parent ${account.parentCode}`);
        }
      }
    }
  }

  // Summary statistics
  const stats = {
    ASSET: accounts.filter((a) => a.type === "ASSET").length,
    LIABILITY: accounts.filter((a) => a.type === "LIABILITY").length,
    EQUITY: accounts.filter((a) => a.type === "EQUITY").length,
    REVENUE: accounts.filter((a) => a.type === "REVENUE").length,
    EXPENSE: accounts.filter((a) => a.type === "EXPENSE").length,
  };

  const postableCount = accounts.filter((a) => a.isPostable).length;
  const groupCount = accounts.filter((a) => !a.isPostable).length;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ SUCCESS: Seeded ${accounts.length} Chart of Account(s)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📊 Account Summary by Type:");
  console.log(`   • Assets:     ${stats.ASSET.toString().padStart(2)} accounts`);
  console.log(`   • Liabilities: ${stats.LIABILITY.toString().padStart(2)} accounts`);
  console.log(`   • Equity:    ${stats.EQUITY.toString().padStart(2)} accounts`);
  console.log(`   • Revenue:   ${stats.REVENUE.toString().padStart(2)} accounts`);
  console.log(`   • Expenses:  ${stats.EXPENSE.toString().padStart(2)} accounts`);
  console.log("\n📋 Account Classification:");
  console.log(`   • Postable:  ${postableCount.toString().padStart(2)} accounts (can have transactions)`);
  console.log(`   • Groups:    ${groupCount.toString().padStart(2)} accounts (parent/header accounts)`);
  console.log("\n💡 Note: INCOME type accounts are mapped to REVENUE in the database");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: Seeding Chart of Accounts failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("💥 Fatal error details:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
