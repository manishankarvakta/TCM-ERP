# Accounting System Developer Guide

## 1. Directory Structure (`app/dashboard/accounts`)

The accounting module is structured to separate concerns between database actions, UI components, and business logic.

```
app/(dashboard)/dashboard/accounts/
├── chart-of-accounts/      # Ledger management
│   ├── _actions/           # chart-of-accounts.action.tsx (CRUD)
│   └── _components/        # Reusable UI (VoucherForm, list tables)
├── vouchers/               # Core transaction management
│   ├── _actions/           # voucher.action.tsx (Journal Entries)
│   └── _components/        # Reusable UI (VoucherForm, list tables)
├── reports/                # Financial Reporting (Balance Sheet, P&L)
│   ├── _actions/           # report.action.tsx, ar-ap.action.tsx
│   └── _components/        # Reusable UI (VoucherForm, list tables)
└── periods/                # Accounting period management (Locking)
│   ├── _actions/           # periods.action.tsx (CRUD)
│   └── _components/        # Reusable UI (VoucherForm, list tables)
```

---

## 2. Core Modules & Server Actions

### 2.1 Voucher Management (`voucher.action.tsx`)

#### `createVoucher(input, tx?)`
Creates a `DRAFT` voucher.
- **Parameters**: `date`, `type`, `reference`, `lines` (Debit/Credit pairs).
- **Validation**:
  - **Period Lock**: Checks `isPeriodLocked(date)`.
  - **Double Entry**: Debits must equal Credits (tolerance < 0.01).
  - **Line Integrity**: Unique accounts, minimal 2 lines.

#### `postVoucher(voucherId, tx?)`
Finalizes a voucher, creating immutable `JournalEntry` records.
- **Process**: Copies `Voucher` -> `JournalEntry`.
- **Side Effects**: Updates `Voucher.status` to `POSTED`.

### 2.2 Chart of Accounts (`chart-of-accounts.action.tsx`)

#### `createChartOfAccount(input)`
Creates a new Ledger Account.
- **Fields**: `code` (Unique), `name`, `type` (ASSET, LIABILITY, etc.), `parentId` (for hierarchy).
- **Validation**:
  - Enforces code uniqueness.
  - Verifies parent existence and status.

#### `updateChartOfAccount(id, input)`
Updates ledger details.
- **Safeguards**:
  - **Type Change**: Blocked if account has existing transactions (`checkAccountIsUsed`).
  - **Parent Change**: Prevents circular reference hierarchies (`checkCircular`).
  - **Trash**: Blocked if account has children or transactions.

### 2.3 Financial Reporting (`report.action.tsx`)

#### `getTrialBalance(date)`
Summarizes all ledger balances up to a specific date.
- **Formula**: `Sum(Debit) - Sum(Credit)` (or vice versa based on normal balance).
- **Output**: List of accounts with current debit/credit/net balance.

#### `getBalanceSheet(date)`
Generates the Statement of Financial Position.
- **Structure**:
  - **Assets**: `Sum(Debit - Credit)`
  - **Liabilities**: `Sum(Credit - Debit)`
  - **Equity**: `Sum(Credit - Debit) + Net Income`
- **Net Income Calculation**: Derived dynamically from `Revenue - Expenses` up to the date.
- **Validation**: Verifies `Assets = Liabilities + Equity`.

#### `getProfitLoss(startDate, endDate)`
Generates the Income Statement.
- **Logic**:
  - **Revenue**: `Sum(Credit - Debit)` for Revenue accounts.
  - **Expenses**: `Sum(Debit - Credit)` for Expense accounts.
  - **Net Income**: `Revenue - Expenses`.

### 2.4 AR / AP Aging (`ar-ap.action.tsx`)

#### `getAccountsReceivable(date, includeAging)` / `getAccountsPayable`
Generates sub-ledger reports for Clients and Suppliers.
- **Discovery**: Finds the Control Account (e.g., "Accounts Receivable") and queries all child accounts (Individual Client Ledgers).
- **Aging Logic**: Categories balances into `0-30`, `31-60`, `61-90`, `90+` days based on transaction date vs. report date.

---

## 3. Data Flow & Integration Patterns

### 3.1 Transaction Life-Cycle
1.  **Draft**: User/System creates a Voucher. Editable. No impact on Reports.
2.  **Posted**: User commits Voucher. Creates `JournalEntry`. Locked. Updates Reports.
3.  **Reporting**: Reports query `JournalEntryLine` (immutable source of truth).

### 3.2 Period Locking
Before any Write operation (`create`, `update`, `delete`), the system checks `AccountingPeriod`.
- **Function**: `isPeriodLocked(date)`
- **Logic**: Rejects action if date falls within a closed fiscal period.

### 3.3 Control Accounts
System automation relies on specific Ledger IDs configured in `Settings`.
- **Helper**: `findControlAccount(name)` (fuzzy match) used during setup.
- **Guard**: `isControlAccount(id)` prevents manual user posting to automated ledgers (AR/AP/Inventory).

## 4. Extending the System

### Adding a New Report
1.  **Query**: Use `prisma.journalEntryLine.aggregate` to sum `debitAmount` and `creditAmount`.
2.  **Filter**: Always filter by `JournalEntry.date` <= Report Date.
3.  **Group**: Group by `chartOfAccountId` or `ChartOfAccount.type`.

### Adding a New Module Integration
1.  Add configuration keys to `AccountingOperationSettings`.
2.  Use `createVoucher` with `isSystemAction: true` to bypass control account checks.
3.  Always wrap creation and posting in a `prisma.$transaction`.
