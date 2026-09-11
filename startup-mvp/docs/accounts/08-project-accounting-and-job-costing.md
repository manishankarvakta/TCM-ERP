# 📊 08. Project Accounting & Job Costing Guide

The **Project Accounting & Job Costing** module tracks financial revenues, direct expenses, subcontracting costs, and net margins on a per-project / per-contract basis.

---

## 📍 Navigation
* **URL**: `/dashboard/accounts/project-ledger`
* **Sidebar**: `Finance` ➔ `Project Ledger`

---

## 🏗️ Core Concept: Project Tagging on Vouchers

Every voucher line item can optionally tag a specific **Project**:
* **Project Revenues**: Receipts credited to Revenue GL accounts tagged with a `projectId`.
* **Project Direct Costs**: Payments debited to Expense GL accounts (or COGS) tagged with a `projectId`.
* **Project Net Profitability**:

$$\mathbf{Project\ Net\ Margin = Project\ Tagged\ Revenue - Project\ Tagged\ Costs}$$

---

## 📑 Features & Project Ledger Reporting

1. **Project Cost Filtering**: Select any active project to view all linked debit and credit transactions.
2. **Budget vs Actual Tracking**: Compare budgeted project expenses against actual posted voucher expenses.
3. **Labor & Overhead Allocation**: Allocate staff salary vouchers and vendor bills to project cost centers.
