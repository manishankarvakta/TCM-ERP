# Accounting Configuration Guide

## Overview
The system relies on a set of **Operation Settings** to map business actions (Sales, Purchase, Production) to specific ledger accounts. This ensures that automatic journals are created correctly without manual intervention for every transaction.

## 1. Global vs User Settings
*   **Global Settings**: Apply to the entire organization. This is the default.
*   **User Settings**: Can override global settings for specific users (e.g., a specific cashier using a different cash drawer account).

## 2. Configuration Areas

### A. Purchase Settings
Mappings for the procurement workflow (`RECEIVED` status).
*   **Inventory Account**: The Asset ledger where the value of stock is recorded.
    *   *Default*: "Inventory Asset"
*   **Payable Account**: The Liability ledger for money owed to suppliers.
    *   *Default*: "Accounts Payable" (Used if Supplier profile has no specific ledger).

### B. Sales Settings
Mappings for the sales workflow (`ACCEPTED` quotation / Invoice).
*   **Revenue Account**: The Income ledger for sales.
    *   *Default*: "Sales Revenue"
*   **Receivable Account**: The Asset ledger for money pending from customers.
    *   *Default*: "Accounts Receivable"
*   **COGS Account**: Expense ledger for Cost of Goods Sold.
    *   *Default*: "Cost of Goods Sold"

### C. Production Settings
Mappings for manufacturing processes.
*   **Raw Material (Inventory)**: Source account for ingredients.
*   **WIP (Work In Progress)**: Temporary asset account for unfinished goods.
*   **Finished Goods (Inventory)**: Destination account for completed products.
    *   *Flow*: Raw Material -> WIP -> Finished Goods.

### D. Inventory Adjustment
Mappings for manual stock corrections (Loss/Gain).
*   **Gain Account**: Revenue/Income account for stock surplus.
    *   *Default*: "Inventory Gain/Surplus"
*   **Loss Account**: Expense account for stock damage/theft.
    *   *Default*: "Inventory Loss/Shrinkage"

## 3. Important Notes
*   **Active Status**: All mapped accounts must be `Active` in the Chart of Accounts.
*   **Type Validation**: The system validates account types (e.g., you cannot select an Expense account for Inventory Asset).
*   **Fallback**: If a specific setting is missing, the transaction will fail to post to prevent unbalanced ledgers.
