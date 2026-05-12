import { prisma } from "../lib/prisma";
import { ACCOUNTING_OPERATIONS_KEY } from "../types/accounting-settings";

async function seedAccountingSettings() {
  const settings = {
    purchase: {
      inventoryAccountId: "coa_1778501730749_f79eee304ce0e42b",
      payableAccountId: "coa_1778501730829_a112341041a78291",
    },
    sales: {
      revenueAccountId: "coa_1778501730866_f1a7c0001986e0fc",
      receivableAccountId: "coa_1778501730729_2551ca28e441a0e8",
      cogsAccountId: "coa_1778501730659_33f53eb96dd187f1",
      finishedGoodsInventoryAccountId: "coa_1778501730765_2a6065328440c5cb",
    },
    production: {
      consumptionWipAccountId: "coa_1778501730775_cd5f275a21a24793",
      consumptionRawMaterialInventoryId: "coa_1778501730759_0c0ab13719bd2930",
      completionFinishedGoodsInventoryId: "coa_1778501730765_2a6065328440c5cb",
      completionWipAccountId: "coa_1778501730775_cd5f275a21a24793",
    },
    inventoryAdjustment: {
      positiveFgInventoryId: "coa_1778501730765_2a6065328440c5cb",
      positiveRmInventoryId: "coa_1778501730759_0c0ab13719bd2930",
      positiveAdjustmentGainId: "coa_1778501730876_b9962b2d091da9e3",
      negativeFgInventoryId: "coa_1778501730765_2a6065328440c5cb",
      negativeRmInventoryId: "coa_1778501730759_0c0ab13719bd2930",
      negativeAdjustmentExpenseId: "coa_1778501730942_651898e34a0821ce",
    },
    payment: {
      cashAccountId: "coa_1778501730674_3c197f444d4d1e66",
      payableAccountId: "coa_1778501730829_a112341041a78291",
    },
    receipt: {
      cashAccountId: "coa_1778501730674_3c197f444d4d1e66",
      receivableAccountId: "coa_1778501730729_2551ca28e441a0e8",
    },
    contra: {
      fromAccountId: "",
      toAccountId: "",
    },
  };

  // Upsert global setting
  await prisma.settings.upsert({
    where: {
      id: "global-accounting-ops", // Deterministic ID for this seed
    },
    update: {
      settings: settings as any,
      isGlobal: true,
      isActive: true,
    },
    create: {
      id: "global-accounting-ops",
      code: ACCOUNTING_OPERATIONS_KEY,
      category: "accounting",
      title: "Global Accounting Operation Mappings",
      settings: settings as any,
      isGlobal: true,
      isActive: true,
      userId: null,
    },
  });

  console.log("Global accounting settings seeded successfully!");
}

seedAccountingSettings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
