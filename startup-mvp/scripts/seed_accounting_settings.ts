
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedSettings() {
  console.log("Seeding accounting settings...");

  // 1. Ensure Accounts Exist
  const accountsData = [
    { code: "1010", name: "Ready Products Inventory", type: "ASSET", accountGroup: "Current Assets" },
    { code: "1020", name: "Raw Material Inventory", type: "ASSET", accountGroup: "Current Assets" },
    { code: "4010", name: "Inventory Adjustment Gain", type: "REVENUE", accountGroup: "Other Income" },
    { code: "5010", name: "Inventory Adjustment Loss", type: "EXPENSE", accountGroup: "Direct Expenses" },
    // Add default Purchase/Sales/Payment accounts to provide a complete robust seed if needed
    { code: "5020", name: "Cost of Goods Sold", type: "EXPENSE", accountGroup: "Direct Expenses" },
    { code: "4000", name: "Sales Revenue", type: "REVENUE", accountGroup: "Sales Accounts" },
    { code: "1001", name: "Cash on Hand", type: "ASSET", accountGroup: "Cash & Bank" },
  ];

  const accountIds: Record<string, string> = {};

  // 0. Fetch a user to be the creator
  const user = await prisma.user.findFirst();
  if (!user) {
      console.error("No user found to assign as creator.");
      process.exit(1);
  }

  for (const acc of accountsData) {
    // Check if account exists by code or name
    let account = await prisma.chartOfAccount.findFirst({
      where: { 
        OR: [{ code: acc.code }, { name: acc.name }]
      }
    });

    if (!account) {
      console.log(`Creating account: ${acc.name}`);
      account = await prisma.chartOfAccount.create({
        data: {
          code: acc.code,
          name: acc.name,
          type: acc.type as any, // Cast to enum
          status: "active",
          createdBy: user.id // Using the fetched user ID
        }
      });
    } else {
        console.log(`Account exists: ${acc.name}`);
    }
    accountIds[acc.name] = account.id;
  }

  // 2. Create Global Settings
  const settingsData = {
    purchase: {
      inventoryAccountId: accountIds["Raw Material Inventory"], // Defaulting to RM
      payableAccountId: "", // Optional
    },
    sales: {
      revenueAccountId: accountIds["Sales Revenue"],
      receivableAccountId: "",
      cogsAccountId: accountIds["Cost of Goods Sold"],
      finishedGoodsInventoryAccountId: accountIds["Ready Products Inventory"],
    },
    production: {
       // Placeholder IDs if we don't have WIP accounts yet
      consumptionWipAccountId: accountIds["Raw Material Inventory"], 
      consumptionRawMaterialInventoryId: accountIds["Raw Material Inventory"],
      completionFinishedGoodsInventoryId: accountIds["Ready Products Inventory"],
      completionWipAccountId: accountIds["Ready Products Inventory"],
    },
    inventoryAdjustment: {
      positiveFgInventoryId: accountIds["Ready Products Inventory"],
      positiveRmInventoryId: accountIds["Raw Material Inventory"],
      positiveAdjustmentGainId: accountIds["Inventory Adjustment Gain"],
      negativeFgInventoryId: accountIds["Ready Products Inventory"],
      negativeRmInventoryId: accountIds["Raw Material Inventory"],
      negativeAdjustmentExpenseId: accountIds["Inventory Adjustment Loss"],
    },
    payment: {
      cashAccountId: accountIds["Cash on Hand"],
      payableAccountId: "",
    },
    receipt: {
      cashAccountId: accountIds["Cash on Hand"],
      receivableAccountId: "",
    },
    contra: {
      fromAccountId: accountIds["Cash on Hand"],
      toAccountId: accountIds["Cash on Hand"],
    },
  };

  const code = "ACCOUNTING_OPERATIONS";
  
  // Upsert Global Settings
  const existing = await prisma.settings.findFirst({
    where: { code, isGlobal: true }
  });

  if (existing) {
      console.log("Updating existing global settings...");
      await prisma.settings.update({
          where: { id: existing.id },
          data: { settings: settingsData }
      });
  } else {
      console.log("Creating new global settings...");
      await prisma.settings.create({
          data: {
              code,
              title: "Accounting Operations",
              category: "accounting",
              isGlobal: true,
              isActive: true,
              settings: settingsData
          }
      });
  }

  console.log("Settings seeded successfully.");
}

seedSettings()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
