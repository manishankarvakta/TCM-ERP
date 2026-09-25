import { PrismaClient, AccountType } from "@prisma/client";
import { ACCOUNTING_OPERATIONS_KEY } from "../types/accounting-settings";

const prisma = new PrismaClient();

export async function setupLoyaltyPointsCOA() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 Setting up Loyalty Points Chart of Account & Default Mapping...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1. Fetch user to assign as creator if new record is created
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
    throw new Error("No user found in database. Create an admin/user first.");
  }

  console.log(`👤 Using creator: ${creator.email ?? creator.id}`);

  // 2. Find or create parent Income account if needed
  let parentIncome = await prisma.chartOfAccount.findFirst({
    where: {
      OR: [{ code: "4000" }, { name: "Income" }, { name: "Revenue" }],
      type: "REVENUE",
    },
  });

  // 3. Find or create the Loyalty Points Redemption Discount account
  const coaData = {
    code: "4140",
    name: "Loyalty Points Redemption Discount",
    type: "REVENUE" as AccountType,
    description: "Customer loyalty points redemption discount",
    isPostable: true,
    isControl: false,
    status: "active",
  };

  let loyaltyCoa = await prisma.chartOfAccount.findFirst({
    where: {
      OR: [
        { code: coaData.code },
        { name: coaData.name },
        { name: "Loyalty Points Discount" },
        { name: "Points Discount" },
      ],
    },
  });

  if (!loyaltyCoa) {
    console.log(`Creating Chart of Account: ${coaData.name} (${coaData.code})...`);
    loyaltyCoa = await prisma.chartOfAccount.create({
      data: {
        code: coaData.code,
        name: coaData.name,
        type: coaData.type,
        description: coaData.description,
        isPostable: coaData.isPostable,
        isControl: coaData.isControl,
        status: coaData.status,
        parentId: parentIncome?.id || null,
        createdBy: creator.id,
      },
    });
    console.log(`✅ Created COA Account ID: ${loyaltyCoa.id}`);
  } else {
    console.log(`ℹ️ Existing COA Account found: ${loyaltyCoa.name} (ID: ${loyaltyCoa.id})`);
  }

  // 4. Update the default global Accounting Operation Settings
  const settingsKeys = [ACCOUNTING_OPERATIONS_KEY, "ACCOUNTING_OPERATIONS"];

  for (const code of settingsKeys) {
    const existingSetting = await prisma.settings.findFirst({
      where: {
        code,
        isGlobal: true,
      },
    });

    if (existingSetting && existingSetting.settings) {
      const currentSettings = existingSetting.settings as any;
      const updatedSales = {
        ...currentSettings.sales,
        loyaltyDiscountAccountId: loyaltyCoa.id,
      };

      const updatedSettings = {
        ...currentSettings,
        sales: updatedSales,
      };

      await prisma.settings.update({
        where: { id: existingSetting.id },
        data: {
          settings: updatedSettings,
        },
      });

      console.log(`✅ Updated existing global setting [${code}] with loyaltyDiscountAccountId: ${loyaltyCoa.id}`);
    } else if (code === ACCOUNTING_OPERATIONS_KEY) {
      // Create new settings record if not found
      console.log(`Creating default global setting [${code}]...`);
      await prisma.settings.create({
        data: {
          code,
          title: "Accounting Operations",
          category: "accounting",
          isGlobal: true,
          isActive: true,
          createdBy: creator.id,
          settings: {
            purchase: { inventoryAccountId: "", payableAccountId: "" },
            sales: {
              revenueAccountId: "",
              receivableAccountId: "",
              cogsAccountId: "",
              finishedGoodsInventoryAccountId: "",
              couponDiscountAccountId: "",
              salesDiscountAccountId: "",
              loyaltyDiscountAccountId: loyaltyCoa.id,
              roundOffAccountId: "",
            },
            production: {
              consumptionWipAccountId: "",
              consumptionRawMaterialInventoryId: "",
              completionFinishedGoodsInventoryId: "",
              completionWipAccountId: "",
            },
            inventoryAdjustment: {
              positiveFgInventoryId: "",
              positiveRmInventoryId: "",
              positiveAdjustmentGainId: "",
              negativeFgInventoryId: "",
              negativeRmInventoryId: "",
              negativeAdjustmentExpenseId: "",
            },
            payment: { cashAccountId: "", payableAccountId: "" },
            receipt: { cashAccountId: "", receivableAccountId: "" },
            contra: { fromAccountId: "", toAccountId: "" },
          },
        },
      });
      console.log(`✅ Created default setting [${code}] with loyaltyDiscountAccountId: ${loyaltyCoa.id}`);
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 SUCCESS: Loyalty Points COA & Default Settings Assigned Successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  return loyaltyCoa;
}

if (require.main === module) {
  setupLoyaltyPointsCOA()
    .catch((err) => {
      console.error("❌ Failed to setup loyalty points COA:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
