/**
 * Accounting Operation Settings Type Definitions
 * 
 * Simplified structure using operation-based grouping with a single settings key.
 */

/**
 * Purchase operation account mappings
 */
export interface PurchaseAccounts {
  inventoryAccountId: string; // DR (Inventory Account)
  payableAccountId: string;   // CR (Accounts Payable - Informational)
}

/**
 * Sales operation account mappings
 */
export interface SalesAccounts {
  // Revenue Entry
  revenueAccountId: string;    // CR (Sales Revenue)
  receivableAccountId: string; // DR (Accounts Receivable - Informational)
  
  // COGS Entry
  cogsAccountId: string;             // DR (Cost of Goods Sold)
  finishedGoodsInventoryAccountId: string; // CR (Ready Products Inventory)
  
  // Discount Entry
  couponDiscountAccountId?: string; // DR (Sales Coupon Discount - Optional)
  salesDiscountAccountId?: string;  // DR (Sales Discount - Optional)
}

/**
 * Production operation account mappings
 */
export interface ProductionAccounts {
  // Raw Material Consumption
  consumptionWipAccountId: string;           // DR (Work In Progress)
  consumptionRawMaterialInventoryId: string; // CR (Raw Material Inventory)
  
  // Production Completion
  completionFinishedGoodsInventoryId: string; // DR (Ready Products Inventory)
  completionWipAccountId: string;             // CR (Work In Progress)
}

/**
 * Inventory adjustment account mappings
 */
export interface InventoryAdjustmentAccounts {
  // Positive Adjustment
  positiveFgInventoryId: string;  // DR (Ready Products)
  positiveRmInventoryId: string;  // DR (Raw Material)
  positiveAdjustmentGainId: string; // CR (Adjustment Gain)
  
  // Negative Adjustment
  negativeFgInventoryId: string;   // CR (Ready Products)
  negativeRmInventoryId: string;   // CR (Raw Material)
  negativeAdjustmentExpenseId: string; // DR (Adjustment Expense)
}

/**
 * Payment operation account mappings
 */
export interface PaymentAccounts {
  cashAccountId: string;
  payableAccountId: string;
}

/**
 * Receipt operation account mappings
 */
export interface ReceiptAccounts {
  cashAccountId: string;
  receivableAccountId: string;
}

/**
 * Contra operation account mappings
 */
export interface ContraAccounts {
  fromAccountId: string;
  toAccountId: string;
}

/**
 * Payroll operation account mappings
 */
export interface PayrollAccounts {
  salaryExpenseAccountId: string;
  defaultSalaryPayableAccountId: string;
  taxPayableAccountId: string;
  pfPayableAccountId: string;
  defaultAdvanceAccountId: string;
  employerPfExpenseAccountId: string;
  employerPfPayableAccountId: string;
  festivalBonusExpenseAccountId: string;
}

/**
 * Complete accounting operation settings structure
 */
export interface AccountingOperationSettings {
  purchase: PurchaseAccounts;
  sales: SalesAccounts;
  production: ProductionAccounts;
  inventoryAdjustment: InventoryAdjustmentAccounts;
  payment: PaymentAccounts;
  receipt: ReceiptAccounts;
  contra: ContraAccounts;
  payroll: PayrollAccounts;
}

/**
 * Settings key for accounting operations
 */
export const ACCOUNTING_OPERATIONS_KEY = "accounting.operationAccounts";

/**
 * Operation types
 */
export type OperationType = keyof AccountingOperationSettings;
