# Server Actions Data Flow & Analysis Report: Dashboard & Account Balances

## Executive Summary

This report documents how data is queried, computed, aggregated, and supplied to the dashboard user interface by the Next.js Server Actions in `startup-mvp`. It details the entire data processing pipeline from raw database models (Prisma ORM) to the calculated data structures returned to client components (`BeautifulDashboard.tsx` and `FinancialOverview.tsx`).

---

## 1. Architecture Overview

The system uses Next.js 14+ Server Actions (`"use server"`) to execute all data fetching on the server. There are two primary server action files feeding the dashboard:

```
                  ┌─────────────────────────────────────────────────────────────┐
                  │                    Client Components                        │
                  └──────────────────────────────┬──────────────────────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
      ┌───────────────────────────────────┐             ┌───────────────────────────────────┐
      │  getRealtimeDashboardStats(...)   │             │   getAdminFinancialOverview()     │
      │ (dashboard-realtime.action.ts)    │             │    (admin-dashboard.action.ts)    │
      └─────────────────┬─────────────────┘             └─────────────────┬─────────────────┘
                        │                                                 │
                        ├─────────────────────────────────────────────────┤
                        ▼                                                 ▼
       ┌───────────────────────────────────────────────────────────────────┐
       │                   Prisma ORM & PostgreSQL Database                │
       │  (Sale, Purchase, CashBankAccount, JournalEntryLine, Voucher, Stock)│
       └───────────────────────────────────────────────────────────────────┘
```

---

## 2. Server Action 1: `getRealtimeDashboardStats`

