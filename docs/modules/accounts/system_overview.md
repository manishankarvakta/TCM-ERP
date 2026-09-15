# Accounting System Overview & Integration Guide

## 1. Executive Summary
The accounting module serves as the central financial brain of the ERP, adhering to strict **Double-Entry Bookkeeping** principles. It automates financial record-keeping by listening to operational events in Sales, Purchasing, Manufacturing, and Inventory.

---

## 2. Core Data Structures

### 2.1 Primary Accounting Models
| Model | Description | Key Relationships |
| :--- | :--- | :--- |
| **ChartOfAccount** | The list of all ledgers (Assets, Liabilities, Equity, Revenue, Expenses). Support hierarchical grouping. | Parent Account, CashBankAccount |
| **Voucher** | Represents a single financial transaction. Can be `DRAFT` (editable) or `POSTED` (locked). | Client, Supplier, User, VoucherLines |
| **VoucherLine** | Individual debit/credit lines within a voucher. | Chart of Account, Amount |
| **JournalEntry** | The immutable, final record created when a Voucher is posted. Used for reporting. | Voucher |
| **AccountingPeriod** | Defines fiscal periods to lock transactions (e.g., closing a month/year). | Start/End Dates |

### 2.2 Related Operational Models
| Model | Accounting Impact |
| :--- | :--- |
| **Purchase** | Linked to `PurchaseStatus`. Generates AP and Inventory entries. |
| **Sale** | Linked to `SaleStatus`. Generates AR, Revenue, and COGS entries. |
| **ProductionOrder** | Complex lifecycle. Generates WIP moves and Ready Products capitalization. |
| **InventoryAdjustment** | Handles stock discrepancies. Generates Gain/Loss entries. |
| **Employee** | Holds configuration for `Salary Payable` and `Advance` accounts. |

---

## 3. Module Integrations & Accounting Logic

### 3.1 Sales Module
**Automated Event**: Sale marked as `COMPLETED`.

**Voucher Logic**:
1.  **Revenue Recognition**:
    *   **Dr** Accounts Receivable (Client Ledger or Default)
    *   **Cr** Sales Revenue (Settings: `sales.revenueAccountId`)
2.  **Cost of Goods Sold (COGS)** (If COGS account is configured):
    *   **Dr** COGS Expense (Settings: `sales.cogsAccountId`)
    *   **Cr** Inventory Asset (Settings: `sales.finishedGoodsInventoryAccountId`)

**Pre-requisites**:
*   Client must have a linked Ledger OR a default Receivable account must be set.
*   Items must be `READY_PRODUCT` or `RETAIL`.

### 3.2 Purchase Module
**Automated Event**: Purchase marked as `RECEIVED`.

**Voucher Logic**:
1.  **Inventory Capitalization**:
    *   **Dr** Inventory Asset (Settings: `purchase.inventoryAccountId` or Production RM/FG accounts based on item type)
    *   **Cr** Accounts Payable (Supplier Ledger or Settings: `purchase.payableAccountId`)

**Item Type Handling**:
*   **Raw Materials**: Debits `production.consumptionRawMaterialInventoryId`
*   **Ready Products**: Debits `production.completionFinishedGoodsInventoryId`
*   **Retail/Other**: Debits `purchase.inventoryAccountId`

### 3.3 Production Module (Manufacturing)
Production follows a multi-stage accounting process to track Work-In-Progress (WIP).

**Stage 1: Production Start (Status: `IN_PROGRESS`)**
*   **Action**: Raw Materials are issued to the shop floor.
*   **Entry**:
    *   **Dr** WIP Asset (Settings: `production.consumptionWipAccountId`)
    *   **Cr** Raw Material Inventory (Settings: `production.consumptionRawMaterialInventoryId`)

**Stage 2: Production Completion (Status: `COMPLETED`)**
*   **Action**: Ready Products are produced from WIP.
*   **Entry**:
    *   **Dr** Ready Products Inventory (Settings: `production.completionFinishedGoodsInventoryId`)
    *   **Cr** WIP Asset (Settings: `production.completionWipAccountId`)

**Cancellation (Reversal)**
*   If an `IN_PROGRESS` order is cancelled, the customized logic reverses the WIP entry (Dr RM, Cr WIP) to return materials to stock.

### 3.4 Inventory Adjustments
**Automated Event**: Adjustment marked as `APPROVED`.

**Scenario: Stock Gain implies Income**
*   **Dr** Inventory Asset
*   **Cr** Stock Adjustment Gain (Income Account)

**Scenario: Stock Loss implies Expense**
*   **Dr** Stock Adjustment Loss (Expense Account)
*   **Cr** Inventory Asset

---

## 4. Configuration Reference (`Settings` Table)
All accounting automation is controlled via the `AccountingOperationSettings` JSON object.

### 4.1 Purchase Settings (`purchase`)
*   `inventoryAccountId`: Default asset account.
*   `payableAccountId`: Default liability account (if Supplier has no ledger).

### 4.2 Sales Settings (`sales`)
*   `revenueAccountId`: Main income account.
*   `receivableAccountId`: Default asset account (if Client has no ledger).
*   `cogsAccountId`: Expense account for cost tracking.
*   `finishedGoodsInventoryAccountId`: Asset account to credit during sales (Inventory reduction).

### 4.3 Production Settings (`production`)
*   `consumptionWipAccountId`: Asset account for WIP (Dr on Start).
*   `consumptionRawMaterialInventoryId`: Asset account for RM (Cr on Start).
*   `completionFinishedGoodsInventoryId`: Asset account for FG (Dr on Complete).
*   `completionWipAccountId`: Asset account for WIP release (Cr on Complete).

### 4.4 Inventory Adjustment Settings (`inventoryAdjustment`)
*   `positiveFgInventoryId` / `positiveRmInventoryId`: Assets (Dr on Gain).
*   `positiveAdjustmentGainId`: Income (Cr on Gain).
*   `negativeFgInventoryId` / `negativeRmInventoryId`: Assets (Cr on Loss).
*   `negativeAdjustmentExpenseId`: Expense (Dr on Loss).

---

## 5. Security & Permissions
*   **Permissions**: Access is controlled via `UserPermission` model (modules: `accounting.vouchers`, `accounting.reports`).
*   ** locking**: `AccountingPeriod` can generate soft locks preventing entry creation before/after specific dates.
*   **Audit Log**: All automatic system vouchers are logged in `UserLog` with the flag `isSystemAction: true`.
