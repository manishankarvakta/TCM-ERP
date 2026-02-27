# Accounts Module - Current Status Technical Document

**Document Purpose**: Comprehensive technical status assessment for Accounts module integration  
**Target Audience**: Senior architect for analysis  
**Date**: 2025-01-XX  
**Status**: Production-grade Next.js + Prisma + Server Actions application

---

## 1. SYSTEM OVERVIEW

### Tech Stack
- **Framework**: Next.js 16.0.0 (App Router)
- **React**: 19.2.0
- **Database ORM**: Prisma 6.18.0
- **Database**: PostgreSQL (via Prisma)
- **Authentication**: NextAuth 5.0.0-beta.29
- **Form Handling**: React Hook Form 7.65.0 with Zod 4.1.12
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: React hooks (useState, useTransition) - no global state library for accounts module
- **Styling**: Tailwind CSS 4

### State Management Approach
- Server Components for data fetching
- Client Components for interactive UI
- Server Actions for mutations
- No Redux/Context for accounts module state
- URL search params for filtering/pagination

### Auth & Permissions System (High-Level)
- **Authentication**: NextAuth with credentials provider
- **Session Management**: Database-backed sessions (Session model)
- **Permission System**: 
  - Template-based (PermissionTemplate) with user overrides (UserPermission)
  - Permission keys follow pattern: `module.submodule` (e.g., `accounts.vouchers`)
  - Operations: `create`, `view`, `read`, `edit`, `update`, `move-to-trash`, `delete-permanently`, `export`, `approve`
  - Permission checks via `hasPermission(userId, permissionKey, operation)` function
  - Cached permissions with revalidation tags

### ORM & Database
- **ORM**: Prisma Client
- **Database**: PostgreSQL
- **Migrations**: Prisma migrations
- **Connection**: Via `DATABASE_URL` environment variable

### Folder Structure (Relevant Parts)
```
startup-mvp/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/accounts/
│   │   │   ├── chart-of-accounts/
│   │   │   │   ├── _actions/
│   │   │   │   │   └── chart-of-accounts.action.tsx
│   │   │   │   ├── _components/
│   │   │   │   │   └── chart-of-accounts-list.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── vouchers/
│   │   │   │   ├── _actions/
│   │   │   │   │   └── voucher.action.tsx
│   │   │   │   ├── _components/
│   │   │   │   │   └── vouchers-list.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── ledgers/
│   │   │   │   ├── _actions/
│   │   │   │   │   └── ledger.action.tsx
│   │   │   │   ├── _components/
│   │   │   │   │   └── ledger-view.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── trial-balance/
│   │   │   ├── balance-sheet/
│   │   │   ├── profit-loss/
│   │   │   ├── cash-bank/
│   │   │   ├── accounts-receivable/
│   │   │   ├── accounts-payable/
│   │   │   └── reports/
│   │   │       └── _actions/
│   │   │           ├── report.action.tsx
│   │   │           └── ar-ap.action.tsx
│   │   └── admin/accounts/ (placeholder pages)
│   └── actions/
│       └── quotation-accounting-integration.ts
├── prisma/
│   └── schema.prisma
└── types/
    └── permissions.ts
```

---

## 2. ACCOUNTS MODULE SCOPE

### Chart of Accounts
- **Status**: PARTIAL
- **Files Involved**:
  - `app/(dashboard)/dashboard/accounts/chart-of-accounts/page.tsx`
  - `app/(dashboard)/dashboard/accounts/chart-of-accounts/_actions/chart-of-accounts.action.tsx`
  - `app/(dashboard)/dashboard/accounts/chart-of-accounts/_components/chart-of-accounts-list.tsx`
  - `app/(dashboard)/admin/accounts/chart-of-accounts/page.tsx` (placeholder)
- **Routes Involved**:
  - `/dashboard/accounts/chart-of-accounts` (EXISTS - functional)
  - `/admin/accounts/chart-of-accounts` (EXISTS - placeholder only)
- **Server Actions Involved**:
  - `getChartOfAccounts()` - WORKING
  - `getChartOfAccountById()` - WORKING
  - `createChartOfAccount()` - NOT IMPLEMENTED
  - `updateChartOfAccount()` - NOT IMPLEMENTED
  - `deleteChartOfAccount()` - NOT IMPLEMENTED
  - `moveToTrashChartOfAccount()` - NOT IMPLEMENTED
- **Notes**: List view renders, but no create/edit forms exist. Add button links to `/dashboard/accounts/chart-of-accounts/add` which does not exist.

### Vouchers
- **Status**: PARTIAL
- **Files Involved**:
  - `app/(dashboard)/dashboard/accounts/vouchers/page.tsx`
  - `app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action.tsx`
  - `app/(dashboard)/dashboard/accounts/vouchers/_components/vouchers-list.tsx`
  - `app/(dashboard)/admin/accounts/vouchers/page.tsx` (placeholder)
- **Routes Involved**:
  - `/dashboard/accounts/vouchers` (EXISTS - functional)
  - `/admin/accounts/vouchers` (EXISTS - placeholder only)
- **Server Actions Involved**:
  - `listVouchers()` - WORKING
  - `getVoucherById()` - WORKING
  - `createVoucher()` - WORKING
  - `postVoucher()` - WORKING
  - `updateVoucher()` - NOT IMPLEMENTED
  - `deleteVoucher()` - NOT IMPLEMENTED
  - `cancelVoucher()` - NOT IMPLEMENTED
- **Notes**: List and create operations work. Posting vouchers works. No edit/delete/cancel functionality. Add button links to `/dashboard/accounts/vouchers/add` which does not exist.

