/**
 * Strict Validation for Accounting Operation Settings
 * 
 * Validates that:
 * 1. Each mapped account exists in ChartOfAccount
 * 2. Inventory mappings reference ASSET accounts
 * 3. AR mappings reference control AR accounts (ASSET)
 * 4. AP mappings reference control AP accounts (LIABILITY)
 * 5. Revenue mappings reference REVENUE accounts
 * 6. Expense mappings reference EXPENSE accounts
 */

import { prisma } from "@/lib/prisma";
import type { AccountingOperationSettings } from "@/types/accounting-settings";
import { AccountType } from "@prisma/client";

/**
 * Validation error for account type mismatch
 */
export class AccountTypeValidationError extends Error {
  constructor(
    public readonly accountName: string,
    public readonly expectedType: AccountType,
    public readonly actualType: AccountType,
    public readonly fieldName: string
  ) {
    super(
      `${fieldName} account "${accountName}" must be an ${expectedType} account, but is ${actualType}`
    );
    this.name = 'AccountTypeValidationError';
    Object.setPrototypeOf(this, AccountTypeValidationError.prototype);
  }
}

/**
 * Validation error for missing account
 */
export class AccountNotFoundValidationError extends Error {
  constructor(
    public readonly accountId: string,
    public readonly fieldName: string
  ) {
    super(
      `${fieldName} account (ID: ${accountId}) does not exist or is inactive`
    );
    this.name = 'AccountNotFoundValidationError';
    Object.setPrototypeOf(this, AccountNotFoundValidationError.prototype);
  }
}

/**
 * Validation error for missing configuration
 */
export class AccountNotConfiguredError extends Error {
  constructor(public readonly fieldName: string) {
    super(`${fieldName} account is not configured`);
    this.name = 'AccountNotConfiguredError';
    Object.setPrototypeOf(this, AccountNotConfiguredError.prototype);
  }
}

/**
 * Account validation rule
 */
interface AccountValidationRule {
  accountId: string;
  fieldName: string;
  expectedType: AccountType;
  required: boolean;
}

/**
 * Validate operation account settings
 * Throws descriptive errors if validation fails
 */
