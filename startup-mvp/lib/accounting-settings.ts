/**
 * Accounting Operation Settings Utilities
 * 
 * Helper functions for retrieving and validating operation-based accounting settings.
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type {
  AccountingOperationSettings,
  PurchaseAccounts,
  SalesAccounts,
  ProductionAccounts,
  InventoryAdjustmentAccounts,
  PaymentAccounts,
  ReceiptAccounts,
  ContraAccounts,
} from "@/types/accounting-settings";
import { ACCOUNTING_OPERATIONS_KEY } from "@/types/accounting-settings";
import {
  AccountMappingMissingError,
  InvalidAccountError,
  AccountingSettingsNotConfiguredError,
} from "@/lib/errors/accounting-errors";

/**
 * Get accounting operation settings
 * Returns typed defaults if missing (empty strings)
 * Never returns undefined fields
 */
export async function getAccountingOperationSettings(): Promise<AccountingOperationSettings> {
  try {
    const session = await auth();
    const defaultSettings = createDefaultSettings();

    if (!session?.user) {
      return defaultSettings;
    }

    // Try user-specific settings first
    const userSetting = await prisma.settings.findFirst({
      where: {
        code: ACCOUNTING_OPERATIONS_KEY,
        userId: session.user.id,
        isActive: true,
      },
      select: {
        settings: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (userSetting && userSetting.settings) {
      return mergeWithDefaults(userSetting.settings as Partial<AccountingOperationSettings>, defaultSettings);
    }

    // Fallback to global settings
    const globalSetting = await prisma.settings.findFirst({
      where: {
        code: ACCOUNTING_OPERATIONS_KEY,
        userId: null,
        isGlobal: true,
        isActive: true,
      },
      select: {
        settings: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (globalSetting && globalSetting.settings) {
      // console.log("getAccountOpSettings: Found global settings", globalSetting.settings);
      return mergeWithDefaults(globalSetting.settings as Partial<AccountingOperationSettings>, defaultSettings);
    }

    // console.log("getAccountOpSettings: No settings found, returning defaults");

    return defaultSettings;
  } catch (error) {
    try {
      const globalSetting = await prisma.settings.findFirst({
        where: {
          code: ACCOUNTING_OPERATIONS_KEY,
          userId: null,
          isGlobal: true,
          isActive: true,
        },
        select: {
          settings: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (globalSetting && globalSetting.settings) {
        return mergeWithDefaults(
          globalSetting.settings as Partial<AccountingOperationSettings>,
          createDefaultSettings()
        );
      }
    } catch (fallbackError) {
      console.error("Fallback error getting accounting settings:", fallbackError);
    }
    return createDefaultSettings();
  }
}

/**
 * Get accounting operation settings with metadata (isGlobal, etc.)
 */
export async function getAccountingOperationSettingsFull(): Promise<{ settings: AccountingOperationSettings; isGlobal: boolean } | null> {
  try {
    const session = await auth();
    if (!session?.user) return null;

    // Try user-specific settings first
    const userSetting = await prisma.settings.findFirst({
      where: {
        code: ACCOUNTING_OPERATIONS_KEY,
        userId: session.user.id,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (userSetting && userSetting.settings) {
      const defaultSettings = createDefaultSettings();
      return {
        settings: mergeWithDefaults(userSetting.settings as Partial<AccountingOperationSettings>, defaultSettings),
        isGlobal: userSetting.isGlobal,
      };
    }

    // Fallback to global settings
    const globalSetting = await prisma.settings.findFirst({
      where: {
        code: ACCOUNTING_OPERATIONS_KEY,
        userId: null,
        isGlobal: true,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (globalSetting && globalSetting.settings) {
      const defaultSettings = createDefaultSettings();
      return {
        settings: mergeWithDefaults(globalSetting.settings as Partial<AccountingOperationSettings>, defaultSettings),
        isGlobal: true,
      };
    }

    return {
      settings: createDefaultSettings(),
      isGlobal: false,
    };
  } catch (error) {
    console.error("getAccountingOperationSettingsFull error:", error);
    return null;
  }
}

/**
 * Helper to create default settings structure
 */
function createDefaultSettings(): AccountingOperationSettings {
  return {
    purchase: {
      inventoryAccountId: "",
      payableAccountId: "",
    },
    sales: {
      revenueAccountId: "",
      receivableAccountId: "",
      cogsAccountId: "",
      finishedGoodsInventoryAccountId: "",
      couponDiscountAccountId: "",
      salesDiscountAccountId: "",
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
    payment: {
      cashAccountId: "",
      payableAccountId: "",
    },
    receipt: {
      cashAccountId: "",
      receivableAccountId: "",
    },
    contra: {
      fromAccountId: "",
      toAccountId: "",
    },
    payroll: {
      salaryExpenseAccountId: "",
      defaultSalaryPayableAccountId: "",
      taxPayableAccountId: "",
      pfPayableAccountId: "",
      defaultAdvanceAccountId: "",
      employerPfExpenseAccountId: "",
      employerPfPayableAccountId: "",
      festivalBonusExpenseAccountId: "",
    },
  };
}

/**
 * Merge partial settings with defaults to ensure all fields are present
 */
function mergeWithDefaults(
  partial: Partial<AccountingOperationSettings>,
  defaults: AccountingOperationSettings
): AccountingOperationSettings {
  return {
    purchase: {
      inventoryAccountId: partial.purchase?.inventoryAccountId || defaults.purchase.inventoryAccountId,
      payableAccountId: partial.purchase?.payableAccountId || defaults.purchase.payableAccountId,
    },
    sales: {
      revenueAccountId: partial.sales?.revenueAccountId || defaults.sales.revenueAccountId,
      receivableAccountId: partial.sales?.receivableAccountId || defaults.sales.receivableAccountId,
      cogsAccountId: partial.sales?.cogsAccountId || defaults.sales.cogsAccountId,
      finishedGoodsInventoryAccountId: partial.sales?.finishedGoodsInventoryAccountId || defaults.sales.finishedGoodsInventoryAccountId,
      couponDiscountAccountId: partial.sales?.couponDiscountAccountId || defaults.sales.couponDiscountAccountId,
      salesDiscountAccountId: partial.sales?.salesDiscountAccountId || defaults.sales.salesDiscountAccountId,
    },
    production: {
      consumptionWipAccountId: partial.production?.consumptionWipAccountId || defaults.production.consumptionWipAccountId,
      consumptionRawMaterialInventoryId: partial.production?.consumptionRawMaterialInventoryId || defaults.production.consumptionRawMaterialInventoryId,
      completionFinishedGoodsInventoryId: partial.production?.completionFinishedGoodsInventoryId || defaults.production.completionFinishedGoodsInventoryId,
      completionWipAccountId: partial.production?.completionWipAccountId || defaults.production.completionWipAccountId,
    },
    inventoryAdjustment: {
      positiveFgInventoryId: partial.inventoryAdjustment?.positiveFgInventoryId || defaults.inventoryAdjustment.positiveFgInventoryId,
      positiveRmInventoryId: partial.inventoryAdjustment?.positiveRmInventoryId || defaults.inventoryAdjustment.positiveRmInventoryId,
      positiveAdjustmentGainId: partial.inventoryAdjustment?.positiveAdjustmentGainId || defaults.inventoryAdjustment.positiveAdjustmentGainId,
      negativeFgInventoryId: partial.inventoryAdjustment?.negativeFgInventoryId || defaults.inventoryAdjustment.negativeFgInventoryId,
      negativeRmInventoryId: partial.inventoryAdjustment?.negativeRmInventoryId || defaults.inventoryAdjustment.negativeRmInventoryId,
      negativeAdjustmentExpenseId: partial.inventoryAdjustment?.negativeAdjustmentExpenseId || defaults.inventoryAdjustment.negativeAdjustmentExpenseId,
    },
    payment: {
      cashAccountId: partial.payment?.cashAccountId || defaults.payment.cashAccountId,
      payableAccountId: partial.payment?.payableAccountId || defaults.payment.payableAccountId,
    },
    receipt: {
      cashAccountId: partial.receipt?.cashAccountId || defaults.receipt.cashAccountId,
      receivableAccountId: partial.receipt?.receivableAccountId || defaults.receipt.receivableAccountId,
    },
    contra: {
      fromAccountId: partial.contra?.fromAccountId || defaults.contra.fromAccountId,
      toAccountId: partial.contra?.toAccountId || defaults.contra.toAccountId,
    },
    payroll: {
      salaryExpenseAccountId: partial.payroll?.salaryExpenseAccountId || defaults.payroll.salaryExpenseAccountId,
      defaultSalaryPayableAccountId: partial.payroll?.defaultSalaryPayableAccountId || defaults.payroll.defaultSalaryPayableAccountId,
      taxPayableAccountId: partial.payroll?.taxPayableAccountId || defaults.payroll.taxPayableAccountId,
      pfPayableAccountId: partial.payroll?.pfPayableAccountId || defaults.payroll.pfPayableAccountId,
      defaultAdvanceAccountId: partial.payroll?.defaultAdvanceAccountId || defaults.payroll.defaultAdvanceAccountId,
      employerPfExpenseAccountId: partial.payroll?.employerPfExpenseAccountId || defaults.payroll.employerPfExpenseAccountId,
      employerPfPayableAccountId: partial.payroll?.employerPfPayableAccountId || defaults.payroll.employerPfPayableAccountId,
      festivalBonusExpenseAccountId: partial.payroll?.festivalBonusExpenseAccountId || defaults.payroll.festivalBonusExpenseAccountId,
    },
  };
}


/**
 * Validate that an account exists and is active
 */
async function validateAccountExists(
  accountId: string,
  accountKey: string
): Promise<void> {
  const account = await prisma.chartOfAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!account) {
    throw new InvalidAccountError(accountId, accountKey);
  }

  if (account.status !== "active") {
    throw new InvalidAccountError(accountId, accountKey);
  }
}

/**
 * Get purchase accounts or throw error if not configured
 * Validates account types before returning
 */
export async function getPurchaseAccounts(): Promise<PurchaseAccounts> {
  const settings = await getAccountingOperationSettings();
  
  // We require Inventory Account ID, but Payable Account ID is optional (can use Supplier Ledger)
  if (!settings.purchase.inventoryAccountId) {
    console.log("getPurchaseAccounts: Missing inventory account", settings.purchase);
    throw new AccountingSettingsNotConfiguredError("Purchase Inventory");
  }

  // Identify accounts to validate
  const accountIdsToValidate = [settings.purchase.inventoryAccountId];
  if (settings.purchase.payableAccountId) {
    accountIdsToValidate.push(settings.purchase.payableAccountId);
  }

  // Validate accounts exist and have correct types
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      id: {
        in: accountIdsToValidate,
      },
      status: "active",
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

  // Validate inventory account
  const inventoryAccount = accountMap.get(settings.purchase.inventoryAccountId);
  if (!inventoryAccount) {
    throw new InvalidAccountError(settings.purchase.inventoryAccountId, "purchase.inventoryAccountId");
  }
  if (inventoryAccount.type !== "ASSET") {
    const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
    throw new AccountTypeValidationError(
      inventoryAccount.name,
      "ASSET" as any,
      inventoryAccount.type as any,
      "Purchase Inventory"
    );
  }

  // Validate payable account ONLY if it was set
  if (settings.purchase.payableAccountId) {
    const payableAccount = accountMap.get(settings.purchase.payableAccountId);
    if (!payableAccount) {
      throw new InvalidAccountError(settings.purchase.payableAccountId, "purchase.payableAccountId");
    }
    if (payableAccount.type !== "LIABILITY") {
      const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
      throw new AccountTypeValidationError(
        payableAccount.name,
        "LIABILITY" as any,
        payableAccount.type as any,
        "Purchase Accounts Payable"
      );
    }
  }

  return settings.purchase;
}

/**
 * Get sales accounts or throw error if not configured
 * Validates account types before returning
 */
export async function getSalesAccounts(): Promise<SalesAccounts> {
  const settings = await getAccountingOperationSettings();
  
  // Only require revenue account (minimum for sales)
  // receivableAccountId is optional - uses client's chartOfAccountId
  // COGS and FG Inventory are optional (only needed when processing COGS)
  if (!settings.sales.revenueAccountId) {
    throw new AccountMappingMissingError("revenueAccountId", "Sales");
  }

  // Identify accounts to validate (only validate accounts that are configured)
  const accountIdsToValidate = [settings.sales.revenueAccountId];
  
  if (settings.sales.receivableAccountId) {
    accountIdsToValidate.push(settings.sales.receivableAccountId);
  }
  
  if (settings.sales.cogsAccountId) {
    accountIdsToValidate.push(settings.sales.cogsAccountId);
  }
  
  if (settings.sales.finishedGoodsInventoryAccountId) {
    accountIdsToValidate.push(settings.sales.finishedGoodsInventoryAccountId);
  }

  // Validate accounts exist and have correct types
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      id: {
        in: accountIdsToValidate,
      },
      status: "active",
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

  // Validate revenue account (required)
  const revenueAccount = accountMap.get(settings.sales.revenueAccountId);
  if (!revenueAccount) {
    throw new InvalidAccountError(settings.sales.revenueAccountId, "sales.revenueAccountId");
  }
  if (revenueAccount.type !== "REVENUE") {
    const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
    throw new AccountTypeValidationError(
      revenueAccount.name,
      "REVENUE" as any,
      revenueAccount.type as any,
      "Sales Revenue"
    );
  }

  // Validate receivable account (optional - only if configured)
  if (settings.sales.receivableAccountId) {
    const receivableAccount = accountMap.get(settings.sales.receivableAccountId);
    if (!receivableAccount) {
      throw new InvalidAccountError(settings.sales.receivableAccountId, "sales.receivableAccountId");
    }
    if (receivableAccount.type !== "ASSET") {
      const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
      throw new AccountTypeValidationError(
        receivableAccount.name,
        "ASSET" as any,
        receivableAccount.type as any,
        "Sales Accounts Receivable"
      );
    }
  }

  // Validate COGS account (optional - only if configured)
  if (settings.sales.cogsAccountId) {
    const cogsAccount = accountMap.get(settings.sales.cogsAccountId);
    if (!cogsAccount) {
      throw new InvalidAccountError(settings.sales.cogsAccountId, "sales.cogsAccountId");
    }
    if (cogsAccount.type !== "EXPENSE") {
      const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
      throw new AccountTypeValidationError(
        cogsAccount.name,
        "EXPENSE" as any,
        cogsAccount.type as any,
        "Sales Cost of Goods Sold"
      );
    }
  }

  // Validate Ready Products Inventory account (optional - only if configured)
  if (settings.sales.finishedGoodsInventoryAccountId) {
    const fgAccount = accountMap.get(settings.sales.finishedGoodsInventoryAccountId);
    if (!fgAccount) {
      throw new InvalidAccountError(settings.sales.finishedGoodsInventoryAccountId, "sales.finishedGoodsInventoryAccountId");
    }
    if (fgAccount.type !== "ASSET") {
      const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
      throw new AccountTypeValidationError(
        fgAccount.name,
        "ASSET" as any,
        fgAccount.type as any,
        "Sales Ready Products Inventory"
      );
    }
  }

  return settings.sales;
}

/**
 * Get production accounts or throw error if not configured
 * Validates account types before returning
 */
export async function getProductionAccounts(): Promise<ProductionAccounts> {
  const settings = await getAccountingOperationSettings();
  
  if (
    !settings.production.consumptionWipAccountId || 
    !settings.production.consumptionRawMaterialInventoryId || 
    !settings.production.completionFinishedGoodsInventoryId || 
    !settings.production.completionWipAccountId
  ) {
    throw new AccountingSettingsNotConfiguredError("Production");
  }

  // Validate accounts exist and have correct types (all should be ASSET)
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      id: {
        in: [
          settings.production.consumptionWipAccountId,
          settings.production.consumptionRawMaterialInventoryId,
          settings.production.completionFinishedGoodsInventoryId,
          settings.production.completionWipAccountId,
        ],
      },
      status: "active",
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

  // Validate RM inventory account
  const rmAccount = accountMap.get(settings.production.consumptionRawMaterialInventoryId);
  if (!rmAccount) {
    throw new InvalidAccountError(settings.production.consumptionRawMaterialInventoryId, "production.consumptionRawMaterialInventoryId");
  }
  
  // Validate WIP account (Consumption)
  const wipConsAccount = accountMap.get(settings.production.consumptionWipAccountId);
  if (!wipConsAccount) {
    throw new InvalidAccountError(settings.production.consumptionWipAccountId, "production.consumptionWipAccountId");
  }
  
  // Validate FG inventory account
  const fgAccount = accountMap.get(settings.production.completionFinishedGoodsInventoryId);
  if (!fgAccount) {
    throw new InvalidAccountError(settings.production.completionFinishedGoodsInventoryId, "production.completionFinishedGoodsInventoryId");
  }
  
  // Validate WIP account (Completion)
  const wipComplAccount = accountMap.get(settings.production.completionWipAccountId);
  if (!wipComplAccount) {
    throw new InvalidAccountError(settings.production.completionWipAccountId, "production.completionWipAccountId");
  }

  return settings.production;
}

/**
 * Get payment accounts or throw error if not configured
 */
export async function getPaymentAccounts(): Promise<PaymentAccounts> {
  const settings = await getAccountingOperationSettings();
  
  if (!settings.payment.cashAccountId || !settings.payment.payableAccountId) {
    throw new AccountingSettingsNotConfiguredError("Payment");
  }

  // Validate accounts exist and have correct types
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      id: {
        in: [settings.payment.cashAccountId, settings.payment.payableAccountId],
      },
      status: "active",
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

  // Validate cash account
  const cashAccount = accountMap.get(settings.payment.cashAccountId);
  if (!cashAccount) {
    throw new InvalidAccountError(settings.payment.cashAccountId, "payment.cashAccountId");
  }
  if (cashAccount.type !== "ASSET") {
    const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
    throw new AccountTypeValidationError(
      cashAccount.name,
      "ASSET" as any,
      cashAccount.type as any,
      "Payment Cash"
    );
  }

  // Validate payable account
  const payableAccount = accountMap.get(settings.payment.payableAccountId);
  if (!payableAccount) {
    throw new InvalidAccountError(settings.payment.payableAccountId, "payment.payableAccountId");
  }
  if (payableAccount.type !== "LIABILITY") {
    const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
    throw new AccountTypeValidationError(
      payableAccount.name,
      "LIABILITY" as any,
      payableAccount.type as any,
      "Payment Accounts Payable"
    );
  }

  return settings.payment;
}

/**
 * Get receipt accounts or throw error if not configured
 */
export async function getReceiptAccounts(): Promise<ReceiptAccounts> {
  const settings = await getAccountingOperationSettings();
  
  if (!settings.receipt.cashAccountId || !settings.receipt.receivableAccountId) {
    throw new AccountingSettingsNotConfiguredError("Receipt");
  }

  // Validate accounts exist and have correct types
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      id: {
        in: [settings.receipt.cashAccountId, settings.receipt.receivableAccountId],
      },
      status: "active",
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

  // Validate cash account
  const cashAccount = accountMap.get(settings.receipt.cashAccountId);
  if (!cashAccount) {
    throw new InvalidAccountError(settings.receipt.cashAccountId, "receipt.cashAccountId");
  }
  if (cashAccount.type !== "ASSET") {
    const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
    throw new AccountTypeValidationError(
      cashAccount.name,
      "ASSET" as any,
      cashAccount.type as any,
      "Receipt Cash"
    );
  }

  // Validate receivable account
  const receivableAccount = accountMap.get(settings.receipt.receivableAccountId);
  if (!receivableAccount) {
    throw new InvalidAccountError(settings.receipt.receivableAccountId, "receipt.receivableAccountId");
  }
  if (receivableAccount.type !== "ASSET") {
    const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
    throw new AccountTypeValidationError(
      receivableAccount.name,
      "ASSET" as any,
      receivableAccount.type as any,
      "Receipt Accounts Receivable"
    );
  }

  return settings.receipt;
}

/**
 * Get contra accounts or throw error if not configured
 * Validates account types before returning
 */
export async function getContraAccounts(): Promise<ContraAccounts> {
  const settings = await getAccountingOperationSettings();
  
  if (!settings.contra.fromAccountId || !settings.contra.toAccountId) {
    throw new AccountingSettingsNotConfiguredError("Contra");
  }

  // Validate accounts exist and have correct types (typically both ASSET for cash/bank transfers)
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      id: {
        in: [settings.contra.fromAccountId, settings.contra.toAccountId],
      },
      status: "active",
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

  // Validate from account
  const fromAccount = accountMap.get(settings.contra.fromAccountId);
  if (!fromAccount) {
    throw new InvalidAccountError(settings.contra.fromAccountId, "contra.fromAccountId");
  }
  if (fromAccount.type !== "ASSET") {
    const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
    throw new AccountTypeValidationError(
      fromAccount.name,
      "ASSET" as any,
      fromAccount.type as any,
      "Contra From Account"
    );
  }

  // Validate to account
  const toAccount = accountMap.get(settings.contra.toAccountId);
  if (!toAccount) {
    throw new InvalidAccountError(settings.contra.toAccountId, "contra.toAccountId");
  }
  if (toAccount.type !== "ASSET") {
    const { AccountTypeValidationError } = await import("@/lib/accounting-settings-validation");
    throw new AccountTypeValidationError(
      toAccount.name,
      "ASSET" as any,
      toAccount.type as any,
      "Contra To Account"
    );
  }

  return settings.contra;
}
