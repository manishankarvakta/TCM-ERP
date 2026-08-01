# UI & Codebase Analysis Report: Account Balances (By Account) Section

## 📌 Section Overview

This report provides a detailed analysis of the **Account Balances (By Account)** section displayed on the main dashboard (`/dashboard`). This section provides real-time liquidity visibility across all active **Cash**, **Bank**, and **Mobile Financial Services (MFS)** accounts registered in the system.

---

## 🎨 Visual & UI Design Architecture

Referencing the screenshot provided, the section is composed of a dynamic, highly responsive grid of individual account cards:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ACCOUNT BALANCES (BY ACCOUNT)                                                                   │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────────────┤
│ CASH 1112 🪙│ CASH 1110 🪙│ CASH 1111 🪙│ CASH 1113 🪙│ CASH 1300 🪙│ BANK 1200          💳│
│ Cash(Aziz) ৳0│ Cash(Fact) ৳0│ Cash(Guli) ৳0│ Cash(Rang) ৳0│ Dig Wallet ৳0│ Bank Accounts      ৳0│
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────────────┤
│ BANK 1223 💳│ BANK 1221 💳│ BANK 1222 💳│ BANK 1224 💳│ BANK 1213 💳│ BANK 1210          💳│
│ BRAC(Aziz) ৳0│ BRAC(Fact) ৳0│ BRAC(Guli) ৳0│ BRAC(Rang) ৳0│ DBBL(Aziz) ৳0│ DBBL (Factory)     ৳0│
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────────────┤
│ MFS 1312  👛│ MFS 1311  👛│ MFS 1313  👛│ MFS 1310  👛│ MFS 1322  👛│ MFS 1320           👛│
│ bKash(Aziz)৳0│ bKash(Guli)৳0│ bKash(Rang)৳0│ bKash Fact ৳0│ Nagad(Aziz)৳0│ Nagad (Factory)    ৳0│
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────────────┘
```

### 1. Responsive Grid Configuration
* **CSS Class**: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3`
* **Behavior**: Displays 2 columns on mobile screens, scaling smoothly up to 6 columns on extra-large desktop screens (`xl`).

### 2. Account Type Color Coding & Iconography
Each account card is color-coded based on its financial account type (`CASH`, `BANK`, or `MFS`):

| Account Type | Badge & Icon Color Theme | Lucide Icon | Example Accounts from Screenshot |
| :--- | :--- | :--- | :--- |
| **`CASH`** | Emerald Theme (`bg-emerald-50/50`, `text-emerald-600`) | `Coins` (🪙) | Cash (Aziz Super), Cash (Factory), Cash (Gulisthan), Cash (Rangpur) |
| **`BANK`** | Blue Theme (`bg-blue-50/50`, `text-blue-600`) | `CreditCard` (💳) | BRAC (Aziz Super), DBBL (Factory), MTB (Rangpur), Bank Accounts |
| **`MFS`** | Purple Theme (`bg-purple-50/50`, `text-purple-600`) | `Wallet` (👛) | bKash (Aziz Super), Nagad (Factory), Rocket (Gulisthan) |

### 3. Card Anatomical Layout (`h-[74px] p-3 rounded-xl`)
Each card is rendered inside a clickable Next.js `<Link>` container divided into two horizontal flex rows:
* **Top Row**:
  - **Left**: Account Type Badge (e.g. `CASH`, `BANK`, `MFS`) + Chart of Account Code (e.g. `1112`, `1223`, `1312`).
  - **Right**: Type-specific Icon inside a rounded container (`p-1.5 rounded-lg`).
* **Bottom Row**:
  - **Left**: Account Name (truncated with ellipsis if long, full name shown via tooltip title).
  - **Right**: Current Calculated Balance formatted in Taka (`৳ 0`).

---

## 💻 Codebase Source File & Component Logic

### Component Location
* **File**: [BeautifulDashboard.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/components/dashboard/BeautifulDashboard.tsx#L686-L786)
* **Lines**: **686 – 786**

```tsx
{/* Account Balances Section */}
<div className="space-y-2">
  <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
    Account Balances (By Account)
  </h2>
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
    {loading ? (
      // 1. Skeleton Loading State (6 pulsing card placehholders)
      [1, 2, 3, 4, 5, 6].map((i) => ( ... ))
    ) : !stats?.receivedAccounts || stats.receivedAccounts.length === 0 ? (
      // 2. Empty State Notification Banner
      <div className="col-span-full p-4 text-center text-xs text-slate-400 bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/80 rounded-xl">
        No active cash, bank, or MFS accounts found for the selected warehouse.
      </div>
    ) : (
      // 3. Mapped Account Cards Array
      stats.receivedAccounts.map((account: any) => {
        ...
      })
    )}
  </div>
</div>
```

---

## 🔄 Backend Data Supply & Sorting Logic

* **Server Action**: `getRealtimeDashboardStats(...)` in [dashboard-realtime.action.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/actions/dashboard-realtime.action.ts#L593-L615)
* **Data Object Array**: `stats.receivedAccounts`

### 1. Item Data Schema
Each account object passed to the UI contains the following fields:
```ts
{
  id: "cly...",             // CashBankAccount Prisma ID
  type: "CASH" | "BANK" | "MFS",
  coaId: "cly...",          // ChartOfAccount ID
  coaCode: "1112",          // Chart of Account Code
  coaName: "Cash (Aziz Super)", // Account Title
  receivedAmount: 0        // Net calculated balance in ৳
}
```

### 2. Sorting Hierarchy
Accounts are sorted on the server before being sent to the client:
1. **Type Priority**: `CASH` (Order 1) ➔ `BANK` (Order 2) ➔ `MFS` (Order 3).
2. **Alphabetical Secondary Sort**: Sorted by `coaName` within the same type group.

### 3. Real-Time Balance Calculation Engine
The balance (`receivedAmount`) displayed on each card is computed using a dual-engine formula:
1. **Primary GL Ledger Calculation**:
   $$\text{Balance} = \sum \text{Debit Amount} - \sum \text{Credit Amount} \quad \text{(from JournalEntryLine)}$$
2. **Fallback POS & Voucher Inflow/Outflow Engine**:
   If no journal entries exist for an account:
   $$\text{Balance} = \text{POS Payment Inflows} - \text{Voucher Outflows}$$

---

## 🔗 Interactivity & Deep Links

Clicking on any account card in this section automatically navigates the user to the General Ledger report for that specific account while preserving the active dashboard date range filter:

```ts
href={`/dashboard/accounts/ledgers?accountId=${account.coaId}${dateParams}`}
```

* **Target URL**: `/dashboard/accounts/ledgers`
* **Query Parameters**:
  * `accountId`: Passes `account.coaId`
  * `dateFrom`: Start date of selected dashboard filter (e.g. `2026-08-01`)
  * `dateTo`: End date of selected dashboard filter (e.g. `2026-08-02`)

---

## 📊 Summary Matrix

| Attribute | Details |
| :--- | :--- |
| **Section Title** | `Account Balances (By Account)` |
| **UI File** | `startup-mvp/components/dashboard/BeautifulDashboard.tsx` (L686–786) |
| **Action File** | `startup-mvp/app/actions/dashboard-realtime.action.ts` (L593–615) |
| **Data Array** | `stats.receivedAccounts` |
| **Account Types** | `CASH` (Emerald), `BANK` (Blue), `MFS` (Purple) |
| **Card Target Link** | `/dashboard/accounts/ledgers?accountId={coaId}&dateFrom={from}&dateTo={to}` |
