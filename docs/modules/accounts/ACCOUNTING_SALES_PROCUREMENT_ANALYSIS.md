# Accounting, Sales, and Procurement Implementation Analysis

**Date**: 2025-01-XX  
**Purpose**: Comprehensive analysis of current accounting, sales, and procurement implementation  
**Status**: Analysis Only - No Code Changes

---

## 1. High-Level Architecture

### Accounting Data Flow

The system follows a **double-entry General Ledger (GL) architecture** with the following flow:

```
Business Event → Voucher (Draft) → Post → Journal Entry → Journal Entry Lines → GL Balances
```

**Key Flow Points:**

1. **Voucher Creation**: All accounting transactions start as draft vouchers
   - Vouchers contain `VoucherLine` entries with debit/credit amounts
   - Vouchers can be linked to `Client`, `Supplier`, `User`, or `Organization` via foreign keys
   - Voucher types: `PAYMENT`, `RECEIPT`, `JOURNAL`, `CONTRA`, `SALES`, `PURCHASE`

2. **Voucher Posting**: Draft vouchers are posted to create immutable journal entries
   - Posting creates a `JournalEntry` record
   - `JournalEntryLine` records are created from `VoucherLine` records
   - Once posted, vouchers cannot be edited (status changes from "draft" to "posted")

3. **General Ledger**: All balances are calculated from `JournalEntryLine` records
   - No stored balances - all calculated on-demand
   - Ledger views query `JournalEntryLine` filtered by `chartOfAccountId`
   - Reports aggregate `JournalEntryLine` records by account type

### What Triggers AR Increase

**Accounts Receivable increases when:**

1. **Quotation Status → ACCEPTED** (Automatic)
   - Location: `app/actions/quotations.ts` (line 1060-1083)
   - Function: `createSalesVoucherForQuotation()` in `app/actions/quotation-accounting-integration.ts`
   - Creates `SALES` type voucher with:
     - Debit: Accounts Receivable (control account)
     - Credit: Sales account
   - Voucher is **automatically posted** (creates journal entry immediately)
   - Voucher linked to client via `clientId`
   - Quotation number stored in voucher `reference` field (text, not foreign key)

2. **Manual Receipt Voucher Creation** (Manual)
   - User creates `RECEIPT` type voucher manually
   - Debit: Cash/Bank account
   - Credit: Accounts Receivable account
   - Can be linked to client via `clientId`

**AR Calculation Method:**
- AR is calculated from `JournalEntryLine` records where:
  - `chartOfAccountId` = Accounts Receivable control account
  - `clientId` is not null
- Balance = Sum of (Debit - Credit) per client
- Grouped by client for reporting

### What Triggers AP Increase

**Accounts Payable increases when:**

1. **Manual Purchase Voucher Creation** (Manual only)
   - User creates `PURCHASE` type voucher manually
   - Debit: Expense/Purchase account
   - Credit: Accounts Payable (control account)
   - Can be linked to supplier via `supplierId`
   - **No automatic creation from supplier bills** - procurement module does not auto-create vouchers

2. **Manual Payment Voucher Creation** (Manual)
   - User creates `PAYMENT` type voucher manually
   - Debit: Accounts Payable account
   - Credit: Cash/Bank account
   - Can be linked to supplier via `supplierId`

**AP Calculation Method:**
- AP is calculated from `JournalEntryLine` records where:
  - `chartOfAccountId` = Accounts Payable control account
  - `supplierId` is not null
- Balance = Sum of (Credit - Debit) per supplier (AP is liability, normal balance is credit)
- Grouped by supplier for reporting

### How Payments Are Currently Recorded

**Customer Payments (Receipts):**
1. User manually creates `RECEIPT` type voucher
2. Voucher lines:
   - Line 1: Debit Cash/Bank account
   - Line 2: Credit Accounts Receivable account
3. Voucher can optionally link to client via `clientId`
4. Voucher is created as draft, then posted manually
5. **No automatic linking to specific quotations/invoices**

**Supplier Payments:**
1. User manually creates `PAYMENT` type voucher
2. Voucher lines:
   - Line 1: Debit Accounts Payable account
   - Line 2: Credit Cash/Bank account
3. Voucher can optionally link to supplier via `supplierId`
4. Voucher is created as draft, then posted manually
5. **No automatic linking to specific supplier bills**

---

## 2. Existing Data Models

### Order / Quotation / Sales Models

