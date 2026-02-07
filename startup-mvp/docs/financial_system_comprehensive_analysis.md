# Financial System Comprehensive Analysis

> **Date**: February 06, 2026
> **Scope**: Accounts Module & Financial Integrations
> **Status**: Implementation Active (Post-MVP Structure)

## 1. Executive Summary

The application implements a robust **Double-Entry Accounting System** fully integrated with operational modules (Quotations/Sales and Purchases). Contrary to older documentation which suggests a placeholder state, the current system features complete Prisma data models, server-side business logic for transaction posting, and dynamic ledger generation.

The core architecture follows the standard accounting flow:
`Source Document` → `Voucher` → `Journal Entry` → `Ledger` → `Financial Reports`

---

## 2. Core Data Architecture

The financial system relies on a set of strictly relational Prisma models designed to ensure data integrity and auditability.

### 2.1 Master Data
*   **`ChartOfAccount`**: The backbone of the system.
    *   Supports hierarchical structure (`parentId`).
    *   Classified by `AccountType` (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE).
    *   Linked to specific entities (Clients, Suppliers) via `chartOfAccountId` on those models.
*   **`CashBankAccount`**: specialized handling for Cash and Bank accounts, linked to a COA ID.

### 2.2 Transactional Models
*   **`Voucher` & `VoucherLine`**: Represents the initial capture of a financial transaction.
    *   Types: `PAYMENT`, `RECEIPT`, `JOURNAL`, `CONTRA`, `SALES`, `PURCHASE`, `ADJUSTMENT`.
    *   Status: `draft` -> `posted`.
    *   Links to source documents (`quotationId`, `orderId`, `purchaseId`).
*   **`JournalEntry` & `JournalEntryLine`**: The immutable accounting record created when a Voucher is posted.
    *   **`JournalEntryLine`** is the primary source for all ledgers and reports.
    *   Each line is linked to a `ChartOfAccount`.
    *   Contains specific metadata (`clientId`, `supplierId`, `organizationId`) for granular reporting.

### 2.3 Operational Models with Financial Links
*   **`Client`**: Has `chartOfAccountId` (Accounts Receivable link).
*   **`Supplier`**: Has `chartOfAccountId` (Accounts Payable link).
*   **`Quotation` / `Order`**: Triggers Sales Vouchers.
*   **`Purchase`**: Triggers Purchase Vouchers.

---

## 3. Operational Flows & Integration

The system uses efficient server actions to automate the "Accounting Backend" based on frontend business operations.

### 3.1 Sales Cycle (Revenue Recognition)
**Trigger**: Quotation Acceptance / Order Creation
**Handler**: `app/actions/quotation-accounting-integration.ts`

1.  **Validation**: checks for existence of "Accounts Receivable" and "Sales" control accounts.
2.  **Voucher Creation**: Creates a `SALES` voucher.
    *   **Debit**: Accounts Receivable (Client's Account).
    *   **Credit**: Sales Account.
3.  **COGS Recognition** (If Inventory exists):
    *   **Debit**: Cost of Goods Sold.
    *   **Credit**: Inventory Asset.
4.  **Posting**: Automatically generates the `JournalEntry`.
5.  **Inventory Impact**: Triggers `processInventoryMovement` to reduce stock.

### 3.2 Purchase Cycle (Expense/Asset Recognition)
**Trigger**: Purchase Receipt
**Handler**: `app/actions/purchase-accounting-integration.ts`

1.  **Voucher Creation**: Creates a `PURCHASE` voucher.
    *   **Debit**: Inventory Asset (or Expense Account).
    *   **Credit**: Accounts Payable (Supplier's Account).
2.  **Posting**: Generates `JournalEntry`.
3.  **Inventory Impact**: Increases stock quantity.

### 3.3 Payments & Receipts (Cash Flow)
*   **Receipts**: Client payments create `RECEIPT` vouchers (Debit Cash/Bank, Credit AR).
*   **Payments**: Supplier payments create `PAYMENT` vouchers (Debit AP, Credit Cash/Bank).

---

## 4. Reporting & Ledgers

The system does not store "Ledger" balances statically; it derives them dynamically, ensuring true real-time reporting.

**Ledger Action**: `app/(dashboard)/dashboard/accounts/ledgers/_actions/ledger.action.tsx`

*   **General Ledger**: Queries `JournalEntryLine` by `chartOfAccountId`.
*   **Sub-Ledgers (Customer/Supplier)**:
    1.  Resolves the Entity's `chartOfAccountId`.
    2.  Queries `JournalEntryLine` filtering by that Account ID AND the generic `clientId`/`supplierId` fields for specific matching.
*   **Aging Analysis**: Implemented in reports (e.g., `ar-ap.action.tsx`) by grouping open balances by date buckets.

---

## 5. Technical Implementation Details

*   **Idempotency**: Integration actions check for existing Vouchers (by `reference` matches) to prevent duplicate double-entries.
*   **Atomic Transactions**: Critical operations use `prisma.$transaction` to ensure that a Voucher, Journal Entry, and Inventory movement either ALL happen or NONE happen.
*   **Permissions**: Granular access control is checked at the server action level (e.g., `accounts.ledgers.view`).

## 6. Discrepancies vs Old Documentation
*   **Status**: Old docs claim "0 Data Models". **Reality**: Full Schema exists.
*   **Entities**: Old docs mention `LedgerEntry`. **Reality**: Implemented as `JournalEntryLine`.
*   **Actions**: Old docs claim "0 Actions". **Reality**: Full integration suite exists.