### Journal Entries
- **Status**: EXISTS (indirect)
- **Files Involved**: None (no dedicated pages)
- **Routes Involved**: None
- **Server Actions Involved**: None (created automatically when vouchers are posted)
- **Notes**: JournalEntry and JournalEntryLine models exist in schema. Journal entries are created automatically when vouchers are posted via `postVoucher()`. No direct UI for viewing/managing journal entries separately.

### Account Ledger
- **Status**: EXISTS
- **Files Involved**:
  - `app/(dashboard)/dashboard/accounts/ledgers/page.tsx`
  - `app/(dashboard)/dashboard/accounts/ledgers/_actions/ledger.action.tsx`
  - `app/(dashboard)/dashboard/accounts/ledgers/_components/ledger-view.tsx`
- **Routes Involved**:
  - `/dashboard/accounts/ledgers` (EXISTS - functional)
- **Server Actions Involved**:
  - `getAccountLedger()` - WORKING
- **Notes**: Read-only view. Displays ledger entries derived from JournalEntryLine. Requires accountId parameter. Date range filtering supported.

### Trial Balance
- **Status**: EXISTS
- **Files Involved**:
  - `app/(dashboard)/dashboard/accounts/trial-balance/page.tsx`
  - `app/(dashboard)/dashboard/accounts/trial-balance/_components/trial-balance-view.tsx`
  - `app/(dashboard)/dashboard/accounts/reports/_actions/report.action.tsx`
- **Routes Involved**:
  - `/dashboard/accounts/trial-balance` (EXISTS - functional)
- **Server Actions Involved**:
  - `getTrialBalance()` - WORKING
- **Notes**: Report view renders correctly. Date selection supported. Export functionality status: UNKNOWN.

### Balance Sheet
- **Status**: EXISTS
- **Files Involved**:
  - `app/(dashboard)/dashboard/accounts/balance-sheet/page.tsx`
  - `app/(dashboard)/dashboard/accounts/balance-sheet/_components/balance-sheet-view.tsx`
  - `app/(dashboard)/dashboard/accounts/reports/_actions/report.action.tsx`
- **Routes Involved**:
  - `/dashboard/accounts/balance-sheet` (EXISTS - functional)
- **Server Actions Involved**:
  - `getBalanceSheet()` - WORKING
- **Notes**: Report view renders correctly. Date selection supported. Includes validation for Assets = Liabilities + Equity. Export functionality status: UNKNOWN.

### Profit & Loss
- **Status**: EXISTS
- **Files Involved**:
  - `app/(dashboard)/dashboard/accounts/profit-loss/page.tsx`
  - `app/(dashboard)/dashboard/accounts/profit-loss/_components/profit-loss-view.tsx`
  - `app/(dashboard)/dashboard/accounts/reports/_actions/report.action.tsx`
- **Routes Involved**:
  - `/dashboard/accounts/profit-loss` (EXISTS - functional)
- **Server Actions Involved**:
  - `getProfitLoss()` - WORKING
- **Notes**: Report view renders correctly. Date range selection supported. Export functionality status: UNKNOWN.

### Cash & Bank
- **Status**: NOT IMPLEMENTED
- **Files Involved**:
  - `app/(dashboard)/dashboard/accounts/cash-bank/page.tsx` (placeholder only)
  - `app/(dashboard)/admin/accounts/cash-bank/page.tsx` (placeholder only)
- **Routes Involved**:
  - `/dashboard/accounts/cash-bank` (EXISTS - placeholder)
  - `/admin/accounts/cash-bank` (EXISTS - placeholder)
- **Server Actions Involved**: None
- **Notes**: Page exists but only displays "No data yet" message. No Prisma models exist for CashBankAccount or CashBankTransaction (mentioned in documentation but not in schema).

### Accounts Receivable
- **Status**: EXISTS
- **Files Involved**:
  - `app/(dashboard)/dashboard/accounts/accounts-receivable/page.tsx`
  - `app/(dashboard)/dashboard/accounts/accounts-receivable/_components/ar-view.tsx`
  - `app/(dashboard)/dashboard/accounts/reports/_actions/ar-ap.action.tsx`
- **Routes Involved**:
  - `/dashboard/accounts/accounts-receivable` (EXISTS - functional)
- **Server Actions Involved**:
  - `getAccountsReceivable()` - WORKING
- **Notes**: Report view renders correctly. Calculated from JournalEntryLine entries linked to Accounts Receivable control account. Supports aging analysis. Export functionality status: UNKNOWN.

### Accounts Payable
- **Status**: EXISTS
- **Files Involved**:
  - `app/(dashboard)/dashboard/accounts/accounts-payable/page.tsx`
  - `app/(dashboard)/dashboard/accounts/accounts-payable/_components/ap-view.tsx`
  - `app/(dashboard)/dashboard/accounts/reports/_actions/ar-ap.action.tsx`
- **Routes Involved**:
  - `/dashboard/accounts/accounts-payable` (EXISTS - functional)
- **Server Actions Involved**:
  - `getAccountsPayable()` - WORKING
- **Notes**: Report view renders correctly. Calculated from JournalEntryLine entries linked to Accounts Payable control account. Supports aging analysis. Export functionality status: UNKNOWN.

---

## 3. PRISMA SCHEMA STATUS

### Accounting-Related Models

