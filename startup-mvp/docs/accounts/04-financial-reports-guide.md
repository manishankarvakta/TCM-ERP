# 📊 04. Financial Reports & Analysis Guide

The **Financial Reports & Analysis** suite provides executive insights, balance sheets, income statements, trial balances, general ledgers, and AR/AP aging analysis.

---

## 📍 Reports Navigation & Sitemap

| Report Name | Path / Route | Report Type | Key Metrics & Statements |
| :--- | :--- | :--- | :--- |
| **Balance Sheet** | `/dashboard/accounts/balance-sheet` | Statement of Financial Position | Assets, Liabilities, Equity, Equation Validation. |
| **Profit & Loss** | `/dashboard/accounts/profit-loss` | Income Statement | Revenue, COGS, Gross Profit, Operating Expenses, Net Income. |
| **Trial Balance** | `/dashboard/accounts/trial-balance` | Ledger Summary | Total Debits, Total Credits, Difference Verification. |
| **General Ledger** | `/dashboard/accounts/ledgers` | Transaction Detail | Account transaction history, running debit/credit balances. |
| **Accounts Receivable Aging** | `/dashboard/accounts/accounts-receivable` | Credit & Collections | Customer aging buckets (Current, 1-30, 31-60, 61-90, 90+ days). |
| **Accounts Payable Aging** | `/dashboard/accounts/accounts-payable` | Vendor Liabilities | Supplier aging buckets (Current, 1-30, 31-60, 61-90, 90+ days). |

---

## 🏛️ 1. Balance Sheet Report Guide

The Balance Sheet evaluates the company's financial position as of a specific date based on the fundamental accounting equation:

$$\mathbf{Total\ Assets = Total\ Liabilities + Total\ Equity}$$

### Core Features & UI Controls
* **Date Filter**: Select any historical date to generate point-in-time balance sheets.
* **Collapsible Hierarchy**: Click any parent category (e.g. `1100 Current Assets`, `3110 Owner's Capital`) to expand or collapse sub-accounts.
* **Global Expand/Collapse**: Use the `↕` icons on section headers to expand or collapse all cards simultaneously.
* **Single Root Unwrapping**: Main type containers (`1000 Assets`, `2000 Liabilities`, `3000 Equity`) are unwrapped so card headers present direct sub-categories (`Current Assets`, `Fixed Assets`, `Owner's Capital`).
* **Zero-Leaf Filtering**: Accounts with `$0.00` balance and no child activity are hidden automatically.
* **Footer Summary Bar**: Displays **Total Assets**, **=**, **Liabilities + Equity**, **Difference**, and **`✓ Balanced`** status badge.
* **Print & Export**: Click **Print** to export a clean 3-column PDF/paper printout.

---

## 📈 2. Profit & Loss (Income Statement) Guide

The P&L measures financial performance over a given date range:

$$\mathbf{Gross\ Profit = Operating\ Revenue - Cost\ of\ Goods\ Sold}$$
$$\mathbf{Net\ Income = Gross\ Profit - Operating\ Expenses}$$

* **Operating Revenue**: Sum of credit balances in `4000` series accounts (`4110 Sales Revenue`, `4120 Service Revenue`).
* **Cost of Goods Sold (COGS)**: Sum of debit balances in `5000` series accounts (`5110 COGS`).
* **Operating Expenses**: Sum of debit balances in `6000` series accounts (Rent, Salaries, Utilities, Depreciation).
* **Net Income Link**: Net Income dynamically feeds into the Balance Sheet under Equity line `3130 Net Income (Current Year)`.

---

## ⏱️ 3. Accounts Receivable & Payable Aging Guide

Aging analysis categorizes unpaid invoices and bills by overdue duration:

* **Current**: Invoices within payment terms.
* **1–30 Days**: 1 month overdue.
* **31–60 Days**: 2 months overdue.
* **61–90 Days**: 3 months overdue.
* **90+ Days**: Critical overdue balances requiring collection/escalation.
