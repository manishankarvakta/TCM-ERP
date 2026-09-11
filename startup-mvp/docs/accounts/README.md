# 📘 Accounts & Financial Management Module — Complete User Manual

Welcome to the comprehensive user manual for the **Accounts & Financial Management Module** of the ERP/CRM system. This manual provides an end-to-end guide covering navigation, data entry forms, financial reporting, double-entry accounting rules, and period-closing workflows.

---

## 🗺️ Navigation Map & Sitemap

All accounts submodules are accessible via the main sidebar under **Finance / Accounts** (`/dashboard/accounts/*`).

| Submodule Name | Path / Route | Core Function |
| :--- | :--- | :--- |
| **Chart of Accounts** | `/dashboard/accounts/chart-of-accounts` | Master list of all GL accounts, 5-type account structure, multi-level parent-child hierarchy. |
| **Cash & Bank Accounts** | `/dashboard/accounts/cash-bank` | Management of Cash, Bank Accounts, and MFS/Digital Wallets (bKash, Nagad, Rocket). |
| **Vouchers & Journal Entries** | `/dashboard/accounts/vouchers` | Recording Receipts, Payments, and Journal Vouchers with double-entry validation. |
| **Balance Sheet Report** | `/dashboard/accounts/balance-sheet` | Hierarchical financial position report ($\text{Assets} = \text{Liabilities} + \text{Equity}$). |
| **Profit & Loss Statement** | `/dashboard/accounts/profit-loss` | Income Statement showing Revenue, COGS, Operating Expenses, and Net Income. |
| **Trial Balance** | `/dashboard/accounts/trial-balance` | Summary of Debit and Credit totals per account with balance validation. |
| **General Ledger** | `/dashboard/accounts/ledgers` | Account-by-account transaction history with running balances. |
| **Accounts Receivable (AR)** | `/dashboard/accounts/accounts-receivable` | Customer balance tracking and aging buckets (0–30, 31–60, 61–90, 90+ days). |
| **Accounts Payable (AP)** | `/dashboard/accounts/accounts-payable` | Vendor balance tracking and supplier credit aging buckets. |
| **Invoices & Billing** | `/dashboard/accounts/invoices` | Sales invoice generation, billing line items, payment status tracking. |
| **Collections** | `/dashboard/accounts/collections` | Customer payment receipts, money receipts, AR settlement allocation. |
| **Fixed Assets** | `/dashboard/accounts/fixed-assets` | Physical asset tracking (`1700` series), capitalization, monthly depreciation, disposals. |
| **Project Ledger** | `/dashboard/accounts/project-ledger` | Project-wise job costing, project expense allocation, margin tracking. |
| **Accounting Periods** | `/dashboard/accounts/periods` | Financial period creation, period locking, and month-end/year-end closing. |

---

## 📑 Manual Documentation Index

1. **[Chart of Accounts Guide](./01-chart-of-accounts-guide.md)** — Account Types, Hierarchy Setup, Form Fields, Rules.
2. **[Cash & Bank Management](./02-cash-and-bank-management.md)** — Cash, Bank & MFS Account Setup, Opening Balances, Reconciliation.
3. **[Vouchers & Journal Entries](./03-vouchers-and-journal-entries.md)** — Receipt, Payment, and Journal Vouchers, Form Field Specs, Storno Reversals.
4. **[Financial Reports Guide](./04-financial-reports-guide.md)** — Balance Sheet, P&L, Trial Balance, Aging Analysis & Ledger Workflows.
5. **[Accounting Periods & Closing](./05-accounting-periods-and-closing.md)** — Period Opening/Closing, Lock Enforcement, Financial Controls.
6. **[Fixed Assets Management](./06-fixed-assets-management.md)** — Asset Registration, Capitalization Vouchers, Monthly Depreciation, Disposals & NBV.
7. **[Invoices & Collections Guide](./07-invoices-and-collections-guide.md)** — Invoicing, Billing Line Items, Customer Collections & Money Receipts.
8. **[Project Accounting & Job Costing](./08-project-accounting-and-job-costing.md)** — Project-level Expense Tagging, Job Costing & Profitability.

---

## 🔐 Security & Permissions

Access to accounts submodules is governed by RBAC (Role-Based Access Control) permissions:

* `accounts.chart-of-accounts` (`read`, `create`, `update`, `delete`)
* `accounts.cash-bank` (`read`, `create`, `update`, `delete`)
* `accounts.vouchers` (`read`, `create`, `update`, `delete`, `post`, `cancel`)
* `accounts.balance-sheet` (`read`, `view`)
* `accounts.profit-loss` (`read`, `view`)
* `accounts.trial-balance` (`read`, `view`)
* `accounts.periods` (`read`, `manage`)
