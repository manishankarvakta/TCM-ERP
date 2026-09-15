# Account & Inventory Implementation Guide

This guide details the automatic integration between the **Inventory Modules** (Purchase, Adjustment) and the **Accounting Module** (Journal Vouchers).

## 1. Overview
The system automatically creates specific **Accounting Vouchers** when inventory actions are completed. This ensures your financial reports (Balance Sheet, P&L) always reflect your physical stock value.

## 2. Configuration Requirements
Before using the inventory modules, you must configure the default Chart of Accounts in **Settings > Accounting**.

### Purchase Settings
Navigate to **Settings > Accounting > Purchase**.
- **Inventory Account (Retail)**: The default asset account for retail items (e.g., "Inventory Asset - Retail").
- **Accounts Payable**: The default liability account for suppliers (e.g., "Accounts Payable").

### Production Settings
Navigate to **Settings > Accounting > Production**.
*Required if you purchase Raw Materials or Ready Products directly.*
- **Raw Material Inventory**: Asset account for RM (e.g., "Inventory Asset - Raw Material").
- **Ready Products Inventory**: Asset account for FG (e.g., "Inventory Asset - Ready Products").

### Inventory Adjustment Settings
Navigate to **Settings > Accounting > Inventory Adjustment**.
- **Positive Adjustments (Gain)**:
  - **Inventory Account**: Debit account (Asset).
  - **Gain Account**: Credit account (Income/Revenue, e.g., "Stock Adjustment Gain").
- **Negative Adjustments (Loss)**:
  - **Inventory Account**: Credit account (Asset).
  - **Expense Account**: Debit account (Expense, e.g., "Stock Adjustment Loss").

---

## 3. Automatic Journal Entries

### A. Purchases
**Trigger**: When a Purchase status is changed to **RECEIVED**.

**Journal Entry Logic**:
| Dr/Cr | Account | Description | Source |
| :--- | :--- | :--- | :--- |
| **Dr** | **Inventory Asset** | Increases Stock Value | Selected based on Item Type (RM, FG, or Retail) from Settings. |
| **Cr** | **Accounts Payable** | Liability to Supplier | Uses Supplier's linked Ledger. If not set, uses default from Purchase Settings. |

**Example**:
Bought 10kg Raw Rice @ 100/kg.
- **Dr** Raw Material Inventory: 1000
- **Cr** Accounts Payable (Supplier): 1000

---

### B. Inventory Adjustments
**Trigger**: When an Adjustment is **APPROVED**.

**Scenario 1: Stock Increase (Gain)**
Finding extra stock.
| Dr/Cr | Account | Description | Source |
| :--- | :--- | :--- | :--- |
| **Dr** | **Inventory Asset** | Updates Asset Value | `positiveRmInventoryId` or `positiveFgInventoryId` settings. |
| **Cr** | **Gain Account** | Records Income | `positiveAdjustmentGainId` setting. |

**Scenario 2: Stock Decrease (Loss)**
Damaged or missing goods.
| Dr/Cr | Account | Description | Source |
| :--- | :--- | :--- | :--- |
| **Dr** | **Expense Account** | Records Expense/Loss | `negativeAdjustmentExpenseId` setting. |
| **Cr** | **Inventory Asset** | Reduces Asset Value | `negativeRmInventoryId` or `negativeFgInventoryId` settings. |

---

## 4. Troubleshooting
**Error: "Cannot create voucher... No Accounts Payable ledger found"**
- **Cause**: The Supplier does not have a linked Ledger in their profile, and no default AP account is set in global settings.
- **Fix**: Go to **Contacts > Suppliers**, edit the supplier, and select a Ledger. OR Go to **Settings > Accounting** and set a default Payable account.

**Error: "Production accounting settings are not configured"**
- **Cause**: You are buying items marked as "Raw Material" or "Ready Product" but haven't mapped the specific inventory accounts.
- **Fix**: Go to **Settings > Accounting > Production** and map the accounts.
