# 🔒 05. Accounting Periods & Closing Guide

The **Accounting Periods** module establishes fiscal periods, enforces financial posting locks, and manages month-end and year-end closing processes.

---

## 📍 Navigation
* **URL**: `/dashboard/accounts/periods`
* **Sidebar**: `Finance` ➔ `Accounting Periods`

---

## 📅 Accounting Period States

| Status | Code | Posting Allowed? | Modification Allowed? | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Open** | `open` | **Yes** | **Yes** | Active financial period open for voucher entries and adjustments. |
| **Closed** | `closed` | **No** | **No (Admin Only)** | Financial period closed for routine operations. Reconciliation complete. |
| **Locked** | `locked` | **No** | **Strictly No** | Immutable audit period locked after tax filing and annual audit completion. |

---

## 📝 Form Field Details: Create Period Dialog

| Field Name | Component | Required | Format | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Period Name** | Text Input | **Yes** | String (e.g. *September 2026*, *FY 2026*) | Name of the fiscal period. |
| **Start Date** | Date Picker | **Yes** | `YYYY-MM-DD` | First calendar day of the accounting period. |
| **End Date** | Date Picker | **Yes** | `YYYY-MM-DD` | Last calendar day of the accounting period. |
| **Status** | Select Dropdown | **Yes** | `open`, `closed`, `locked` | Initial status of the period. |

---

## 🛡️ Period Lock Enforcement Rules

1. **Voucher Entry Interception**: When a user attempts to post a voucher, the system checks whether the voucher's transaction date falls within a `locked` or `closed` period.
2. **Rejection Alert**: If the period is locked, the voucher server action blocks posting and returns:
   > *"Cannot post voucher in a locked accounting period."*
3. **Storno Prevention**: Posted vouchers in locked periods cannot be cancelled or reversed unless the administrator temporarily re-opens the period.

---

## 🛠️ Month-End & Year-End Closing Workflows

### Month-End Closing Checklist
1. Post all pending **Receipt** and **Payment Vouchers**.
2. Run **Bank Reconciliation** for all Cash, Bank, and Digital Wallet accounts.
3. Record monthly **Depreciation Vouchers** for fixed assets.
4. Record monthly **Accruals & Provisions** (Rent, Salaries, Tax Payable).
5. Verify that **Trial Balance** is balanced ($\text{Difference} = \$0.00$).
6. Navigate to `/dashboard/accounts/periods` and update period status to **Closed**.

### Year-End Closing & Retained Earnings Transfer
1. Calculate Net Income for the fiscal year ($\text{Revenues} - \text{Expenses}$).
2. Create a Year-End Closing Journal Entry:
   * Debit all Revenue Accounts to zero.
   * Credit all Expense Accounts to zero.
   * Transfer the net difference to `3120 Retained Earnings`.
3. Update Fiscal Year Period status to **Locked**.
