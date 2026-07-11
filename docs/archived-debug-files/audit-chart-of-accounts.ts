
import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";

async function auditChartOfAccounts() {
  console.log("--- CHART OF ACCOUNTS AUDIT ---\n");

  const accounts = await prisma.chartOfAccount.findMany({
    orderBy: [{ type: 'asc' }, { code: 'asc' }]
  });

  // 1. Group by Type
  const grouped: Record<string, typeof accounts> = {
    ASSET: [],
    LIABILITY: [],
    EQUITY: [],
    REVENUE: [],
    EXPENSE: []
  };

  accounts.forEach(acc => {
    if (grouped[acc.type]) {
      grouped[acc.type].push(acc);
    } else {
      // Handle potential unknown types if enum changed
      grouped[acc.type] = [acc];
    }
  });

  // Print Grouped Accounts
  Object.keys(grouped).forEach(type => {
    console.log(`\n### ${type}`);
    if (grouped[type].length === 0) console.log("  (No accounts)");
    grouped[type].forEach(acc => {
      console.log(`  [${acc.code}] ${acc.name} (${acc.status})`);
    });
  });

  // 2. Identify Control Accounts
  const requiredControlAccounts = [
    "Inventory Asset",
    "Accounts Receivable",
    "Accounts Payable",
    "Cash", // General Cash or specific?
    "Bank", // General Bank or specific?
    "Sales", // Revenue Control
    "Cost of Goods Sold" // Expense Control
  ];

  /* 
     We look for exact name matches or strong indicators. 
     Real-world apps might use a 'isSystem' flag or 'code' range, 
     but here we rely on names as per previous steps.
  */
  
  console.log("\n--- CONTROL ACCOUNT VERIFICATION ---");
  const accountMap = new Map(accounts.map(a => [a.name.toLowerCase(), a]));

  const missing: string[] = [];
  const found: string[] = [];

  // Helper to check leniently
  const check = (name: string) => {
    // Exact match trial
    let match = accountMap.get(name.toLowerCase());
    
    // If not found, try partials for broad terms like "Bank"
    if (!match) {
        const potential = accounts.find(a => a.name.toLowerCase().includes(name.toLowerCase()));
        if (potential) match = potential;
    }

    if (match) {
      console.log(`✅ ${name}: Found [${match.code}] ${match.name} (${match.type})`);
      found.push(name);
    } else {
      console.log(`❌ ${name}: MISSING`);
      missing.push(name);
    }
  };

  requiredControlAccounts.forEach(check);

  // 3. ERP Specific Checks
  console.log("\n--- ERP READINESS CHECK ---");
  const erpChecks = [
    "Inventory Adjustment Gain/Loss",
    "Work In Progress", // WIP
    "Production Variance"
  ];

  erpChecks.forEach(check);

  // 4. Duplicate Check (by Name)
  console.log("\n--- DUPLICATE CHECK ---");
  const nameCounts: Record<string, number> = {};
  accounts.forEach(a => {
    const n = a.name.toLowerCase();
    nameCounts[n] = (nameCounts[n] || 0) + 1;
  });
  
  const duplicates = Object.entries(nameCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
      duplicates.forEach(([name, count]) => {
          console.log(`⚠️ Duplicate Name: "${name}" appears ${count} times.`);
      });
  } else {
      console.log("✅ No duplicate names found.");
  }
}

auditChartOfAccounts()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
