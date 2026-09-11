# 📑 03. Vouchers & Journal Entries Guide

The **Vouchers & Journal Entries** module handles double-entry transaction entry, voucher posting, verification, and audit storno reversals.

---

## 📍 Navigation
* **URL**: `/dashboard/accounts/vouchers`
* **Sidebar**: `Finance` ➔ `Vouchers`

---

## 🎟️ Voucher Types & Financial Applications

| Voucher Type | Enum Code | Typical Financial Application | Debit Side | Credit Side |
| :--- | :--- | :--- | :--- | :--- |
| **Receipt Voucher** | `RECEIPT` | Cash/Bank inflows (Customer payments, capital injections, advances). | Cash / Bank / MFS Account | Revenue / Receivable / Equity Account |
| **Payment Voucher** | `PAYMENT` | Cash/Bank outflows (Vendor payments, expense payments, asset purchases). | Expense / Payable / Asset Account | Cash / Bank / MFS Account |
| **Journal Voucher** | `JOURNAL` | Non-cash adjustments, COGS recognition, depreciation, accruals, reclassifications. | Debit GL Account(s) | Credit GL Account(s) |

---

## 📝 Form Field Details: Voucher Entry Form

| Section | Field Name | Required | Component | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Header** | **Voucher Type** | **Yes** | Select Dropdown | `RECEIPT`, `PAYMENT`, or `JOURNAL`. |
| **Header** | **Voucher Date** | **Yes** | Date Picker | Date transaction occurred. Must be in an **unlocked** accounting period. |
| **Header** | **Reference Number** | Optional | Text Input | External invoice #, cheque #, PO #, or bank reference. |
| **Header** | **Description** | Optional | Text Input | Summary of business rationale for the voucher. |
| **Line Items** | **Account** | **Yes** | Searchable Select | Target GL Account (must be a valid leaf account). |
| **Line Items** | **Debit Amount** | **Yes** | Numeric Input | Amount debited to the account ($\ge 0$). |
| **Line Items** | **Credit Amount** | **Yes** | Numeric Input | Amount credited to the account ($\ge 0$). |
| **Line Items** | **Line Description** | Optional | Text Input | Line-level narration explaining the specific entry. |
| **Line Items** | **Client / Supplier** | Optional | Searchable Select | Customer or Vendor tag for AR/AP tracking. |

---

## ⚖️ Double-Entry Accounting Rules

1. **Balance Condition**: The sum of all Debit amounts **must exactly equal** the sum of all Credit amounts ($\sum \text{Debits} = \sum \text{Credits}$).
2. **Minimum Lines**: A valid voucher must have at least **2 line items**.
3. **No Zero Vouchers**: Total debit/credit amount must be greater than `$0.00`.

---

## 🔄 Audit Control & Storno Reversals

To maintain financial compliance and immutable audit logs:
* **Posted Vouchers Cannot Be Hard Deleted**: Once a voucher is in `posted` status, it cannot be erased from the database.
* **Storno Reversal (`JE-REV-...`)**: Cancelling a posted voucher automatically generates a **Reversing Journal Entry** with swapped Debit and Credit lines to neutralize ledger balances while preserving history.

---

## 🛠️ Step-by-Step Workflows

### Creating & Posting a Receipt Voucher
1. Go to `/dashboard/accounts/vouchers` and click **"+ Create Voucher"**.
2. Select Type: **Receipt Voucher**.
3. Set Date (e.g. `2026-09-12`).
4. Line 1: Select `1210 Bank - Primary Account` ➔ Debit: `$5,000.00`.
5. Line 2: Select `4110 Sales Revenue` ➔ Credit: `$5,000.00`.
6. Verify **Difference = $0.00**.
7. Click **Post Voucher**.
