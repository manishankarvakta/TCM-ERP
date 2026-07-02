import { PrismaClient, AccountType } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function generateAccountId(): string {
  return `coa_${Date.now()}_${randomBytes(8).toString("hex")}`;
}

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
      "No users found in DB. Cannot seed ChartOfAccount because ChartOfAccount.createdBy is required. Create a user first, then re-run the seed."
    );
  }

  console.log(`👤 Using creator user: ${creator.email ?? creator.id}\n`);

  const accounts = [
  {
    "code": "1000",
    "name": "Assets",
    "type": "ASSET",
    "parentCode": null,
    "description": "Root asset group",
    "isControl": false
  },
  {
    "code": "1010",
    "name": "DBBL Card",
    "type": "ASSET",
    "parentCode": "1200",
    "description": "DBBL Card",
    "isControl": false
  },
  {
    "code": "1100",
    "name": "Current Assets",
    "type": "ASSET",
    "parentCode": "1000",
    "description": "Short-term assets",
    "isControl": false
  },
  {
    "code": "1110",
    "name": "Cash on Hand",
    "type": "ASSET",
    "parentCode": "1100",
    "description": "Physical cash available",
    "isControl": false
  },
  {
    "code": "1120",
    "name": "Petty Cash",
    "type": "ASSET",
    "parentCode": "1100",
    "description": "Small cash expenses",
    "isControl": false
  },
  {
    "code": "1200",
    "name": "Bank Accounts",
    "type": "ASSET",
    "parentCode": "1100",
    "description": "All bank accounts",
    "isControl": false
  },
  {
    "code": "1210",
    "name": "Bank – Primary Account",
    "type": "ASSET",
    "parentCode": "1200",
    "description": "Main bank account",
    "isControl": false
  },
  {
    "code": "1211",
    "name": "DBBL - Uttara",
    "type": "ASSET",
    "parentCode": "1200",
    "description": "",
    "isControl": false
  },
  {
    "code": "1220",
    "name": "Bank – Secondary Account",
    "type": "ASSET",
    "parentCode": "1200",
    "description": "Secondary bank account",
    "isControl": false
  },
  {
    "code": "1300",
    "name": "Digital Wallets",
    "type": "ASSET",
    "parentCode": "1100",
    "description": "Mobile and digital wallets",
    "isControl": false
  },
  {
    "code": "1310",
    "name": "bKash Wallet",
    "type": "ASSET",
    "parentCode": "1300",
    "description": "bKash mobile wallet",
    "isControl": false
  },
  {
    "code": "1320",
    "name": "Nagad Wallet",
    "type": "ASSET",
    "parentCode": "1300",
    "description": "Nagad mobile wallet",
    "isControl": false
  },
  {
    "code": "1330",
    "name": "Rocket Wallet",
    "type": "ASSET",
    "parentCode": "1300",
    "description": "Rocket mobile wallet",
    "isControl": false
  },
  {
    "code": "1400",
    "name": "Receivables",
    "type": "ASSET",
    "parentCode": "1100",
    "description": "Amounts receivable",
    "isControl": true
  },
  {
    "code": "1410",
    "name": "Accounts Receivable",
    "type": "ASSET",
    "parentCode": "1400",
    "description": "Customer balances (control account)",
    "isControl": true
  },
  {
    "code": "1500",
    "name": "Other Current Assets",
    "type": "ASSET",
    "parentCode": "1100",
    "description": "Other short-term assets",
    "isControl": false
  },
  {
    "code": "1510",
    "name": "Advance to Suppliers",
    "type": "ASSET",
    "parentCode": "1500",
    "description": "Supplier advances",
    "isControl": false
  },
  {
    "code": "1520",
    "name": "Prepaid Expenses",
    "type": "ASSET",
    "parentCode": "1500",
    "description": "Expenses paid in advance",
    "isControl": false
  },
  {
    "code": "1600",
    "name": "Inventory",
    "type": "ASSET",
    "parentCode": "1000",
    "description": "Inventory assets",
    "isControl": true
  },
  {
    "code": "1610",
    "name": "Inventory Stock",
    "type": "ASSET",
    "parentCode": "1600",
    "description": "Goods held for sale",
    "isControl": true
  },
  {
    "code": "1620",
    "name": "Raw Material Inventory",
    "type": "ASSET",
    "parentCode": "1600",
    "description": "Raw materials inventory",
    "isControl": true
  },
  {
    "code": "1630",
    "name": "Finished Goods Inventory",
    "type": "ASSET",
    "parentCode": "1600",
    "description": "Finished goods inventory",
    "isControl": true
  },
  {
    "code": "1640",
    "name": "Retail Inventory",
    "type": "ASSET",
    "parentCode": "1600",
    "description": "Retail items inventory",
    "isControl": true
  },
  {
    "code": "1650",
    "name": "Work In Progress (WIP)",
    "type": "ASSET",
    "parentCode": "1600",
    "description": "Value of items in production",
    "isControl": true
  },
  {
    "code": "1700",
    "name": "Fixed Assets",
    "type": "ASSET",
    "parentCode": "1000",
    "description": "Long-term assets",
    "isControl": false
  },
  {
    "code": "1710",
    "name": "Furniture & Fixtures",
    "type": "ASSET",
    "parentCode": "1700",
    "description": "Furniture and fixtures",
    "isControl": false
  },
  {
    "code": "1720",
    "name": "Office Equipment",
    "type": "ASSET",
    "parentCode": "1700",
    "description": "Computers and equipment",
    "isControl": false
  },
  {
    "code": "1730",
    "name": "Vehicles",
    "type": "ASSET",
    "parentCode": "1700",
    "description": "Company vehicles",
    "isControl": false
  },
  {
    "code": "1790",
    "name": "Accumulated Depreciation",
    "type": "ASSET",
    "parentCode": "1700",
    "description": "Depreciation group",
    "isControl": false
  },
  {
    "code": "1791",
    "name": "Accumulated Depreciation – Furniture",
    "type": "ASSET",
    "parentCode": "1790",
    "description": "Depreciation for furniture",
    "isControl": false
  },
  {
    "code": "1792",
    "name": "Accumulated Depreciation – Equipment",
    "type": "ASSET",
    "parentCode": "1790",
    "description": "Depreciation for equipment",
    "isControl": false
  },
  {
    "code": "1793",
    "name": "Accumulated Depreciation – Vehicles",
    "type": "ASSET",
    "parentCode": "1790",
    "description": "Depreciation for vehicles",
    "isControl": false
  },
  {
    "code": "2000",
    "name": "Liabilities",
    "type": "LIABILITY",
    "parentCode": null,
    "description": "Root liability group",
    "isControl": false
  },
  {
    "code": "2100",
    "name": "Current Liabilities",
    "type": "LIABILITY",
    "parentCode": "2000",
    "description": "Short-term obligations",
    "isControl": true
  },
  {
    "code": "2110",
    "name": "Accounts Payable",
    "type": "LIABILITY",
    "parentCode": "2100",
    "description": "Supplier balances (control account)",
    "isControl": true
  },
  {
    "code": "2120",
    "name": "Accrued Expenses",
    "type": "LIABILITY",
    "parentCode": "2100",
    "description": "Expenses incurred but unpaid",
    "isControl": false
  },
  {
    "code": "2130",
    "name": "Salaries Payable",
    "type": "LIABILITY",
    "parentCode": "2100",
    "description": "Salaries owed to staff",
    "isControl": false
  },
  {
    "code": "2140",
    "name": "Tax Payable",
    "type": "LIABILITY",
    "parentCode": "2100",
    "description": "Taxes owed to authorities",
    "isControl": false
  },
  {
    "code": "2150",
    "name": "Employer PF Payable",
    "type": "LIABILITY",
    "parentCode": "2100",
    "description": "Company's PF contribution owed to fund",
    "isControl": false
  },
  {
    "code": "3000",
    "name": "Equity",
    "type": "EQUITY",
    "parentCode": null,
    "description": "Owner's equity",
    "isControl": false
  },
  {
    "code": "3110",
    "name": "Owner's Capital",
    "type": "EQUITY",
    "parentCode": "3000",
    "description": "Owner investment",
    "isControl": false
  },
  {
    "code": "3120",
    "name": "Retained Earnings",
    "type": "EQUITY",
    "parentCode": "3000",
    "description": "Accumulated profits",
    "isControl": false
  },
  {
    "code": "3130",
    "name": "Current Year Profit/Loss",
    "type": "EQUITY",
    "parentCode": "3000",
    "description": "System-calculated net result",
    "isControl": false
  },
  {
    "code": "4000",
    "name": "Income",
    "type": "REVENUE",
    "parentCode": null,
    "description": "Revenue accounts",
    "isControl": false
  },
  {
    "code": "4010",
    "name": "Inventory Adjustment Gain",
    "type": "REVENUE",
    "parentCode": null,
    "description": "",
    "isControl": false
  },
  {
    "code": "4110",
    "name": "Sales Revenue",
    "type": "REVENUE",
    "parentCode": "4000",
    "description": "Product sales income",
    "isControl": false
  },
  {
    "code": "4120",
    "name": "Service Revenue",
    "type": "REVENUE",
    "parentCode": "4000",
    "description": "Service income",
    "isControl": false
  },
  {
    "code": "4130",
    "name": "Inventory Adjustment Revenue",
    "type": "REVENUE",
    "parentCode": "4000",
    "description": "Gains from stock adjustments",
    "isControl": false
  },
  {
    "code": "4190",
    "name": "Other Income",
    "type": "REVENUE",
    "parentCode": "4000",
    "description": "Miscellaneous income",
    "isControl": false
  },
  {
    "code": "5000",
    "name": "Cost of Goods Sold",
    "type": "EXPENSE",
    "parentCode": null,
    "description": "Direct cost of sales",
    "isControl": false
  },
  {
    "code": "5010",
    "name": "Inventory Adjustment Loss",
    "type": "EXPENSE",
    "parentCode": null,
    "description": "",
    "isControl": false
  },
  {
    "code": "5110",
    "name": "Cost of Goods Sold",
    "type": "EXPENSE",
    "parentCode": "5000",
    "description": "Cost of sold inventory",
    "isControl": false
  },
  {
    "code": "6000",
    "name": "Operating Expenses",
    "type": "EXPENSE",
    "parentCode": null,
    "description": "Operating costs",
    "isControl": false
  },
  {
    "code": "6110",
    "name": "Rent Expense",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Office rent",
    "isControl": false
  },
  {
    "code": "6120",
    "name": "Utilities Expense",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Electricity, water, gas",
    "isControl": false
  },
  {
    "code": "6130",
    "name": "Salary Expense",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Employee salaries",
    "isControl": false
  },
  {
    "code": "6140",
    "name": "Office Supplies",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Stationery & supplies",
    "isControl": false
  },
  {
    "code": "6150",
    "name": "Internet & Communication",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Internet and phone",
    "isControl": false
  },
  {
    "code": "6160",
    "name": "Transportation Expense",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Travel & transport",
    "isControl": false
  },
  {
    "code": "6170",
    "name": "Mobile Wallet Charges",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "bKash/Nagad fees",
    "isControl": false
  },
  {
    "code": "6180",
    "name": "Bank Charges",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Bank service fees",
    "isControl": false
  },
  {
    "code": "6190",
    "name": "Miscellaneous Expense",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Other small expenses",
    "isControl": false
  },
  {
    "code": "6200",
    "name": "Inventory Adjustment Expense",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Losses/Shrinkage from stock adjustments",
    "isControl": false
  },
  {
    "code": "6210",
    "name": "Employer PF Expense",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Company's matching PF contribution cost",
    "isControl": false
  },
  {
    "code": "6220",
    "name": "Festival Bonus Expense",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Festival/Eid bonus cost expense",
    "isControl": false
  },
  {
    "code": "6300",
    "name": "Production Variance",
    "type": "EXPENSE",
    "parentCode": "6000",
    "description": "Difference between standard and actual production costs",
    "isControl": false
  }
];

  // Sort accounts to ensure parents are created before children
  const sortedAccounts = [...accounts].sort((a, b) => {
    if (a.parentCode && !b.parentCode) return 1;
    if (!a.parentCode && b.parentCode) return -1;
    if (a.parentCode && b.parentCode) {
      return parseInt(a.code) - parseInt(b.code);
    }
    return parseInt(a.code) - parseInt(b.code);
  });

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
        type: account.type as AccountType,
        description: account.description,
        isControl: account.isControl,
        status: "active",
      },
      create: {
        id: accountId,
        code: account.code,
        name: account.name,
        type: account.type as AccountType,
        description: account.description,
        isControl: account.isControl,
        status: "active",
        parentId: null,
        createdBy: creator.id,
        updatedAt: new Date(),
      },
    });

    accountMap.set(account.code, { id: upserted.id, code: upserted.code });
    console.log(`✅ ${account.code.padEnd(8)} ${account.name.padEnd(50)} (${account.type})`);
  }

  console.log("\n🔗 Linking parent-child relationships...\n");

  for (const account of sortedAccounts) {
    if (account.parentCode) {
      const parent = accountMap.get(account.parentCode);
      if (parent) {
        const existing = await prisma.chartOfAccount.findUnique({
          where: { code: account.code },
          select: { parentId: true },
        });

        if (existing && existing.parentId === null) {
          await prisma.chartOfAccount.update({
            where: { code: account.code },
            data: { parentId: parent.id },
          });
          console.log(`  ↳ Linked ${account.code} to parent ${account.parentCode}`);
        }
      }
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ SUCCESS: Seeded ${accounts.length} Chart of Accounts`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ ERROR: Seeding Chart of Accounts failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
