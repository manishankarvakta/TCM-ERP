# 📖 01. Chart of Accounts (COA) Guide

The **Chart of Accounts (COA)** is the foundational master directory of all general ledger accounts used in the system. It organizes financial transactions into structured categories for reporting and double-entry bookkeeping.

---

## 📍 Navigation
* **URL**: `/dashboard/accounts/chart-of-accounts`
* **Sidebar**: `Finance` ➔ `Chart of Accounts`

---

## 🏛️ Account Types & Standard Coding Ranges

Accounts are classified into five primary types:

| Type | Classification | Normal Balance | Code Range | Description & Examples |
| :--- | :--- | :--- | :--- | :--- |
| **`ASSET`** | Balance Sheet | **Debit** | `1000 – 1999` | Resources owned by the company (Cash, Bank, Accounts Receivable, Inventory, Fixed Assets). |
| **`LIABILITY`** | Balance Sheet | **Credit** | `2000 – 2999` | Obligations owed to third parties (Accounts Payable, Accrued Expenses, Salaries Payable, Customer Advances). |
| **`EQUITY`** | Balance Sheet | **Credit** | `3000 – 3999` | Owner’s net worth and retained earnings (Owner's Capital, Retained Earnings, Investor Capital). |
| **`REVENUE`** | Income Statement | **Credit** | `4000 – 4999` | Income earned from core business operations (Sales Revenue, Service Revenue, Other Income). |
| **`EXPENSE`** | Income Statement | **Debit** | `5000 – 6999` | Costs incurred to generate revenue (Cost of Goods Sold, Rent, Salaries, Utilities, Depreciation). |

---

## 📝 Form Field Details: Create / Edit Account Dialog

When creating or editing a Chart of Account item, the following fields are presented:

| Field Name | Component Type | Required | Validation & Format | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Account Code** | Text Input | **Yes** | Alphanumeric string (e.g. `1110`, `AR-2026-0001`) | Unique identifier for the account. Must not duplicate existing codes. |
| **Account Name** | Text Input | **Yes** | String (2–100 characters) | Descriptive title of the account (e.g. *Primary Operating Bank*). |
| **Account Type** | Dropdown Select | **Yes** | Enum (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`) | Determines financial classification and normal balance behavior. |
| **Parent Account** | Searchable Select | Optional | Valid GL Account ID | Links this account as a sub-account under a parent category (e.g. `1110 Cash` under `1100 Current Assets`). |
| **Description** | Textarea | Optional | String | Additional notes or internal instructions regarding account usage. |
| **Status** | Toggle / Select | **Yes** | `active` / `inactive` | Inactive accounts cannot be selected in new vouchers but retain historic transactions. |

---

## 🔄 Parent-Child Hierarchy Rules

1. **Category Header Accounts**: Header accounts (e.g. `1000 Assets`, `1100 Current Assets`, `1200 Bank Accounts`) act as parent grouping containers.
2. **Transaction Postings**: Transactions must always be posted to **leaf accounts** (accounts without child nodes) to maintain audit precision.
3. **Rolled-up Totals**: Parent account totals dynamically sum up all direct child account balances.
4. **Deletion Protection**: An account cannot be deleted if it has child accounts or existing posted transactions.

---

## 🛠️ Step-by-Step Workflows

### 1. Adding a New Account
1. Navigate to `/dashboard/accounts/chart-of-accounts`.
2. Click the **"+ Add Account"** button in the top right.
3. Fill in the **Account Code** (e.g. `6195`) and **Account Name** (e.g. *Software Subscriptions*).
4. Select the **Account Type** (e.g. `EXPENSE`).
5. Select a **Parent Account** (e.g. `6000 Operating Expenses`).
6. Click **Save Account**.

### 2. Toggling Account Status
1. Locate the account in the COA table or tree view.
2. Click the **Status Badge** or **Edit** menu.
3. Switch status between **Active** and **Inactive**.
