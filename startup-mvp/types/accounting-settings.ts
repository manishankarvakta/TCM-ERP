/**
 * Accounting Operation Settings Type Definitions
 * 
 * Simplified structure using operation-based grouping with a single settings key.
 */

/**
 * Purchase operation account mappings
 */
export interface PurchaseAccounts {
  inventoryAccountId: string;
  payableAccountId: string;
}

/**
 * Sales operation account mappings
 */
export interface SalesAccounts {
  revenueAccountId: string;
  receivableAccountId: string;
  cogsAccountId: string;
}

/**
 * Production operation account mappings
 */
export interface ProductionAccounts {
  rawMaterialInventoryId: string;
  wipAccountId: string;
  finishedGoodsInventoryId: string;
}

/**
 * Inventory adjustment account mappings
 */
export interface InventoryAdjustmentAccounts {
  gainAccountId: string;
  lossAccountId: string;
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
}

/**
 * Settings key for accounting operations
 */
export const ACCOUNTING_OPERATIONS_KEY = "accounting.operationAccounts";

/**
 * Operation types
 */
export type OperationType = keyof AccountingOperationSettings;