* **File Location**: [dashboard-realtime.action.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/actions/dashboard-realtime.action.ts#L64)
* **Function Signature**:
  ```ts
  export async function getRealtimeDashboardStats(
    warehouseId: string | "all",
    filterType: "today" | "this-week" | "this-month" | "this-year" | "custom",
    customRange?: DateFilterRange,
    chartRange?: "7-days" | "last-month" | "3-months" | "last-year"
  )
  ```

### Step 1: Authentication & Date Bounds
1. Executes `auth()` from `@/lib/auth` to verify user session.
2. Calls `getPeriodDates(filterType, customRange)` using `date-fns` to establish four strict UTC date boundaries:
   * `currentStart` & `currentEnd` (Active selected period)
   * `prevStart` & `prevEnd` (Previous period for growth percentage calculations)

### Step 2: Sales & Revenue Processing (`prisma.sale`)
* Queries sales with `isTrash: false` matching period filters.
* **Calculations**:
  * **Total Revenue**: $\sum \text{grandTotal}$ for current vs. previous period.
  * **Growth Rate**: $\frac{\text{Current Revenue} - \text{Prev Revenue}}{\text{Prev Revenue}} \times 100$.
  * **Discounts**: Separates general discounts from coupon discounts (`couponId`).
  * **Due / Receivables (`getSaleDue`)**: Parses `sale.paymentDetails` JSON object to subtract initial payments (`cashAmount + cardAmount + mfsAmount - changeAmount`) and due collections (`dueCollections` array) from `grandTotal`.

### Step 3: Procurement & Expenses (`prisma.purchase` & `prisma.voucherLine`)
* **Purchases**: Queries `prisma.purchase` to compute total procurement cost.
* **Operational Expenses**: Aggregates `debitAmount` on `prisma.voucherLine` where `Voucher.type === "PAYMENT"`.

### Step 4: Inventory Stock Valuation (`prisma.stock`)
* Queries `prisma.stock` joined with `Item` and `ItemVariant`.
* Evaluates stock items by type:
  * **Retail / Ready Product**: $\text{Quantity} \times \text{Selling Price}$ and $\text{Quantity} \times \text{Cost Price}$.
  * **Wholesale**: $\text{Quantity} \times \text{Wholesale Price}$ and $\text{Quantity} \times \text{Cost Price}$.

### Step 5: Account Balances Processing (`receivedAccounts`)
This is the specific backend pipeline supplying the **Account Balances (By Account)** dashboard section:

```
[CashBankAccount] -> Filter active accounts by Warehouse
        │
        ├──► Query [JournalEntryLine] group-by (debitAmount - creditAmount)
        │
        ├──► Parse POS [Sale.paymentDetails] (cash, card, MFS, dueCollections)
        │
        └──► Query [VoucherLine] credit outflows (expense payouts)
```

1. **Fetch Accounts**: Queries active `prisma.cashBankAccount` records filtered by `warehouseId`.
2. **General Ledger Aggregation (`prisma.journalEntryLine`)**:
   * Groups GL entry lines by `chartOfAccountId` up to `currentEnd`.
   * Computes balance using the standard accounting formula:
     $$\text{GL Balance} = \sum \text{Debit Amount} - \sum \text{Credit Amount}$$
3. **POS Inflow Fallback Processing (`prisma.sale.paymentDetails`)**:
   * Iterates completed sales and parses the `paymentDetails` JSON payload.
   * Tracks initial cash, card, and MFS payments credited to specific account IDs (`cashAccountId`, `cardAccountId`, `mfsAccountId`).
   * Parses nested `dueCollections` payments made within the period.
4. **Voucher Outflow Processing (`prisma.voucherLine`)**:
   * Sums credit amounts minus debit amounts for payment vouchers to compute expense outflows.
5. **Hybrid Fallback Integration**:
   * If an account does not yet have posted journal entries, the action fallback formula applies:
     $$\text{Account Balance} = \text{POS Inflows} - \text{Voucher Outflows}$$
6. **Sorting & Mapping**:
   * Formats into `receivedAccounts` array sorted by type (`CASH`=1, `BANK`=2, `MFS`=3) and alphabetical COA name.

---

## 3. Server Action 2: `getAdminFinancialOverview`

* **File Location**: [admin-dashboard.action.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/actions/admin-dashboard.action.ts#L27)
* **Access Control**: Enforces `checkAdminAccess()` checking for `admin` / `super-admin` role or `reports.view` permission.

### Pipeline Breakdown:
1. **Revenue Accounts (`ChartOfAccount` type `REVENUE`)**:
   * Queries active revenue COA IDs.
   * Aggregates `creditAmount - debitAmount` on `prisma.journalEntryLine` for today and month-to-date.
2. **Expense Accounts (`ChartOfAccount` type `EXPENSE`)**:
   * Queries active expense COA IDs.
   * Aggregates `debitAmount - creditAmount` on `prisma.journalEntryLine` for today and month-to-date.
3. **Cash & Bank Balances (`cashBankBalances`)**:
   * Queries all `CashBankAccount` records joined with `ChartOfAccount`.
   * Runs `prisma.journalEntryLine.aggregate` per account summing debits and credits:
     $$\text{Account Balance} = \sum \text{Debit Amount} - \sum \text{Credit Amount}$$
   * Sums all balances to output `totalLiquidity`.

---

## 4. Database Models Reference Matrix

| Data Metric | Primary Database Model(s) | Aggregation / Calculation Method |
| :--- | :--- | :--- |
| **Total Revenue** | `prisma.sale` | Sum of `grandTotal` for period |
| **Gross Due / Receivables** | `prisma.sale` (with `paymentDetails` JSON) | `grandTotal - initialPaid - dueCollections` |
| **Operational Expenses** | `prisma.voucherLine` | Sum of `debitAmount` where `Voucher.type = PAYMENT` |
| **Inventory Stock Value** | `prisma.stock`, `prisma.item`, `prisma.itemVariant` | $\sum (\text{Quantity} \times \text{Price})$ |
| **Account Balances (Real-Time)** | `prisma.cashBankAccount`, `prisma.journalEntryLine`, `prisma.sale` | General Ledger aggregation ($\text{Debit} - \text{Credit}$) with POS payment JSON fallback |
| **Admin Liquidity** | `prisma.cashBankAccount`, `prisma.journalEntryLine` | GL debit minus credit sum across all asset accounts |

---

## 5. Summary Findings

1. **Dual Calculation Strategy**:
   * The real-time dashboard uses a **hybrid approach** to compute account balances: it first attempts to use posted General Ledger (`JournalEntryLine`) entries, and if zero/unposted, falls back to parsing raw POS payment JSON details and voucher lines.
   * The admin dashboard uses a **strict GL accounting model** ($\sum \text{Debit} - \sum \text{Credit}$).
2. **Parallel Async Queries**:
   * Both server actions utilize `Promise.all()` extensively to execute independent database queries concurrently, minimizing total server round-trip time.
