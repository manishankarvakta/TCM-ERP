# Accounts Module Status Report - January 2026

## 1. Module Overview
The Accounts Module is a fully integrated, double-entry accounting system designed to track all financial transactions within the BHAGYAKUL ERP. It supports automatic voucher creation from operational modules (Sales, Purchases, Production) and manual entry for direct financial operations.

---

## 2. Prisma Data Structure

### Core Accounting Models
- **`ChartOfAccount`**: Hierarchical structure for account management.
  - Supports `parentId` for tree organization.
  - Categorized by `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`.
- **`Voucher`**: Transaction document (Draft, Posted, Cancelled).
  - Linked to `VoucherLine` for multi-line entries.
  - Links to operational models: `Purchase`, `Sale`, `ProductionOrder`.
- **`VoucherLine`**: Individual entry lines within a voucher.
  - Tracks `debitAmount`, `creditAmount`, and links to `ChartOfAccount`, `Client`, `Supplier`, or `Employee`.
- **`JournalEntry`**: Immutable record created when a voucher is **posted**.
  - Serves as the source of truth for all ledger and report calculations.
- **`JournalEntryLine`**: Low-level entries that must balance (Total Debit = Total Credit).
- **`CashBankAccount`**: specialized model for managing cash registers and bank accounts.

---

## 3. UI and User Experience

### Navigation and Pages
- **Vouchers**: `accounts/vouchers`
  - Specialized forms for **Receipt**, **Payment**, and **Journal** vouchers.
  - Integrated search, filtering by status/type, and pagination.
- **Chart of Accounts**: `accounts/chart-of-accounts`
  - Tree-based management for financial codes.
- **Ledgers**: `accounts/ledgers`
  - **General Ledger**: Filtered by account.
  - **Entity Ledgers**: Specialized views for **Customers**, **Suppliers**, and **Employees** (Employee ledger handles liability balances and salary payable).
- **Reports**: `accounts/reports`
  - **Trial Balance**: Real-time balance verification.
  - **Balance Sheet**: Snapshots of Assets, Liabilities, and Equity.
  - **Profit & Loss**: Revenue vs. Expenses over a date range.
- **Cash & Bank**: `accounts/cash-bank`
  - Register management and ledger views for liquid assets.

---

## 4. Server Actions Architecture

### Core Logic (`_actions/`)
- **`voucher.action.tsx`**: 
  - Handles voucher number generation and posting.
  - Enforces double-entry validation (Difference < 0.01).
  - Creates immutable `JournalEntry` records upon posting.
- **`chart-of-accounts.action.tsx`**: 
  - Manages COA lifecycle with strict checks to prevent deletion of used accounts.
  - Prevents circular parent-child references.
- **`ledger.action.tsx`**: 
  - Optimizes queries for large transaction datasets.
  - Calculates running balances and opening balances dynamically.
- **`report.action.tsx`**: 
  - Aggregates data for high-level financial statements.
  - Handles complex logic like Net Income calculation (Revenue - Expenses) for Balance Sheets.
- **`accounting-helpers.tsx`**: 
  - Provides utility functions like `findControlAccount` to avoid hardcoded IDs.

---

## 5. Current Implementation Status: ✅ COMPLETED
- **Integration**: Fully integrated with Sales (Revenue/COGS), Purchases (AP/Inventory), and Production (Inventory movement).
- **Permissions**: Fully guarded by the RBAC system (`accounts.vouchers`, `accounts.reports`, etc.).
- **Validation**: Pass 100% of end-to-end tests via the `pre-deployment-validation.ts` script.
- **Reliability**: Uses Prisma `$transaction` for all multi-step accounting operations to ensure data atomicity.