export async function validateOperationAccountSettings(
  settings: AccountingOperationSettings
): Promise<void> {
  const validationRules: AccountValidationRule[] = [];

  // Purchase validation rules
  if (settings.purchase.inventoryAccountId) {
    validationRules.push({
      accountId: settings.purchase.inventoryAccountId,
      fieldName: "Purchase Inventory",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Purchase Inventory");
  }

  // Sales validation rules
  if (settings.sales.revenueAccountId) {
    validationRules.push({
      accountId: settings.sales.revenueAccountId,
      fieldName: "Sales Revenue",
      expectedType: AccountType.REVENUE,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Sales Revenue");
  }

  if (settings.sales.cogsAccountId) {
    validationRules.push({
      accountId: settings.sales.cogsAccountId,
      fieldName: "Sales Cost of Goods Sold",
      expectedType: AccountType.EXPENSE,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Sales Cost of Goods Sold");
  }

  if (settings.sales.finishedGoodsInventoryAccountId) {
    validationRules.push({
      accountId: settings.sales.finishedGoodsInventoryAccountId,
      fieldName: "Sales Ready Products Inventory",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Sales Ready Products Inventory");
  }

  // Production validation rules
  if (settings.production.consumptionWipAccountId) {
    validationRules.push({
      accountId: settings.production.consumptionWipAccountId,
      fieldName: "Production Consumption WIP",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Production Consumption WIP");
  }

  if (settings.production.consumptionRawMaterialInventoryId) {
    validationRules.push({
      accountId: settings.production.consumptionRawMaterialInventoryId,
      fieldName: "Production Raw Material Inventory",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Production Raw Material Inventory");
  }

  if (settings.production.completionFinishedGoodsInventoryId) {
    validationRules.push({
      accountId: settings.production.completionFinishedGoodsInventoryId,
      fieldName: "Production Ready Products Inventory",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Production Ready Products Inventory");
  }

  if (settings.production.completionWipAccountId) {
    validationRules.push({
      accountId: settings.production.completionWipAccountId,
      fieldName: "Production Completion WIP",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Production Completion WIP");
  }

  // Inventory Adjustment validation rules
  if (settings.inventoryAdjustment.positiveFgInventoryId) {
    validationRules.push({
      accountId: settings.inventoryAdjustment.positiveFgInventoryId,
      fieldName: "Pos. Adj. Ready Products",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Positive Adjustment Ready Products Inventory");
  }

  if (settings.inventoryAdjustment.positiveRmInventoryId) {
    validationRules.push({
      accountId: settings.inventoryAdjustment.positiveRmInventoryId,
      fieldName: "Pos. Adj. Raw material",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Positive Adjustment Raw Material Inventory");
  }

  if (settings.inventoryAdjustment.positiveAdjustmentGainId) {
    validationRules.push({
      accountId: settings.inventoryAdjustment.positiveAdjustmentGainId,
      fieldName: "Positive Adjustment Gain",
      expectedType: AccountType.REVENUE,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Positive Adjustment Gain");
  }

  if (settings.inventoryAdjustment.negativeFgInventoryId) {
    validationRules.push({
      accountId: settings.inventoryAdjustment.negativeFgInventoryId,
      fieldName: "Neg. Adj. Ready Products",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Negative Adjustment Ready Products Inventory");
  }

  if (settings.inventoryAdjustment.negativeRmInventoryId) {
    validationRules.push({
      accountId: settings.inventoryAdjustment.negativeRmInventoryId,
      fieldName: "Neg. Adj. Raw material",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Negative Adjustment Raw Material Inventory");
  }

  if (settings.inventoryAdjustment.negativeAdjustmentExpenseId) {
    validationRules.push({
      accountId: settings.inventoryAdjustment.negativeAdjustmentExpenseId,
      fieldName: "Negative Adjustment Expense",
      expectedType: AccountType.EXPENSE,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Negative Adjustment Expense");
  }

  // Payment validation rules
  if (settings.payment.cashAccountId) {
    validationRules.push({
      accountId: settings.payment.cashAccountId,
      fieldName: "Payment Cash",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Payment Cash");
  }

  // Receipt validation rules
  if (settings.receipt.cashAccountId) {
    validationRules.push({
      accountId: settings.receipt.cashAccountId,
      fieldName: "Receipt Cash",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Receipt Cash");
  }

  // Payroll validation rules (optional configuration, but validated if provided)
  if (settings.payroll) {
    if (settings.payroll.salaryExpenseAccountId) {
      validationRules.push({
        accountId: settings.payroll.salaryExpenseAccountId,
        fieldName: "Payroll Salary Expense",
        expectedType: AccountType.EXPENSE,
        required: false,
      });
    }
    if (settings.payroll.defaultSalaryPayableAccountId) {
      validationRules.push({
        accountId: settings.payroll.defaultSalaryPayableAccountId,
        fieldName: "Payroll Default Salary Payable",
        expectedType: AccountType.LIABILITY,
        required: false,
      });
    }
    if (settings.payroll.taxPayableAccountId) {
      validationRules.push({
        accountId: settings.payroll.taxPayableAccountId,
        fieldName: "Payroll Tax Payable",
        expectedType: AccountType.LIABILITY,
        required: false,
      });
    }
    if (settings.payroll.pfPayableAccountId) {
      validationRules.push({
        accountId: settings.payroll.pfPayableAccountId,
        fieldName: "Payroll PF Payable",
        expectedType: AccountType.LIABILITY,
        required: false,
      });
    }
    if (settings.payroll.employerPfExpenseAccountId) {
      validationRules.push({
        accountId: settings.payroll.employerPfExpenseAccountId,
        fieldName: "Payroll Employer PF Expense",
        expectedType: AccountType.EXPENSE,
        required: false,
      });
    }
    if (settings.payroll.employerPfPayableAccountId) {
      validationRules.push({
        accountId: settings.payroll.employerPfPayableAccountId,
        fieldName: "Payroll Employer PF Payable",
        expectedType: AccountType.LIABILITY,
        required: false,
      });
    }
    if (settings.payroll.festivalBonusExpenseAccountId) {
      validationRules.push({
        accountId: settings.payroll.festivalBonusExpenseAccountId,
        fieldName: "Payroll Festival Bonus Expense",
        expectedType: AccountType.EXPENSE,
        required: false,
      });
    }
  }

  // Fetch all accounts to validate
  const accountIds = validationRules.map(rule => rule.accountId);
  if (settings.payroll?.defaultAdvanceAccountId) {
    accountIds.push(settings.payroll.defaultAdvanceAccountId);
  }
  if (settings.sales.couponDiscountAccountId) {
    accountIds.push(settings.sales.couponDiscountAccountId);
  }
  if (settings.sales.salesDiscountAccountId) {
    accountIds.push(settings.sales.salesDiscountAccountId);
  }
  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      id: { in: accountIds },
      status: "active",
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
    },
  });

  // Create a map for quick lookup
  const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

  // Validate each rule
  for (const rule of validationRules) {
    const account = accountMap.get(rule.accountId);

    // Check if account exists
    if (!account) {
      throw new AccountNotFoundValidationError(rule.accountId, rule.fieldName);
    }

    // Check if account type matches expected type
    if (account.type !== rule.expectedType) {
      throw new AccountTypeValidationError(
        account.name,
        rule.expectedType,
        account.type,
        rule.fieldName
      );
    }
  }

  // Validate employee advance account allowing both ASSET and LIABILITY
  if (settings.payroll?.defaultAdvanceAccountId) {
    const advanceAccount = accountMap.get(settings.payroll.defaultAdvanceAccountId);
    if (!advanceAccount) {
      throw new AccountNotFoundValidationError(settings.payroll.defaultAdvanceAccountId, "Payroll Default Advance");
    }
    if (advanceAccount.type !== AccountType.ASSET && advanceAccount.type !== AccountType.LIABILITY) {
      throw new Error(
        `Payroll Default Advance account "${advanceAccount.name}" must be an ASSET or LIABILITY account, but is ${advanceAccount.type}`
      );
    }
  }

  // Validate sales discount accounts allowing both REVENUE and EXPENSE
  if (settings.sales.couponDiscountAccountId) {
    const couponAcct = accountMap.get(settings.sales.couponDiscountAccountId);
    if (!couponAcct) {
      throw new AccountNotFoundValidationError(settings.sales.couponDiscountAccountId, "Sales Coupon Discount");
    }
    if (couponAcct.type !== AccountType.REVENUE && couponAcct.type !== AccountType.EXPENSE) {
      throw new Error(
        `Sales Coupon Discount account "${couponAcct.name}" must be a REVENUE or EXPENSE account, but is ${couponAcct.type}`
      );
    }
  }

  if (settings.sales.salesDiscountAccountId) {
    const salesAcct = accountMap.get(settings.sales.salesDiscountAccountId);
    if (!salesAcct) {
      throw new AccountNotFoundValidationError(settings.sales.salesDiscountAccountId, "Sales General Discount");
    }
    if (salesAcct.type !== AccountType.REVENUE && salesAcct.type !== AccountType.EXPENSE) {
      throw new Error(
        `Sales General Discount account "${salesAcct.name}" must be a REVENUE or EXPENSE account, but is ${salesAcct.type}`
      );
    }
  }
}

/**
 * Validate settings before voucher creation
 * This is a lighter version that only validates the accounts being used
 */
export async function validateAccountsForOperation(
  accountIds: string[],
  expectedTypes: Record<string, AccountType>
): Promise<void> {
  if (accountIds.length === 0) return;

  const accounts = await prisma.chartOfAccount.findMany({
    where: {
      id: { in: accountIds },
      status: "active",
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

  for (const accountId of accountIds) {
    const account = accountMap.get(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found or inactive`);
    }

    const expectedType = expectedTypes[accountId];
    if (expectedType && account.type !== expectedType) {
      throw new AccountTypeValidationError(
        account.name,
        expectedType,
        account.type,
        "Operation"
      );
    }
  }
}