**Quotation Model** (`prisma/schema.prisma` lines 412-454):
- Purpose: Sales quotations/orders (serves as both quotation and invoice)
- Key Fields:
  - `quotationNumber`: Unique identifier
  - `status`: `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `REVISED`
  - `clientId`: Links to Client
  - `total`, `grandTotal`: Amount fields
  - `date`: Quotation date
- Relations:
  - `client`: Client relationship
  - `organization`: Optional organization relationship
  - **No direct relation to Voucher** (no `voucherId` field)

**Quotation → Accounting Integration:**
- When `status` changes to `ACCEPTED`:
  - Automatically creates `SALES` voucher
  - Voucher `reference` field stores quotation number (text)
  - Voucher `clientId` links to quotation's client
  - **No foreign key from Voucher to Quotation** (quotationId does not exist in Voucher model)

### Supplier / Procurement Models

**Supplier Model** (`prisma/schema.prisma` lines 379-405):
- Purpose: Supplier master data
- Key Fields:
  - `name`, `email`, `phone`, `address`: Contact information
  - `status`: `active`, `inactive`, `trash`
- Relations:
  - `vouchers`: Vouchers linked to this supplier
  - `voucherLines`: VoucherLine records linked to this supplier
  - `journalEntryLines`: JournalEntryLine records linked to this supplier
- **No Purchase Order or Bill model exists**

**Procurement Status:**
- **No procurement/bill creation module exists**
- Suppliers exist as master data only
- Purchase vouchers must be created manually
- **No automatic AP creation from supplier bills**

### Voucher & VoucherLine

**Voucher Model** (`prisma/schema.prisma` lines 723-762):
- Purpose: Accounting transaction document (draft before posting)
- Key Fields:
  - `voucherNumber`: Auto-generated unique identifier
  - `type`: `PAYMENT`, `RECEIPT`, `JOURNAL`, `CONTRA`, `SALES`, `PURCHASE`
  - `status`: `draft`, `posted`, `cancelled`
  - `reference`: Optional text field (stores quotation number for SALES vouchers)
  - `date`: Transaction date
  - `clientId`, `supplierId`, `userId`, `organizationId`: Optional entity links
- Relations:
  - `voucherLines`: Debit/credit lines
  - `journalEntries`: Created when posted (1:1 relationship)
  - **No `quotationId` field** (documentation mentions it, but schema does not have it)

**VoucherLine Model** (`prisma/schema.prisma` lines 764-793):
- Purpose: Individual debit/credit entries within a voucher
- Key Fields:
  - `lineNumber`: Sequence number
  - `debitAmount`, `creditAmount`: Decimal amounts
  - `chartOfAccountId`: Links to Chart of Account
  - `clientId`, `supplierId`, `userId`, `organizationId`: Optional entity links for tracking
- Relations:
  - `voucher`: Parent voucher
  - `chartOfAccount`: Account being debited/credited

**Posting Flow:**
- When voucher is posted:
  1. `JournalEntry` created (immutable)
  2. `JournalEntryLine` records created from `VoucherLine` records
  3. Voucher status updated to "posted"
  4. Voucher cannot be edited after posting

### Chart of Accounts

**ChartOfAccount Model** (`prisma/schema.prisma` lines 680-704):
- Purpose: Account master data for GL
- Key Fields:
  - `code`: Unique account code
  - `name`: Account name
  - `type`: `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`
  - `parentId`: Hierarchical structure support
  - `status`: `active`, `inactive`, `trash`
- Relations:
  - `voucherLines`: Voucher lines using this account
  - `journalEntryLines`: Journal entry lines using this account
  - `cashBankAccount`: Optional CashBankAccount relationship

**Control Accounts:**
- System expects control accounts named:
  - "Accounts Receivable" (ASSET type)
  - "Accounts Payable" (LIABILITY type)
  - "Sales" (REVENUE type)
- Found by name search (case-insensitive) in `findControlAccount()` function

### Accounts Receivable & Payable Logic

**AR Logic (Implicit):**
- AR is **not a separate model** - it's a calculated value
- Calculated from `JournalEntryLine` where:
  - `chartOfAccountId` = AR control account ID
  - `clientId` is not null
- Balance per client = Sum of (Debit - Credit) for that client
- Location: `app/(dashboard)/dashboard/accounts/reports/_actions/ar-ap.action.tsx` (getAccountsReceivable function)

**AP Logic (Implicit):**
- AP is **not a separate model** - it's a calculated value
- Calculated from `JournalEntryLine` where:
  - `chartOfAccountId` = AP control account ID
  - `supplierId` is not null
- Balance per supplier = Sum of (Credit - Debit) for that supplier (liability normal balance)
- Location: `app/(dashboard)/dashboard/accounts/reports/_actions/ar-ap.action.tsx` (getAccountsPayable function)

**Aging Reports:**
- Both AR and AP support aging buckets: 0-30, 31-60, 61-90, 90+ days
- Aging calculated from `journalEntry.date` compared to report date

### Existing Linking Between Orders and Payments

**Current Linking Mechanism:**

1. **Sales Voucher → Quotation:**
   - **Indirect link only** via `reference` field (text, stores quotation number)
   - Voucher `clientId` matches quotation `clientId`
   - **No foreign key relationship**
   - Cannot query "all payments for quotation X" directly

2. **Receipt Voucher → Quotation:**
   - **No direct link**
   - Receipt vouchers can link to client via `clientId`
   - **No quotationId field in Voucher model**
   - Cannot determine which quotation a payment is for

3. **Payment Voucher → Supplier Bill:**
   - **No supplier bill model exists**
   - Payment vouchers can link to supplier via `supplierId`
   - **No bill/invoice reference field**
   - Cannot determine which bill a payment is for

**Summary:**
- **No explicit allocation system exists**
- Payments are linked to clients/suppliers only, not to specific invoices/bills
- AR/AP balances are calculated from all transactions per client/supplier, not per invoice

---

## 3. Current Capabilities

### What the System CAN Do Today

**Accounting Core:**
- ✅ Create draft vouchers (all types: PAYMENT, RECEIPT, JOURNAL, CONTRA, SALES, PURCHASE)
- ✅ Post vouchers to create journal entries
- ✅ View account ledgers (calculated from journal entries)
- ✅ Generate Trial Balance report
- ✅ Generate Balance Sheet report
- ✅ Generate Profit & Loss report
- ✅ View Accounts Receivable report (grouped by client, with aging)
- ✅ View Accounts Payable report (grouped by supplier, with aging)
- ✅ View Cash/Bank ledgers
- ✅ Double-entry validation (debit = credit)
- ✅ Immutable journal entries (posted vouchers cannot be edited)

**Sales Integration:**
- ✅ Auto-create SALES voucher when quotation status changes to ACCEPTED
- ✅ Auto-post SALES voucher (creates journal entry immediately)
- ✅ Link SALES voucher to client
- ✅ Store quotation number in voucher reference field

**Manual Operations:**
- ✅ Create receipt vouchers for customer payments
- ✅ Create payment vouchers for supplier payments
- ✅ Link vouchers to clients/suppliers
- ✅ Create journal vouchers for adjustments

**Reporting:**
- ✅ AR aging reports (0-30, 31-60, 61-90, 90+ days)
- ✅ AP aging reports (0-30, 31-60, 61-90, 90+ days)
- ✅ Date-range filtering for all reports
- ✅ Account-wise ledger views

### What the System CANNOT Do Today

**Payment Allocation:**
- ❌ Link customer payment to specific quotation/invoice
- ❌ Link supplier payment to specific bill/invoice
- ❌ Partial payment allocation (e.g., $500 payment against $1000 invoice)
- ❌ Multiple invoice allocation in single payment
- ❌ View outstanding amount per quotation/invoice
- ❌ View payment history per quotation/invoice

**Procurement Integration:**
- ❌ No supplier bill/purchase order model
- ❌ No automatic AP creation from supplier bills
- ❌ No purchase order workflow
- ❌ No bill approval process

**Invoice Management:**
- ❌ No separate Invoice model (quotations serve as invoices)
- ❌ No invoice numbering separate from quotation numbering
- ❌ No invoice payment tracking per invoice

**Advanced Features:**
- ❌ No credit notes/debit notes
- ❌ No payment terms tracking
- ❌ No discount allocation
- ❌ No multi-currency support
- ❌ No tax calculation integration
- ❌ No recurring invoice/payment automation

**Data Integrity:**
- ❌ No validation that payment amount doesn't exceed outstanding balance
- ❌ No prevention of duplicate voucher creation for same quotation
- ❌ No automatic reconciliation

---

## 4. Current Gaps (IMPORTANT)

### Is payment linked to an order? (Yes/No)

**Answer: NO**

**Details:**
- Receipt vouchers (customer payments) can link to `clientId` but **not to quotationId**
- Voucher model has no `quotationId` field
- Sales vouchers store quotation number in `reference` field (text), but receipt vouchers do not
- Cannot query "which quotation was this payment for"
- Cannot view "outstanding amount per quotation"

**Evidence:**
- `Voucher` model (`schema.prisma` line 723) has `clientId`, `supplierId` but no `quotationId`
- Receipt voucher creation (`receipt-payment-form.tsx`) does not capture quotation reference
- AR calculation groups by client only, not by quotation

### Is supplier payment linked to a bill? (Yes/No)

**Answer: NO**

**Details:**
- Payment vouchers (supplier payments) can link to `supplierId` but **not to any bill**
- No supplier bill/purchase order model exists
- Cannot determine which bill a payment is for
- Cannot view "outstanding amount per bill"

**Evidence:**
- No `Bill`, `PurchaseOrder`, or `SupplierInvoice` model in schema
- Payment voucher creation does not capture bill reference
- AP calculation groups by supplier only, not by bill

### Is AR tracked per customer only? (Yes/No)

**Answer: YES**

**Details:**
- AR is calculated and grouped by `clientId` only
- All transactions for a client are aggregated
- Cannot see AR breakdown per quotation
- Cannot see which quotations are paid/unpaid

**Evidence:**
- `getAccountsReceivable()` function (`ar-ap.action.tsx` line 50) groups by `clientId`
- JournalEntryLine has `clientId` but no `quotationId`
- AR report shows total balance per client, not per quotation

### Is AP tracked per supplier only? (Yes/No)

**Answer: YES**

**Details:**
- AP is calculated and grouped by `supplierId` only
- All transactions for a supplier are aggregated
- Cannot see AP breakdown per bill
- Cannot see which bills are paid/unpaid

**Evidence:**
- `getAccountsPayable()` function (`ar-ap.action.tsx` line 273) groups by `supplierId`
- JournalEntryLine has `supplierId` but no bill reference
- AP report shows total balance per supplier, not per bill

### Are allocations implemented? (Yes/No)

**Answer: NO**

**Details:**
- No allocation model exists
- No `PaymentAllocation` or `InvoicePayment` junction table
- Payments are not linked to specific invoices/bills
- Cannot allocate partial payments
- Cannot allocate one payment to multiple invoices

**Evidence:**
- No allocation-related models in `schema.prisma`
- No allocation functions in codebase
- Receipt/payment vouchers do not reference invoices/bills
- AR/AP calculations do not consider invoice-level allocations

---

## 5. Safety Constraints

### Rules That Must NOT Be Broken

**1. No Balance Storage**
- ✅ **Current State**: Balances are calculated on-demand from `JournalEntryLine`
- ✅ **Constraint**: Never store calculated balances in database
- ✅ **Reason**: GL must be single source of truth, balances derived from transactions
- ⚠️ **Risk**: Storing balances could lead to data inconsistency

**2. No Editing Posted Vouchers**
- ✅ **Current State**: Posted vouchers have status "posted" and cannot be edited
- ✅ **Constraint**: Once voucher is posted, only cancellation allowed (not implemented yet)
- ✅ **Reason**: Journal entries are immutable audit trail
- ⚠️ **Risk**: Editing posted vouchers would break audit trail integrity

**3. GL as Single Source of Truth**
- ✅ **Current State**: All reports calculate from `JournalEntryLine`
- ✅ **Constraint**: All accounting data must flow through vouchers → journal entries
- ✅ **Reason**: Ensures double-entry integrity and auditability
- ⚠️ **Risk**: Bypassing voucher system would break accounting integrity

**4. Double-Entry Validation**
- ✅ **Current State**: Voucher creation validates debit = credit
- ✅ **Constraint**: Every voucher must balance (total debit = total credit)
- ✅ **Reason**: Fundamental accounting principle
- ⚠️ **Risk**: Unbalanced entries would break accounting equation

**5. Journal Entry Immutability**
- ✅ **Current State**: `JournalEntry` and `JournalEntryLine` are created once and never modified
- ✅ **Constraint**: Journal entries cannot be edited or deleted
- ✅ **Reason**: Audit trail must be permanent
- ⚠️ **Risk**: Modifying journal entries would break audit compliance

**6. Account Type Validation**
- ✅ **Current State**: Account types (ASSET, LIABILITY, etc.) determine balance calculation
- ✅ **Constraint**: Balance calculation must respect account type normal balances
- ✅ **Reason**: AR (ASSET) = debit - credit, AP (LIABILITY) = credit - debit
- ⚠️ **Risk**: Incorrect balance calculation would show wrong financial position

**7. Control Account Dependency**
- ✅ **Current State**: AR/AP reports require control accounts named "Accounts Receivable" and "Accounts Payable"
- ✅ **Constraint**: These accounts must exist in Chart of Accounts
- ✅ **Reason**: Reports search for accounts by name
- ⚠️ **Risk**: Missing control accounts would break AR/AP reports

---

## 6. Summary

### What Exists

**Core Accounting System:**
- Fully functional double-entry GL system
- Voucher-based transaction entry (draft → post workflow)
- Immutable journal entries for audit trail
- Complete reporting suite (Trial Balance, Balance Sheet, P&L, AR, AP)
- Account ledger views with date filtering
- Aging reports for AR and AP

**Sales Integration:**
- Automatic SALES voucher creation when quotation is accepted
- Automatic posting of sales vouchers
- Client linking in vouchers and journal entries
- Quotation number stored in voucher reference field

**Manual Operations:**
- Manual creation of all voucher types (PAYMENT, RECEIPT, JOURNAL, CONTRA, PURCHASE)
- Client and supplier linking in vouchers
- Cash/Bank account management

**Data Models:**
- Complete voucher and journal entry models
- Chart of accounts with hierarchical support
- Client and supplier master data
- Quotation model (serves as invoice)

### What Is Missing

**Payment Allocation System:**
- No link between payments and specific invoices/quotations
- No allocation model to track which payment applies to which invoice
- Cannot view outstanding amount per quotation
- Cannot track payment history per invoice

**Procurement Module:**
- No supplier bill/purchase order model
- No automatic AP creation from bills
- No bill approval workflow
- No purchase order management

**Invoice-Level Tracking:**
- AR/AP tracked at customer/supplier level only, not per invoice
- Cannot see which specific invoices are paid/unpaid
- Cannot allocate partial payments
- Cannot allocate one payment to multiple invoices

**Advanced Features:**
- No credit notes/debit notes
- No payment terms tracking
- No tax calculation integration
- No recurring transactions

### What Can Be Safely Added WITHOUT Changing Accounting Core

**Safe Additions (No Core Changes):**

1. **Allocation Tables:**
   - Add `PaymentAllocation` model to link payments to invoices
   - Add `quotationId` field to Voucher model (optional)
   - Add allocation tracking without changing journal entry structure

2. **Invoice Reference in Vouchers:**
   - Add `quotationId` foreign key to Voucher model
   - Add `billId` field when bill model is created
   - These are metadata fields, don't affect GL calculations

3. **Supplier Bill Model:**
   - Create `SupplierBill` or `PurchaseOrder` model
   - Link to Supplier
   - Create PURCHASE vouchers from bills (similar to SALES from quotations)
   - Does not change existing voucher/journal structure

4. **Invoice-Level AR/AP Views:**
   - Add views/reports showing AR/AP per quotation/bill
   - Calculate from existing journal entries with new grouping
   - No schema changes needed, just query logic

5. **Payment Allocation UI:**
   - UI to allocate payments to invoices
   - Creates allocation records
   - Does not change voucher structure

**What Must NOT Change:**
- Voucher → Journal Entry → Journal Entry Line flow
- Journal entry immutability
- Balance calculation from journal entries (no stored balances)
- Double-entry validation
- Account type-based balance calculations

---

## Appendix: Key File Locations

**Core Accounting:**
- Schema: `prisma/schema.prisma`
- Voucher Actions: `app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action.tsx`
- AR/AP Reports: `app/(dashboard)/dashboard/accounts/reports/_actions/ar-ap.action.tsx`
- Ledger Actions: `app/(dashboard)/dashboard/accounts/ledgers/_actions/ledger.action.tsx`
- Report Actions: `app/(dashboard)/dashboard/accounts/reports/_actions/report.action.tsx`

**Sales Integration:**
- Quotation Accounting: `app/actions/quotation-accounting-integration.ts`
- Quotation Update: `app/actions/quotations.ts` (line 1060-1083)

**Models:**
- Voucher: `schema.prisma` line 723
- VoucherLine: `schema.prisma` line 764
- JournalEntry: `schema.prisma` line 795
- JournalEntryLine: `schema.prisma` line 816
- Quotation: `schema.prisma` line 412
- Client: `schema.prisma` line 350
- Supplier: `schema.prisma` line 379

---

**End of Analysis**