#### ChartOfAccount
- **File**: `prisma/schema.prisma` (lines 674-697)
- **Fields**:
  - `id`: String (cuid)
  - `code`: String (unique)
  - `name`: String
  - `type`: AccountType enum (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
  - `parentId`: String? (nullable, for hierarchy)
  - `description`: String? (nullable, Text)
  - `status`: String (default: "active") - active, inactive, trash
  - `createdBy`: String
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
- **Relations**:
  - `parent`: ChartOfAccount? (self-referential, AccountHierarchy)
  - `children`: ChartOfAccount[] (self-referential, AccountHierarchy)
  - `creator`: User (ChartOfAccountCreator)
  - `voucherLines`: VoucherLine[]
  - `journalEntryLines`: JournalEntryLine[]
- **Indexes**: code, type, parentId, status, createdBy
- **Notes**: Used in vouchers and journal entries. No `openingBalance` or `currentBalance` fields (balances calculated from JournalEntryLine). No `isSystem` flag. Status field used for soft delete (trash).

#### Voucher
- **File**: `prisma/schema.prisma` (lines 699-738)
- **Fields**:
  - `id`: String (cuid)
  - `voucherNumber`: String (unique, auto-generated)
  - `date`: DateTime
  - `type`: VoucherType enum (PAYMENT, RECEIPT, JOURNAL, CONTRA, SALES, PURCHASE)
  - `reference`: String? (nullable)
  - `description`: String? (nullable, Text)
  - `status`: String (default: "draft") - draft, posted, cancelled
  - `createdBy`: String
  - `postedById`: String? (nullable)
  - `postedAt`: DateTime? (nullable)
  - `clientId`: String? (nullable)
  - `supplierId`: String? (nullable)
  - `userId`: String? (nullable)
  - `organizationId`: String? (nullable)
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
- **Relations**:
  - `creator`: User (VoucherCreator)
  - `postedBy`: User? (VoucherPostedBy)
  - `user`: User? (VoucherUser)
  - `client`: Client?
  - `supplier`: Supplier?
  - `organization`: Organization?
  - `voucherLines`: VoucherLine[]
  - `journalEntries`: JournalEntry[]
- **Indexes**: voucherNumber, date, type, status, createdBy, postedById, clientId, supplierId, userId, organizationId
- **Notes**: Used for draft vouchers. When posted, creates JournalEntry. Status transitions: draft → posted (via postVoucher). No `totalAmount` field (calculated from lines).

#### VoucherLine
- **File**: `prisma/schema.prisma` (lines 740-769)
- **Fields**:
  - `id`: String (cuid)
  - `lineNumber`: Int
  - `debitAmount`: Decimal (default: 0, 12,2)
  - `creditAmount`: Decimal (default: 0, 12,2)
  - `description`: String? (nullable, Text)
  - `voucherId`: String
  - `chartOfAccountId`: String
  - `clientId`: String? (nullable)
  - `supplierId`: String? (nullable)
  - `userId`: String? (nullable)
  - `organizationId`: String? (nullable)
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
- **Relations**:
  - `voucher`: Voucher (Cascade delete)
  - `chartOfAccount`: ChartOfAccount (Restrict delete)
  - `client`: Client? (VoucherLineClient)
  - `supplier`: Supplier? (VoucherLineSupplier)
  - `user`: User? (VoucherLineUser)
  - `organization`: Organization? (VoucherLineOrganization)
- **Indexes**: voucherId, chartOfAccountId, clientId, supplierId, userId, organizationId
- **Notes**: Part of draft vouchers. Copied to JournalEntryLine when voucher is posted.

#### JournalEntry
- **File**: `prisma/schema.prisma` (lines 771-790)
- **Fields**:
  - `id`: String (cuid)
  - `entryNumber`: String (unique, auto-generated)
  - `date`: DateTime
  - `voucherId`: String
  - `description`: String? (nullable, Text)
  - `status`: String (default: "posted") - Always posted (immutable)
  - `createdBy`: String
  - `postedBy`: String
  - `postedAt`: DateTime
  - `createdAt`: DateTime
- **Relations**:
  - `voucher`: Voucher (Restrict delete)
  - `journalEntryLines`: JournalEntryLine[]
- **Indexes**: entryNumber, date, voucherId, status
- **Notes**: Created when voucher is posted. Immutable (status always "posted"). Used as source of truth for ledger calculations.

#### JournalEntryLine
- **File**: `prisma/schema.prisma` (lines 792-820)
- **Fields**:
  - `id`: String (cuid)
  - `lineNumber`: Int
  - `debitAmount`: Decimal (default: 0, 12,2)
  - `creditAmount`: Decimal (default: 0, 12,2)
  - `description`: String? (nullable, Text)
  - `journalEntryId`: String
  - `chartOfAccountId`: String
  - `clientId`: String? (nullable)
  - `supplierId`: String? (nullable)
  - `userId`: String? (nullable)
  - `organizationId`: String? (nullable)
  - `createdAt`: DateTime
- **Relations**:
  - `journalEntry`: JournalEntry (Cascade delete)
  - `chartOfAccount`: ChartOfAccount (Restrict delete)
  - `client`: Client? (JournalEntryLineClient)
  - `supplier`: Supplier? (JournalEntryLineSupplier)
  - `user`: User? (JournalEntryLineUser)
  - `organization`: Organization? (JournalEntryLineOrganization)
- **Indexes**: journalEntryId, chartOfAccountId, clientId, supplierId, userId, organizationId
- **Notes**: Source of truth for all ledger calculations. Immutable once created. Used by Trial Balance, Balance Sheet, P&L, Ledgers, AR, AP reports.

### Enums

#### AccountType
- **Values**: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
- **Note**: REVENUE used instead of INCOME (as mentioned in documentation)

#### VoucherType
- **Values**: PAYMENT, RECEIPT, JOURNAL, CONTRA, SALES, PURCHASE

### Missing Models (Documented but Not in Schema)
- `CashBankAccount` - NOT IN SCHEMA
- `CashBankTransaction` - NOT IN SCHEMA
- `LedgerEntry` - NOT IN SCHEMA (ledger data derived from JournalEntryLine)

---

## 4. SERVER ACTIONS STATUS

### Chart of Accounts Actions
**File**: `app/(dashboard)/dashboard/accounts/chart-of-accounts/_actions/chart-of-accounts.action.tsx`

#### getChartOfAccounts
- **Purpose**: Get paginated list of chart of accounts with search and status filtering
- **Input**: `page: number, limit: number, search: string, status: "active" | "inactive" | "trash" | "all"`
- **Output**: `{ success: boolean, accounts: ChartOfAccount[], pagination: {...}, error?: string }`
- **Status**: WORKING
- **Known Errors**: None observed

#### getChartOfAccountById
- **Purpose**: Get single chart of account by ID with relations
- **Input**: `accountId: string`
- **Output**: `{ success: boolean, account: ChartOfAccount | null, error?: string }`
- **Status**: WORKING
- **Known Errors**: None observed

#### createChartOfAccount
- **Status**: NOT IMPLEMENTED
- **File**: Does not exist

#### updateChartOfAccount
- **Status**: NOT IMPLEMENTED
- **File**: Does not exist

#### deleteChartOfAccount / moveToTrashChartOfAccount
- **Status**: NOT IMPLEMENTED
- **File**: Does not exist

### Voucher Actions
**File**: `app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action.tsx`

#### listVouchers
- **Purpose**: Get paginated list of vouchers with search, status, type, and date filters
- **Input**: `page: number, limit: number, search: string, status: "draft" | "posted" | "cancelled" | "all", type?: string, dateFrom?: Date | string, dateTo?: Date | string`
- **Output**: `{ success: boolean, vouchers: Voucher[], pagination: {...}, error?: string }`
- **Status**: WORKING
- **Known Errors**: None observed
- **Permission Check**: Checks `accounts.vouchers` with `read` or `view` operation

#### getVoucherById
- **Purpose**: Get single voucher by ID with all relations (lines, journal entries)
- **Input**: `voucherId: string`
- **Output**: `{ success: boolean, voucher: Voucher | null, error?: string }`
- **Status**: WORKING
- **Known Errors**: None observed
- **Permission Check**: Checks `accounts.vouchers` with `read` or `view` operation

#### createVoucher
- **Purpose**: Create a new draft voucher with lines
- **Input**: `{ date?: Date | string, type: string, reference?: string, description?: string, clientId?: string, supplierId?: string, userId?: string, organizationId?: string, lines: Array<{...}> }`
- **Output**: `{ success: boolean, voucher: Voucher | null, error?: string }`
- **Status**: WORKING
- **Known Errors**: 
  - Returns error if voucher lines validation fails (double-entry mismatch, < 2 lines, etc.)
  - Returns error if chart of accounts are invalid or inactive
- **Permission Check**: Checks `accounts.vouchers` with `create` operation
- **Validation**: 
  - Validates double-entry balance (debits = credits)
  - Validates each line has either debit OR credit (not both, not neither)
  - Validates all chart of accounts exist and are active

#### postVoucher
- **Purpose**: Post a draft voucher (creates JournalEntry and locks voucher)
- **Input**: `voucherId: string`
- **Output**: `{ success: boolean, voucher: Voucher | null, journalEntry: JournalEntry | null, error?: string }`
- **Status**: WORKING
- **Known Errors**:
  - Returns error if voucher not found
  - Returns error if voucher status is not "draft"
  - Returns error if voucher lines validation fails
  - Returns error if journal entry already exists
- **Permission Check**: Checks `accounts.vouchers` with `update` or `approve` operation
- **Transaction**: Uses Prisma transaction to ensure atomicity

#### updateVoucher
- **Status**: NOT IMPLEMENTED
- **File**: Does not exist

#### deleteVoucher / cancelVoucher
- **Status**: NOT IMPLEMENTED
- **File**: Does not exist

### Ledger Actions
**File**: `app/(dashboard)/dashboard/accounts/ledgers/_actions/ledger.action.tsx`

#### getAccountLedger
- **Purpose**: Get account ledger entries derived from JournalEntryLine (read-only)
- **Input**: `accountId: string, filters?: { dateFrom?: Date | string, dateTo?: Date | string }`
- **Output**: `{ success: boolean, ledger: LedgerEntry[], summary: { totalDebit: number, totalCredit: number, balance: number }, error?: string }`
- **Status**: WORKING
- **Known Errors**:
  - Returns error if account not found
  - Returns error if account is not active
  - Returns error if dateFrom > dateTo
- **Permission Check**: Checks `accounts.ledgers` with `read` or `view` operation
- **Notes**: Read-only operation. Data derived from JournalEntryLine, not a separate model.

### Report Actions
**File**: `app/(dashboard)/dashboard/accounts/reports/_actions/report.action.tsx`

#### getTrialBalance
- **Purpose**: Get trial balance - summary of all account balances up to a specific date
- **Input**: `date: Date | string`
- **Output**: `{ success: boolean, date: Date, accounts: AccountBalance[], totals: { totalDebit: number, totalCredit: number, difference: number }, error?: string }`
- **Status**: WORKING
- **Known Errors**: None observed
- **Permission Check**: Checks `accounts.trial-balance` with `read` or `view` operation
- **Notes**: Filters out accounts with zero balance. Calculates balance from JournalEntryLine.

#### getBalanceSheet
- **Purpose**: Get balance sheet - financial position (Assets = Liabilities + Equity) as of a specific date
- **Input**: `date: Date | string`
- **Output**: `{ success: boolean, date: Date, assets: {...}, liabilities: {...}, equity: {...}, validation: {...}, error?: string }`
- **Status**: WORKING
- **Known Errors**: None observed
- **Permission Check**: Checks `accounts.balance-sheet` with `read` or `view` operation
- **Notes**: Includes Net Income calculation. Validates Assets = Liabilities + Equity (allows 0.01 difference for floating point).

#### getProfitLoss
- **Purpose**: Get profit & loss - income statement (Revenue - Expenses) for a date range
- **Input**: `startDate: Date | string, endDate: Date | string`
- **Output**: `{ success: boolean, startDate: Date, endDate: Date, revenue: {...}, expenses: {...}, netIncome: number, error?: string }`
- **Status**: WORKING
- **Known Errors**:
  - Returns error if startDate > endDate
- **Permission Check**: Checks `accounts.profit-loss` with `read` or `view` operation
- **Notes**: Calculates revenue and expenses from JournalEntryLine for date range.

### AR/AP Actions
**File**: `app/(dashboard)/dashboard/accounts/reports/_actions/ar-ap.action.tsx`

#### getAccountsReceivable
- **Purpose**: Get accounts receivable grouped by client with optional aging
- **Input**: `asOfDate?: Date | string, includeAging: boolean = false`
- **Output**: `{ success: boolean, asOfDate: Date, clients: ClientAR[], total: number, error?: string }`
- **Status**: WORKING
- **Known Errors**:
  - Returns error if "Accounts Receivable" control account not found in Chart of Accounts
- **Permission Check**: Checks `accounts.accounts-receivable` with `read` or `view` operation
- **Notes**: Finds control account by name search ("Accounts Receivable"). Groups JournalEntryLine entries by clientId. Calculates aging buckets if requested.

#### getAccountsPayable
- **Purpose**: Get accounts payable grouped by supplier with optional aging
- **Input**: `asOfDate?: Date | string, includeAging: boolean = false`
- **Output**: `{ success: boolean, asOfDate: Date, suppliers: SupplierAP[], total: number, error?: string }`
- **Status**: WORKING
- **Known Errors**:
  - Returns error if "Accounts Payable" control account not found in Chart of Accounts
- **Permission Check**: Checks `accounts.accounts-payable` with `read` or `view` operation
- **Notes**: Finds control account by name search ("Accounts Payable"). Groups JournalEntryLine entries by supplierId. Calculates aging buckets if requested.

### Integration Actions
**File**: `app/actions/quotation-accounting-integration.ts`

#### createSalesVoucherForQuotation
- **Purpose**: Create and auto-post a SALES voucher for an accepted quotation (idempotent)
- **Input**: `quotationId: string, quotationNumber: string, clientId: string, amount: number, userId: string, quotationDate: Date`
- **Output**: `{ success: boolean, voucherId: string | null, error?: string }`
- **Status**: WORKING
- **Known Errors**:
  - Returns error if amount <= 0
  - Returns error if "Accounts Receivable" control account not found
  - Returns error if "Sales" control account not found
  - Returns error if voucher lines validation fails
- **Notes**: Idempotent - checks if voucher already exists for quotation. Auto-posts voucher in transaction. Called from `updateQuotation()` when status changes to ACCEPTED.

---

## 5. UI PAGES STATUS

### Chart of Accounts Page
**Route**: `/dashboard/accounts/chart-of-accounts`  
**File**: `app/(dashboard)/dashboard/accounts/chart-of-accounts/page.tsx`

**What Renders Correctly**:
- Page header with title and description
- "Add Account" button (if not in trash tab and user has create permission)
- Tabs: All Accounts, Active, Inactive, Trash
- ChartOfAccountsListClient component with:
  - Search input
  - Table with columns: Code, Name, Type, Parent, Status, Created At
  - Pagination controls
  - Actions dropdown (View, Edit, Move to Trash) per row

**What is Missing or Broken**:
- "Add Account" button links to `/dashboard/accounts/chart-of-accounts/add` which does not exist (404 error)
- Edit action links to edit route which does not exist
- No create/edit form components exist
- Move to Trash action not implemented (no server action)
- Delete Permanently action not implemented (no server action)
- View action functionality: UNKNOWN (no view page found)

**Runtime Errors**: None observed in page render. Errors occur when clicking Add/Edit buttons (404).

### Vouchers Page
**Route**: `/dashboard/accounts/vouchers`  
**File**: `app/(dashboard)/dashboard/accounts/vouchers/page.tsx`

**What Renders Correctly**:
- Page header with title and description
- "Add Voucher" button (if user has create permission)
- Tabs: All Vouchers, Draft, Posted, Cancelled
- VouchersListClient component with:
  - Search input
  - Table with columns: Voucher Number, Date, Type, Reference, Client/Supplier, Status, Created By, Actions
  - Pagination controls
  - Actions dropdown (View, Post) per row
  - Post button for draft vouchers

**What is Missing or Broken**:
- "Add Voucher" button links to `/dashboard/accounts/vouchers/add` which does not exist (404 error)
- View action functionality: UNKNOWN (no view page found)
- Edit action not available (no update functionality)
- Cancel action not available (no cancel functionality)
- Delete action not available

**Runtime Errors**: None observed in page render. Errors occur when clicking Add button (404). Post action works correctly.

### Ledgers Page
**Route**: `/dashboard/accounts/ledgers`  
**File**: `app/(dashboard)/dashboard/accounts/ledgers/page.tsx`

**What Renders Correctly**:
- Page header with title and description
- LedgerView component with:
  - Account selector dropdown
  - Date range filters (From/To)
  - Table with ledger entries (derived from JournalEntryLine)
  - Summary totals (Total Debit, Total Credit, Balance)

**What is Missing or Broken**:
- Nothing observed - page appears fully functional for read-only viewing

**Runtime Errors**: None observed

### Trial Balance Page
**Route**: `/dashboard/accounts/trial-balance`  
**File**: `app/(dashboard)/dashboard/accounts/trial-balance/page.tsx`

**What Renders Correctly**:
- Page header with title and description
- TrialBalanceView component with:
  - Date selector
  - Table with accounts and balances
  - Totals row (Total Debit, Total Credit, Difference)

**What is Missing or Broken**:
- Export functionality status: UNKNOWN

**Runtime Errors**: None observed

### Balance Sheet Page
**Route**: `/dashboard/accounts/balance-sheet`  
**File**: `app/(dashboard)/dashboard/accounts/balance-sheet/page.tsx`

**What Renders Correctly**:
- Page header with title and description
- BalanceSheetView component with:
  - Date selector
  - Assets section with accounts and total
  - Liabilities section with accounts and total
  - Equity section with accounts, net income, and total
  - Validation indicator (isBalanced)

**What is Missing or Broken**:
- Export functionality status: UNKNOWN

**Runtime Errors**: None observed

### Profit & Loss Page
**Route**: `/dashboard/accounts/profit-loss`  
**File**: `app/(dashboard)/dashboard/accounts/profit-loss/page.tsx`

**What Renders Correctly**:
- Page header with title and description
- ProfitLossView component with:
  - Date range selectors (Start Date, End Date)
  - Revenue section with accounts and total
  - Expenses section with accounts and total
  - Net Income calculation

**What is Missing or Broken**:
- Export functionality status: UNKNOWN

**Runtime Errors**: None observed

### Cash & Bank Page
**Route**: `/dashboard/accounts/cash-bank`  
**File**: `app/(dashboard)/dashboard/accounts/cash-bank/page.tsx`

**What Renders Correctly**:
- Page header with title and description
- Card with "No data yet" message

**What is Missing or Broken**:
- Entire functionality missing - placeholder only
- No server actions
- No components
- No data models

**Runtime Errors**: None observed (page renders but is non-functional)

### Accounts Receivable Page
**Route**: `/dashboard/accounts/accounts-receivable`  
**File**: `app/(dashboard)/dashboard/accounts/accounts-receivable/page.tsx`

**What Renders Correctly**:
- Page header with title and description
- ARView component with:
  - Date selector
  - Aging toggle
  - Table with clients and balances
  - Total outstanding

**What is Missing or Broken**:
- Export functionality status: UNKNOWN

**Runtime Errors**: 
- Error displayed if "Accounts Receivable" control account not found in Chart of Accounts

### Accounts Payable Page
**Route**: `/dashboard/accounts/accounts-payable`  
**File**: `app/(dashboard)/dashboard/accounts/accounts-payable/page.tsx`

**What Renders Correctly**:
- Page header with title and description
- APView component with:
  - Date selector
  - Aging toggle
  - Table with suppliers and balances
  - Total outstanding

**What is Missing or Broken**:
- Export functionality status: UNKNOWN

**Runtime Errors**: 
- Error displayed if "Accounts Payable" control account not found in Chart of Accounts

### Admin Pages
**Routes**: `/admin/accounts/*`

**Status**: All admin pages are placeholders only
- `app/(dashboard)/admin/accounts/chart-of-accounts/page.tsx` - Placeholder
- `app/(dashboard)/admin/accounts/vouchers/page.tsx` - Placeholder
- `app/(dashboard)/admin/accounts/ledgers/page.tsx` - UNKNOWN (file not reviewed)
- `app/(dashboard)/admin/accounts/trial-balance/page.tsx` - UNKNOWN (file not reviewed)
- `app/(dashboard)/admin/accounts/balance-sheet/page.tsx` - UNKNOWN (file not reviewed)
- `app/(dashboard)/admin/accounts/profit-loss/page.tsx` - UNKNOWN (file not reviewed)
- `app/(dashboard)/admin/accounts/cash-bank/page.tsx` - UNKNOWN (file not reviewed)
- `app/(dashboard)/admin/accounts/accounts-receivable/page.tsx` - UNKNOWN (file not reviewed)
- `app/(dashboard)/admin/accounts/accounts-payable/page.tsx` - UNKNOWN (file not reviewed)

**Notes**: Admin pages display "No data yet" message. No functionality implemented.

---

## 6. CREATE / UPDATE FLOWS

### Chart of Accounts Create Flow
**Status**: NOT IMPLEMENTED

**What Exists**:
- "Add Account" button on list page
- Link to `/dashboard/accounts/chart-of-accounts/add`

**What Fails**:
- Route `/dashboard/accounts/chart-of-accounts/add` does not exist (404 error)
- No form component exists
- No `createChartOfAccount` server action exists

**Error Messages**: 
- "404 - This page could not be found" when clicking Add Account button

### Chart of Accounts Update Flow
**Status**: NOT IMPLEMENTED

**What Exists**:
- "Edit" action in dropdown menu on list page
- Link to edit route (route path: UNKNOWN)

**What Fails**:
- Edit route does not exist (404 error)
- No form component exists
- No `updateChartOfAccount` server action exists

**Error Messages**: 
- "404 - This page could not be found" when clicking Edit action

### Chart of Accounts Delete Flow
**Status**: NOT IMPLEMENTED

**What Exists**:
- "Move to Trash" action in dropdown menu (if permission exists)
- "Delete Permanently" action (if permission exists)

**What Fails**:
- No server actions exist for these operations
- Actions likely do nothing or show errors

**Error Messages**: UNKNOWN (not tested)

### Vouchers Create Flow
**Status**: PARTIAL (Server action exists, UI missing)

**What Exists**:
- `createVoucher()` server action - WORKING
- "Add Voucher" button on list page
- Link to `/dashboard/accounts/vouchers/add`

**What Fails**:
- Route `/dashboard/accounts/vouchers/add` does not exist (404 error)
- No form component exists
- Cannot create vouchers via UI (only via integration)

**Error Messages**: 
- "404 - This page could not be found" when clicking Add Voucher button

**Validation (Server Action)**:
- Double-entry balance validation (debits must equal credits)
- Minimum 2 lines required
- Each line must have either debit OR credit (not both, not neither)
- All chart of accounts must exist and be active
- Error messages:
  - "Voucher must have at least 2 lines"
  - "Double-entry balance mismatch: Debit total (X) must equal Credit total (Y)"
  - "Line N: Cannot have both debit and credit amounts"
  - "Line N: Must have either debit or credit amount"
  - "One or more chart of accounts are invalid or inactive"

### Vouchers Update Flow
**Status**: NOT IMPLEMENTED

**What Exists**: Nothing

**What Fails**:
- No update functionality exists
- No edit route exists
- No `updateVoucher` server action exists
- Posted vouchers cannot be modified (by design - immutable)

**Error Messages**: N/A

### Vouchers Post Flow
**Status**: WORKING

**What Exists**:
- `postVoucher()` server action - WORKING
- "Post" button in vouchers list (for draft vouchers)
- Post action in dropdown menu

**What Works**:
- Posting draft vouchers creates JournalEntry and JournalEntryLines
- Updates voucher status to "posted"
- Transaction ensures atomicity

**What Fails**:
- Nothing observed - flow works correctly

**Error Messages** (from server action):
- "Voucher not found"
- "Cannot post voucher with status \"X\". Only draft vouchers can be posted."
- "Journal entry already exists for this voucher"
- Double-entry validation errors (same as create)

### Vouchers Cancel/Delete Flow
**Status**: NOT IMPLEMENTED

**What Exists**: Nothing

**What Fails**:
- No cancel functionality exists
- No delete functionality exists
- No server actions exist

**Error Messages**: N/A

### Cash & Bank Create/Update Flow
**Status**: NOT IMPLEMENTED

**What Exists**: Nothing

**What Fails**:
- Entire module not implemented
- No routes, forms, or server actions

**Error Messages**: N/A

---

## 7. PERMISSIONS & RBAC

### Permission Keys
All accounts module permissions follow pattern: `accounts.{submodule}`

- `accounts.chart-of-accounts`
- `accounts.ledgers`
- `accounts.vouchers`
- `accounts.trial-balance`
- `accounts.balance-sheet`
- `accounts.profit-loss`
- `accounts.cash-bank`
- `accounts.accounts-receivable`
- `accounts.accounts-payable`

### Operations Per Module
**Chart of Accounts**: `["create", "view", "edit", "move-to-trash", "delete-permanently"]`  
**Ledgers**: `["create", "view", "edit", "move-to-trash", "delete-permanently"]` (but only "view" is used)  
**Vouchers**: `["create", "view", "edit", "move-to-trash", "delete-permanently"]` (but "create", "view", "update"/"approve" are used)  
**Reports (Trial Balance, Balance Sheet, P&L)**: `["view", "export"]`  
**Cash & Bank**: `["create", "view", "edit", "move-to-trash", "delete-permanently"]`  
**AR/AP**: `["view", "export"]`

### Permission Checks in Server Actions

#### Chart of Accounts
- `getChartOfAccounts()`: **NO PERMISSION CHECK** (only auth check)
- `getChartOfAccountById()`: **NO PERMISSION CHECK** (only auth check)

#### Vouchers
- `listVouchers()`: Checks `accounts.vouchers` with `read` OR `view`
- `getVoucherById()`: Checks `accounts.vouchers` with `read` OR `view`
- `createVoucher()`: Checks `accounts.vouchers` with `create`
- `postVoucher()`: Checks `accounts.vouchers` with `update` OR `approve`

#### Ledgers
- `getAccountLedger()`: Checks `accounts.ledgers` with `read` OR `view`

#### Reports
- `getTrialBalance()`: Checks `accounts.trial-balance` with `read` OR `view`
- `getBalanceSheet()`: Checks `accounts.balance-sheet` with `read` OR `view`
- `getProfitLoss()`: Checks `accounts.profit-loss` with `read` OR `view`

#### AR/AP
- `getAccountsReceivable()`: Checks `accounts.accounts-receivable` with `read` OR `view`
- `getAccountsPayable()`: Checks `accounts.accounts-payable` with `read` OR `view`

### Permission Checks in UI Components

#### Page Components
- All pages use `<PageGuard permissionKey="accounts.{submodule}">` wrapper
- PageGuard checks permission for "view" operation by default

#### Chart of Accounts List
- Checks permissions server-side: `view`, `edit`, `move-to-trash`, `delete-permanently`
- "Add Account" button only shown if not in trash tab (no permission check in UI, but link fails anyway)
- Actions dropdown uses `<ProtectedAction>` component for permission checks

#### Vouchers List
- Checks permissions server-side: `view`, `edit`, `create`
- "Add Voucher" button only shown if `canCreate` is true
- "Post" button uses `<ProtectedAction>` component

### Permission Mismatches

1. **Chart of Accounts Actions**: Server actions do not check permissions (only auth). UI checks permissions but actions are accessible to any authenticated user.

2. **Operation Name Mismatch**: 
   - Server actions check for `read` OR `view` (both accepted)
   - UI uses `view` operation
   - Voucher posting checks `update` OR `approve` (both accepted)
   - Documentation mentions `edit` operation, but server uses `update`

3. **Missing Permission Checks**: Chart of accounts read operations have no permission checks beyond authentication.

### Where Permissions Fail or Block Actions

1. **Vouchers**: 
   - Users without `create` permission cannot see "Add Voucher" button
   - Users without `read`/`view` permission get error: "You do not have permission to view vouchers"
   - Users without `update`/`approve` permission cannot post vouchers

2. **Reports**: 
   - Users without `read`/`view` permission get error: "You do not have permission to view [report]"

3. **Ledgers**: 
   - Users without `read`/`view` permission get error: "You do not have permission to view ledgers"

4. **AR/AP**: 
   - Users without `read`/`view` permission get error: "You do not have permission to view accounts receivable/payable"

---

## 8. INTEGRATION POINTS

### Quotation → Accounting Integration
**File**: `app/actions/quotation-accounting-integration.ts`  
**Trigger**: When quotation status changes to `ACCEPTED`  
**Location**: `app/actions/quotations.ts` (line 1060)

**What Works**:
- `createSalesVoucherForQuotation()` function exists and is called
- Creates SALES voucher with:
  - Debit: Accounts Receivable (control account)
  - Credit: Sales (control account)
- Auto-posts voucher (creates JournalEntry immediately)
- Idempotent - checks if voucher already exists for quotation
- Links voucher to client via `clientId`
- Uses quotation number as reference

**What Fails**:
- Requires "Accounts Receivable" control account to exist in Chart of Accounts (finds by name search)
- Requires "Sales" control account to exist in Chart of Accounts (finds by name search)
- If control accounts not found, voucher creation fails silently (error logged but quotation update continues)

**Error Messages**:
- "Accounts Receivable control account not found. Please ensure it exists in Chart of Accounts."
- "Sales account not found. Please ensure it exists in Chart of Accounts."
- "Quotation amount must be greater than zero"

**Integration Code**:
```typescript
// In updateQuotation() when status changes to ACCEPTED
if (data.status === 'ACCEPTED' && existingQuotation.status !== 'ACCEPTED') {
  const { createSalesVoucherForQuotation } = await import('./quotation-accounting-integration');
  const voucherResult = await createSalesVoucherForQuotation(...);
  // Error handling: logs error but doesn't fail quotation update
}
```

### Client / Supplier Linkage
**Status**: EXISTS (via voucher lines and journal entry lines)

**What Works**:
- Vouchers can be linked to clients via `clientId` field
- Vouchers can be linked to suppliers via `supplierId` field
- VoucherLines can be linked to clients/suppliers
- JournalEntryLines can be linked to clients/suppliers
- Accounts Receivable report groups by client
- Accounts Payable report groups by supplier

**What is Missing**:
- No direct UI for linking vouchers to clients/suppliers (would be in create form)
- No automatic linkage when creating vouchers from quotations (only SALES vouchers auto-link)

### Cash & Bank Linkage
**Status**: NOT IMPLEMENTED

**What Exists**: Nothing

**What is Missing**:
- CashBankAccount model does not exist in schema
- CashBankTransaction model does not exist in schema
- No integration with vouchers for cash/bank transactions
- No cash/bank balance tracking

---

## 9. KNOWN CONSTRAINTS

### Things Intentionally Skipped
1. **Cash & Bank Module**: Entirely not implemented (placeholder pages only)
2. **Journal Entries Direct UI**: No separate UI for viewing/managing journal entries (only created automatically)
3. **LedgerEntry Model**: Not implemented - ledger data derived from JournalEntryLine instead
4. **Account Balance Fields**: ChartOfAccount model does not have `openingBalance` or `currentBalance` fields - balances calculated on-demand from JournalEntryLine
5. **Voucher Editing**: Posted vouchers cannot be edited (by design - immutable)
6. **Voucher Cancellation**: No cancel functionality implemented
7. **Export Functionality**: Status unknown - may be intentionally skipped or not yet implemented

### Temporary Hacks
1. **Control Account Finding**: AR/AP reports find control accounts by name search (`findControlAccount("Accounts Receivable")`) - fragile if account names don't match exactly
2. **Permission Operation Names**: Server actions accept both `read` and `view` operations (inconsistency)
3. **Quotation Integration Error Handling**: Voucher creation failures don't block quotation updates (errors logged but process continues)

### TODOs Left in Code
- None found in accounts module files (grep for TODO/FIXME/HACK returned only comment examples, not actual TODOs)

### Design Decisions
1. **Double-Entry Validation**: Enforced at voucher creation and posting
2. **Immutable Journal Entries**: Once created, journal entries cannot be modified (status always "posted")
3. **Voucher → Journal Entry Flow**: Vouchers are drafts, posting creates immutable journal entries
4. **Ledger Calculation**: All ledger/report calculations derive from JournalEntryLine (single source of truth)
5. **Account Hierarchy**: ChartOfAccount supports parent-child relationships but no UI for managing hierarchy

---

## 10. OPEN QUESTIONS / UNCERTAINTIES

1. **Export Functionality**: Do Trial Balance, Balance Sheet, P&L, AR, AP reports have export to PDF/Excel functionality? Status: UNKNOWN

2. **Chart of Accounts Add/Edit Routes**: What should the routes be? Currently links point to `/dashboard/accounts/chart-of-accounts/add` and edit route is unknown.

3. **Voucher View Page**: Does a detail/view page exist for vouchers? Route and functionality: UNKNOWN

4. **Account Balance Calculation**: Should opening balances be stored in ChartOfAccount model or calculated differently? Current implementation calculates all balances from JournalEntryLine.

5. **Cash & Bank Implementation**: Is Cash & Bank module planned? Models don't exist in schema but are mentioned in documentation.

6. **Admin Pages Purpose**: What is the intended difference between `/dashboard/accounts/*` and `/admin/accounts/*` routes? Currently admin pages are placeholders.

7. **Voucher Cancellation**: Should cancelled vouchers be deletable or just marked as cancelled? No cancellation flow exists.

8. **Control Account Naming**: How should control accounts (Accounts Receivable, Accounts Payable, Sales) be identified? Currently uses name search which is fragile.

9. **Permission Operation Mapping**: Should `read` and `view` operations be consolidated? Currently both are accepted but may cause confusion.

10. **Journal Entry Direct Access**: Should users be able to view/manage journal entries directly, or only through vouchers?

11. **Account Hierarchy UI**: How should parent-child account relationships be managed? No UI exists for this.

12. **Error Handling in Quotation Integration**: Should voucher creation failures block quotation status updates, or is silent failure intentional?

---

**Document End**

