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

  if (settings.purchase.payableAccountId) {
    validationRules.push({
      accountId: settings.purchase.payableAccountId,
      fieldName: "Purchase Accounts Payable",
      expectedType: AccountType.LIABILITY,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Purchase Accounts Payable");
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

  if (settings.sales.receivableAccountId) {
    validationRules.push({
      accountId: settings.sales.receivableAccountId,
      fieldName: "Sales Accounts Receivable",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Sales Accounts Receivable");
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

  // Production validation rules
  if (settings.production.rawMaterialInventoryId) {
    validationRules.push({
      accountId: settings.production.rawMaterialInventoryId,
      fieldName: "Raw Material Inventory",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Raw Material Inventory");
  }

  if (settings.production.wipAccountId) {
    validationRules.push({
      accountId: settings.production.wipAccountId,
      fieldName: "Work in Progress (WIP)",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Work in Progress (WIP)");
  }

  if (settings.production.finishedGoodsInventoryId) {
    validationRules.push({
      accountId: settings.production.finishedGoodsInventoryId,
      fieldName: "Finished Goods Inventory",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Finished Goods Inventory");
  }

  // Inventory Adjustment validation rules (optional)
  if (settings.inventoryAdjustment.gainAccountId) {
    validationRules.push({
      accountId: settings.inventoryAdjustment.gainAccountId,
      fieldName: "Inventory Gain",
      expectedType: AccountType.REVENUE,
      required: false,
    });
  }

  if (settings.inventoryAdjustment.lossAccountId) {
    validationRules.push({
      accountId: settings.inventoryAdjustment.lossAccountId,
      fieldName: "Inventory Loss",
      expectedType: AccountType.EXPENSE,
      required: false,
    });
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

  if (settings.payment.payableAccountId) {
    validationRules.push({
      accountId: settings.payment.payableAccountId,
      fieldName: "Payment Accounts Payable",
      expectedType: AccountType.LIABILITY,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Payment Accounts Payable");
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

  if (settings.receipt.receivableAccountId) {
    validationRules.push({
      accountId: settings.receipt.receivableAccountId,
      fieldName: "Receipt Accounts Receivable",
      expectedType: AccountType.ASSET,
      required: true,
    });
  } else {
    throw new AccountNotConfiguredError("Receipt Accounts Receivable");
  }

  // Contra validation rules (optional)
  if (settings.contra.fromAccountId) {
    validationRules.push({
      accountId: settings.contra.fromAccountId,
      fieldName: "Contra From Account",
      expectedType: AccountType.ASSET, // Typically cash/bank
      required: false,
    });
  }

  if (settings.contra.toAccountId) {
    validationRules.push({
      accountId: settings.contra.toAccountId,
      fieldName: "Contra To Account",
      expectedType: AccountType.ASSET, // Typically cash/bank
      required: false,
    });
  }

  // Fetch all accounts to validate
  const accountIds = validationRules.map(rule => rule.accountId);
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
