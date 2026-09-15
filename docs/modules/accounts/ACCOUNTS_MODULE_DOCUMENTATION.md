# Accounts Module - Complete Documentation

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Module Structure](#module-structure)
4. [Required Data Models](#required-data-models)
5. [Relationships with Existing Modules](#relationships-with-existing-modules)
6. [Integration Points](#integration-points)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Implementation Requirements](#implementation-requirements)
9. [Module-Specific Details](#module-specific-details)

---

## Executive Summary

The Accounts Module is a comprehensive financial accounting system that integrates with existing business modules (Quotations, Clients, Suppliers, Organizations, Users) to provide complete accounting functionality. Currently, the module exists only as a structural shell with placeholder pages - no data models, server actions, or business logic have been implemented.

### Module Overview
- **9 Sub-modules**: Chart of Accounts, Ledgers, Vouchers, Trial Balance, Balance Sheet, Profit & Loss, Cash & Bank, Accounts Receivable, Accounts Payable
- **18 Page Files**: 9 modules × 2 routes (dashboard + admin)
- **0 Data Models**: No Prisma models exist for accounting
- **0 Server Actions**: No CRUD operations implemented
- **0 UI Components**: No functional components beyond placeholders

---

## Current State Analysis

### What Exists ✅
1. **Navigation Structure** - Defined in `types/permissions.ts` and `lib/navigation-builder.ts`
2. **Permission System** - All 9 modules have permission keys and operations configured
3. **Page Routes** - All 18 pages exist but are placeholders
4. **Menu Integration** - Accounts module appears in sidebar navigation

### What's Missing ❌
1. **Database Models** - No Prisma schema definitions
2. **Server Actions** - No CRUD operations
3. **UI Components** - No forms, tables, or reports
4. **Business Logic** - No calculations, validations, or integrations
5. **Data Integration** - No connection to Quotations, Clients, Suppliers

---

## Module Structure

### 1. Chart of Accounts
- **Purpose**: Master list of all accounts in the accounting system
- **Type**: Master Data (CRUD operations)
- **Operations**: `["create", "view", "edit", "move-to-trash", "delete-permanently"]`
- **Routes**: 
  - `/dashboard/accounts/chart-of-accounts`
  - `/admin/accounts/chart-of-accounts`

### 2. Ledgers
- **Purpose**: Individual account ledgers showing all transactions
- **Type**: Transactional Data (CRUD operations)
- **Operations**: `["create", "view", "edit", "move-to-trash", "delete-permanently"]`
- **Routes**: 
  - `/dashboard/accounts/ledgers`
  - `/admin/accounts/ledgers`

### 3. Vouchers
- **Purpose**: Accounting vouchers (Payment, Receipt, Journal, Contra, etc.)
- **Type**: Transactional Data (CRUD operations)
- **Operations**: `["create", "view", "edit", "move-to-trash", "delete-permanently"]`
- **Routes**: 
  - `/dashboard/accounts/vouchers`
  - `/admin/accounts/vouchers`

### 4. Trial Balance
- **Purpose**: Summary of all account balances
- **Type**: Report (Read-only)
- **Operations**: `["view", "export"]`
- **Routes**: 
  - `/dashboard/accounts/trial-balance`
  - `/admin/accounts/trial-balance`

### 5. Balance Sheet
- **Purpose**: Financial position statement
- **Type**: Report (Read-only)
- **Operations**: `["view", "export"]`
- **Routes**: 
  - `/dashboard/accounts/balance-sheet`
  - `/admin/accounts/balance-sheet`

### 6. Profit & Loss
- **Purpose**: Income statement showing profit/loss
- **Type**: Report (Read-only)
- **Operations**: `["view", "export"]`
- **Routes**: 
  - `/dashboard/accounts/profit-loss`
  - `/admin/accounts/profit-loss`

### 7. Cash & Bank
- **Purpose**: Manage cash and bank accounts
- **Type**: Master Data (CRUD operations)
- **Operations**: `["create", "view", "edit", "move-to-trash", "delete-permanently"]`
- **Routes**: 
  - `/dashboard/accounts/cash-bank`
  - `/admin/accounts/cash-bank`

### 8. Accounts Receivable
- **Purpose**: Track money owed by clients
- **Type**: Report (Read-only, calculated from Quotations/Clients)
- **Operations**: `["view", "export"]`
- **Routes**: 
  - `/dashboard/accounts/accounts-receivable`
  - `/admin/accounts/accounts-receivable`

### 9. Accounts Payable
- **Purpose**: Track money owed to suppliers
- **Type**: Report (Read-only, calculated from Suppliers)
- **Operations**: `["view", "export"]`
- **Routes**: 
  - `/dashboard/accounts/accounts-payable`
  - `/admin/accounts/accounts-payable`

---

## Required Data Models

### Core Accounting Models

#### 1. ChartOfAccount
```prisma
model ChartOfAccount {
  id          String   @id @default(cuid())
  code        String   @unique // Account code (e.g., "1000", "2000")
  name        String
  accountType AccountType // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
  parentId    String?  // For hierarchical accounts
  parent      ChartOfAccount? @relation("AccountHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children    ChartOfAccount[] @relation("AccountHierarchy")
  
  // Account classification
  category    String?  // Current Asset, Fixed Asset, Current Liability, etc.
  subCategory String?
  
  // Balance tracking
  openingBalance Decimal @default(0) @db.Decimal(12, 2)
  currentBalance Decimal @default(0) @db.Decimal(12, 2)
  
  // Settings
  isActive    Boolean  @default(true)
  isSystem    Boolean  @default(false) // System accounts cannot be deleted
  status      String   @default("active") // active, inactive, trash
  
  // Metadata
  description String?  @db.Text
  notes       String?  @db.Text
  
  // Relations
  ledgerEntries LedgerEntry[]
  voucherEntries VoucherEntry[]
  cashBankAccounts CashBankAccount[]
  
  // Audit
  createdBy   String
  creator     User     @relation("ChartOfAccountCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([code])
  @@index([accountType])
  @@index([parentId])
  @@index([status])
  @@index([createdBy])
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}
```

#### 2. LedgerEntry
```prisma
model LedgerEntry {
  id                String   @id @default(cuid())
  accountId         String
  account           ChartOfAccount @relation(fields: [accountId], references: [id], onDelete: Restrict)
  
  // Transaction details
  date              DateTime
  voucherId         String?
  voucher           Voucher? @relation(fields: [voucherId], references: [id], onDelete: SetNull)
  
  // Amounts
  debit             Decimal  @default(0) @db.Decimal(12, 2)
  credit            Decimal  @default(0) @db.Decimal(12, 2)
  balance           Decimal  @default(0) @db.Decimal(12, 2) // Running balance
  
  // Reference information
  reference         String?  // Reference number
  referenceType     String?  // QUOTATION, INVOICE, PAYMENT, etc.
  referenceId       String?  // ID of related document
  
  // Description
  description       String?  @db.Text
  narration         String?  @db.Text
  
  // Relations to other modules
  quotationId       String?
  quotation         Quotation? @relation(fields: [quotationId], references: [id], onDelete: SetNull)
  
  clientId          String?
  client            Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
  
  supplierId        String?
  supplier          Supplier? @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  
  // Audit
  createdBy         String
  creator           User     @relation("LedgerEntryCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([accountId])
  @@index([date])
  @@index([voucherId])
  @@index([quotationId])
  @@index([clientId])
  @@index([supplierId])
  @@index([createdBy])
  @@index([referenceType, referenceId])
}
```

#### 3. Voucher
```prisma
model Voucher {
  id            String   @id @default(cuid())
  voucherNumber String   @unique // Auto-generated
  voucherType   VoucherType
  date          DateTime @default(now())
  
  // Amounts
  totalAmount   Decimal  @db.Decimal(12, 2)
  
  // Reference
  reference     String?
  narration     String?  @db.Text
  
  // Status
  status        String   @default("draft") // draft, posted, cancelled
  isPosted      Boolean  @default(false)
  postedAt      DateTime?
  postedBy      String?
  postedByUser  User?    @relation("VoucherPostedBy", fields: [postedBy], references: [id], onDelete: SetNull)
  
  // Relations
  entries       VoucherEntry[]
  
  // Relations to other modules
  quotationId   String?
  quotation     Quotation? @relation(fields: [quotationId], references: [id], onDelete: SetNull)
  
  clientId      String?
  client        Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
  
  supplierId    String?
  supplier      Supplier? @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  
  // Audit
  createdBy     String
  creator      User     @relation("VoucherCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([voucherType])
  @@index([date])
  @@index([status])
  @@index([isPosted])
  @@index([quotationId])
  @@index([clientId])
  @@index([supplierId])
  @@index([createdBy])
}

enum VoucherType {
  PAYMENT      // Payment voucher (cash/bank payment)
  RECEIPT      // Receipt voucher (cash/bank receipt)
  JOURNAL      // Journal voucher (non-cash transactions)
  CONTRA       // Contra voucher (cash to bank or vice versa)
  SALES        // Sales voucher (from quotation/invoice)
  PURCHASE     // Purchase voucher (to supplier)
}

model VoucherEntry {
  id          String   @id @default(cuid())
  voucherId  String
  voucher    Voucher  @relation(fields: [voucherId], references: [id], onDelete: Cascade)
  
  accountId  String
  account    ChartOfAccount @relation(fields: [accountId], references: [id], onDelete: Restrict)
  
  // Amounts
  debit      Decimal  @default(0) @db.Decimal(12, 2)
  credit     Decimal  @default(0) @db.Decimal(12, 2)
  
  // Description
  description String? @db.Text
  narration   String? @db.Text
  
  // Order
  sortOrder   Int     @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([voucherId])
  @@index([accountId])
}
```

#### 4. CashBankAccount
```prisma
model CashBankAccount {
  id            String   @id @default(cuid())
  name          String
  accountType   CashBankType // CASH, BANK
  accountNumber String?  // Bank account number
  bankName      String?  // Bank name
  branchName    String?  // Branch name
  ifscCode      String?  // IFSC code
  swiftCode     String?
  
  // Linked chart of account
  chartOfAccountId String
  chartOfAccount   ChartOfAccount @relation(fields: [chartOfAccountId], references: [id], onDelete: Restrict)
  
  // Balance
  openingBalance Decimal @default(0) @db.Decimal(12, 2)
  currentBalance Decimal @default(0) @db.Decimal(12, 2)
  
  // Status
  isActive    Boolean  @default(true)
  status      String   @default("active") // active, inactive, trash
  
  // Relations
  transactions CashBankTransaction[]
  
  // Audit
  createdBy   String
  creator     User     @relation("CashBankAccountCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([chartOfAccountId])
  @@index([accountType])
  @@index([status])
  @@index([createdBy])
}

enum CashBankType {
  CASH
  BANK
}

model CashBankTransaction {
  id              String   @id @default(cuid())
  cashBankAccountId String
  cashBankAccount   CashBankAccount @relation(fields: [cashBankAccountId], references: [id], onDelete: Cascade)
  
  // Transaction details
  date            DateTime
  transactionType TransactionType // DEPOSIT, WITHDRAWAL, TRANSFER
  amount          Decimal  @db.Decimal(12, 2)
  
  // Reference
  voucherId       String?
  voucher         Voucher? @relation(fields: [voucherId], references: [id], onDelete: SetNull)
  
  // Relations to other modules
  quotationId    String?
  quotation      Quotation? @relation(fields: [quotationId], references: [id], onDelete: SetNull)
  
  clientId       String?
  client         Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
  
  supplierId     String?
  supplier       Supplier? @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  
  // Description
  description    String?  @db.Text
  reference      String?
  
  // Balance after transaction
  balance        Decimal  @db.Decimal(12, 2)
  
  // Audit
  createdBy      String
  creator        User     @relation("CashBankTransactionCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([cashBankAccountId])
  @@index([date])
  @@index([transactionType])
  @@index([voucherId])
  @@index([quotationId])
  @@index([clientId])
  @@index([supplierId])
  @@index([createdBy])
}

enum TransactionType {
  DEPOSIT
  WITHDRAWAL
  TRANSFER
}
```

### Update Existing Models

#### User Model (Add Relations)
```prisma
model User {
  // ... existing fields ...
  
  // Accounts module relations
  createdChartOfAccounts ChartOfAccount[] @relation("ChartOfAccountCreator")
  createdLedgerEntries   LedgerEntry[]   @relation("LedgerEntryCreator")
  createdVouchers         Voucher[]       @relation("VoucherCreator")
  postedVouchers          Voucher[]       @relation("VoucherPostedBy")
  createdCashBankAccounts CashBankAccount[] @relation("CashBankAccountCreator")
  createdCashBankTransactions CashBankTransaction[] @relation("CashBankTransactionCreator")
}
```

#### Quotation Model (Add Relations)
```prisma
model Quotation {
  // ... existing fields ...
  
  // Accounts module relations
  ledgerEntries    LedgerEntry[]
  vouchers         Voucher[]
  cashBankTransactions CashBankTransaction[]
}
```

#### Client Model (Add Relations)
```prisma
model Client {
  // ... existing fields ...
  
  // Accounts module relations
  ledgerEntries    LedgerEntry[]
  vouchers         Voucher[]
  cashBankTransactions CashBankTransaction[]
}
```

#### Supplier Model (Add Relations)
```prisma
model Supplier {
  // ... existing fields ...
  
  // Accounts module relations
  ledgerEntries    LedgerEntry[]
  vouchers         Voucher[]
  cashBankTransactions CashBankTransaction[]
}
```

#### Organization Model (Add Relations)
```prisma
model Organization {
  // ... existing fields ...
  
  // Note: Organization can be linked through Quotation or directly
  // May need to add direct relations if needed
}
```

---

## Relationships with Existing Modules

### 1. Users Module

**Relationship Type**: Creator/Owner relationship

**Integration Points**:
- All accounting records track `createdBy` (User ID)
- Users can be assigned as account managers
- User permissions control access to accounts module
- User activity logs can track accounting actions

**Data Flow**:
```
User → Creates → ChartOfAccount, Voucher, LedgerEntry, CashBankAccount
User → Posts → Voucher (when posting vouchers)
User → Views → All accounting reports
```

**Use Cases**:
- Track who created each account
- Audit trail for all accounting transactions
- Permission-based access control
- User-specific reports

---

### 2. Clients Module

**Relationship Type**: Transactional relationship (Accounts Receivable)

**Integration Points**:
- **Accounts Receivable**: Calculated from Quotations with status ACCEPTED
- **Ledger Entries**: Created when quotation is accepted/invoiced
- **Vouchers**: Sales vouchers linked to client quotations
- **Cash/Bank Transactions**: Receipts from clients

**Data Flow**:
```
Client → Has → Quotations (ACCEPTED status)
Quotation (ACCEPTED) → Generates → Accounts Receivable
Quotation (ACCEPTED) → Creates → LedgerEntry (Debit: Accounts Receivable)
Client Payment → Creates → Receipt Voucher
Receipt Voucher → Creates → LedgerEntry (Credit: Accounts Receivable, Debit: Cash/Bank)
```

**Use Cases**:
- Track outstanding receivables per client
- Generate aging reports
- Link payments to specific quotations
- Client-wise profit analysis

**Required Fields in Client Model**:
- `accountsReceivableBalance` (calculated)
- `totalSales` (calculated)
- `totalPayments` (calculated)

---

### 3. Suppliers Module

**Relationship Type**: Transactional relationship (Accounts Payable)

**Integration Points**:
- **Accounts Payable**: Track money owed to suppliers
- **Ledger Entries**: Created for purchase transactions
- **Vouchers**: Purchase vouchers linked to supplier transactions
- **Cash/Bank Transactions**: Payments to suppliers

**Data Flow**:
```
Supplier → Has → Purchase Orders/Invoices
Purchase → Creates → Accounts Payable
Purchase → Creates → LedgerEntry (Credit: Accounts Payable)
Supplier Payment → Creates → Payment Voucher
Payment Voucher → Creates → LedgerEntry (Debit: Accounts Payable, Credit: Cash/Bank)
```

**Use Cases**:
- Track outstanding payables per supplier
- Generate aging reports
- Link payments to specific purchase orders
- Supplier-wise expense analysis

**Required Fields in Supplier Model**:
- `accountsPayableBalance` (calculated)
- `totalPurchases` (calculated)
- `totalPayments` (calculated)

---

### 4. Quotations Module

**Relationship Type**: Revenue generation relationship

**Integration Points**:
- **Quotation Status**: When status changes to ACCEPTED, create accounting entries
- **Sales Voucher**: Auto-create when quotation is accepted
- **Ledger Entries**: 
  - Debit: Accounts Receivable (or Cash/Bank if paid immediately)
  - Credit: Sales Account
- **Accounts Receivable**: Outstanding amount from accepted quotations

**Data Flow**:
```
Quotation (DRAFT/SENT) → No accounting entry
Quotation (ACCEPTED) → Creates:
  - Sales Voucher
  - LedgerEntry (Debit: Accounts Receivable, Credit: Sales)
  - Updates Client's Accounts Receivable balance
Quotation Payment → Creates:
  - Receipt Voucher
  - LedgerEntry (Credit: Accounts Receivable, Debit: Cash/Bank)
```

**Status-Based Accounting**:
- **DRAFT**: No accounting impact
- **SENT**: No accounting impact
- **ACCEPTED**: Creates sales entry and accounts receivable
- **REJECTED**: No accounting impact
- **EXPIRED**: No accounting impact (unless previously accepted)
- **REVISED**: May require adjustment entries

**Required Integration Logic**:
```typescript
// When quotation status changes to ACCEPTED
async function onQuotationAccepted(quotationId: string) {
  const quotation = await getQuotation(quotationId);
  
  // Create sales voucher
  const voucher = await createVoucher({
    voucherType: 'SALES',
    quotationId: quotation.id,
    clientId: quotation.clientId,
    date: new Date(),
    totalAmount: quotation.grandTotal,
    entries: [
      {
        accountId: 'accounts-receivable-account-id',
        debit: quotation.grandTotal,
        credit: 0,
        description: `Sales from Quotation ${quotation.quotationNumber}`
      },
      {
        accountId: 'sales-account-id',
        debit: 0,
        credit: quotation.grandTotal,
        description: `Sales from Quotation ${quotation.quotationNumber}`
      }
    ]
  });
  
  // Create ledger entries
  await createLedgerEntriesFromVoucher(voucher);
  
  // Update client's accounts receivable
  await updateClientAccountsReceivable(quotation.clientId);
}
```

---

### 5. Organizations Module (Company)

**Relationship Type**: Entity relationship (Company/Organization setup)

**Integration Points**:
- **Company Information**: Used in financial statements
- **Organization Settings**: Financial year, currency, tax settings
- **Default Accounts**: Organization-specific chart of accounts
- **Financial Reports**: All reports are organization-scoped

**Data Flow**:
```
Organization → Has → Settings (Financial Year, Currency, Tax)
Organization → Has → Chart of Accounts (default accounts)
Organization → Used In → All Financial Reports
```

**Use Cases**:
- Multi-organization support (if needed)
- Organization-specific financial year
- Company details in balance sheet
- Tax calculations based on organization

**Required Fields in Organization Model**:
- `financialYearStart` (Date)
- `financialYearEnd` (Date)
- `currency` (String, default: "USD")
- `taxId` (String, for tax reporting)
- `defaultChartOfAccountId` (String, reference to ChartOfAccount)

---

### 6. Orders Module (Future)

**Relationship Type**: Transactional relationship

**Note**: Currently, the system uses Quotations. If Orders module is added:

**Integration Points**:
- **Order Fulfillment**: Creates inventory and cost entries
- **Purchase Orders**: Links to Suppliers and creates Accounts Payable
- **Sales Orders**: Links to Clients and creates Accounts Receivable

**Data Flow**:
```
Order (Sales) → Similar to Quotation (ACCEPTED)
Order (Purchase) → Creates Accounts Payable
Order Fulfillment → Creates Inventory/Cost entries
```

---

### 7. Invoices Module (Future)

**Relationship Type**: Billing relationship

**Note**: Currently, Quotations serve as invoices. If separate Invoice module is added:

**Integration Points**:
- **Invoice Generation**: From accepted quotations
- **Invoice Payment**: Creates receipt vouchers
- **Tax Calculations**: VAT/GST entries

**Data Flow**:
```
Quotation (ACCEPTED) → Generates → Invoice
Invoice → Creates → Sales Voucher (if not already created)
Invoice Payment → Creates → Receipt Voucher
```

---

## Integration Points

### 1. Quotation Status Change → Accounting Entry

**Trigger**: When quotation status changes to `ACCEPTED`

**Actions**:
1. Create Sales Voucher
2. Create Ledger Entries:
   - Debit: Accounts Receivable (Client)
   - Credit: Sales Account
3. Update Client's Accounts Receivable balance
4. Update Sales account balance

**Implementation Location**:
- `app/actions/quotations.ts` - Update `updateQuotationStatus` function
- Add hook: `onQuotationAccepted(quotationId: string)`

---

### 2. Client Payment → Receipt Voucher

**Trigger**: When payment is received from client

**Actions**:
1. Create Receipt Voucher
2. Create Ledger Entries:
   - Debit: Cash/Bank Account
   - Credit: Accounts Receivable (Client)
3. Update Client's Accounts Receivable balance
4. Update Cash/Bank balance

**Implementation Location**:
- New action: `app/actions/accounts/receipt.action.ts`
- Function: `createReceiptVoucher(input: ReceiptVoucherInput)`

---

### 3. Supplier Payment → Payment Voucher

**Trigger**: When payment is made to supplier

**Actions**:
1. Create Payment Voucher
2. Create Ledger Entries:
   - Debit: Accounts Payable (Supplier)
   - Credit: Cash/Bank Account
3. Update Supplier's Accounts Payable balance
4. Update Cash/Bank balance

**Implementation Location**:
- New action: `app/actions/accounts/payment.action.ts`
- Function: `createPaymentVoucher(input: PaymentVoucherInput)`

---

### 4. Accounts Receivable Calculation

**Trigger**: On-demand or scheduled calculation

**Calculation Logic**:
```typescript
async function calculateAccountsReceivable(clientId?: string) {
  const where = clientId ? { clientId } : {};
  
  // Get all accepted quotations
  const acceptedQuotations = await prisma.quotation.findMany({
    where: {
      status: 'ACCEPTED',
      ...where
    },
    include: {
      client: true
    }
  });
  
  // Get all receipt vouchers for these quotations
  const receipts = await prisma.voucher.findMany({
    where: {
      voucherType: 'RECEIPT',
      quotationId: { in: acceptedQuotations.map(q => q.id) }
    }
  });
  
  // Calculate outstanding
  const totalSales = acceptedQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
  const totalReceipts = receipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const outstanding = totalSales - totalReceipts;
  
  return {
    totalSales,
    totalReceipts,
    outstanding
  };
}
```

**Implementation Location**:
- New action: `app/actions/accounts/accounts-receivable.action.ts`
- Function: `getAccountsReceivable(clientId?: string, date?: Date)`

---

### 5. Accounts Payable Calculation

**Trigger**: On-demand or scheduled calculation

**Calculation Logic**:
```typescript
async function calculateAccountsPayable(supplierId?: string) {
  // Similar to Accounts Receivable but for suppliers
  // Track purchase orders/invoices and payments
}
```

**Implementation Location**:
- New action: `app/actions/accounts/accounts-payable.action.ts`
- Function: `getAccountsPayable(supplierId?: string, date?: Date)`

---

### 6. Trial Balance Generation

**Trigger**: On-demand report generation

**Calculation Logic**:
```typescript
async function generateTrialBalance(asOfDate?: Date) {
  const date = asOfDate || new Date();
  
  // Get all chart of accounts
  const accounts = await prisma.chartOfAccount.findMany({
    where: { isActive: true }
  });
  
  // Calculate balance for each account
  const trialBalance = await Promise.all(
    accounts.map(async (account) => {
      const entries = await prisma.ledgerEntry.findMany({
        where: {
          accountId: account.id,
          date: { lte: date }
        }
      });
      
      const debit = entries.reduce((sum, e) => sum + e.debit, 0);
      const credit = entries.reduce((sum, e) => sum + e.credit, 0);
      const balance = debit - credit;
      
      return {
        account,
        debit,
        credit,
        balance
      };
    })
  );
  
  return trialBalance;
}
```

**Implementation Location**:
- New action: `app/actions/accounts/trial-balance.action.ts`
- Function: `getTrialBalance(asOfDate?: Date)`

---

### 7. Balance Sheet Generation

**Trigger**: On-demand report generation

**Calculation Logic**:
```typescript
async function generateBalanceSheet(asOfDate?: Date) {
  const date = asOfDate || new Date();
  
  // Get assets (AccountType = ASSET)
  const assets = await getAccountBalances('ASSET', date);
  
  // Get liabilities (AccountType = LIABILITY)
  const liabilities = await getAccountBalances('LIABILITY', date);
  
  // Get equity (AccountType = EQUITY)
  const equity = await getAccountBalances('EQUITY', date);
  
  // Calculate totals
  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);
  
  // Verify: Assets = Liabilities + Equity
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;
  
  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced
  };
}
```

**Implementation Location**:
- New action: `app/actions/accounts/balance-sheet.action.ts`
- Function: `getBalanceSheet(asOfDate?: Date)`

---

### 8. Profit & Loss Generation

**Trigger**: On-demand report generation

**Calculation Logic**:
```typescript
async function generateProfitLoss(startDate: Date, endDate: Date) {
  // Get income (AccountType = INCOME)
  const income = await getAccountBalances('INCOME', startDate, endDate);
  
  // Get expenses (AccountType = EXPENSE)
  const expenses = await getAccountBalances('EXPENSE', startDate, endDate);
  
  // Calculate totals
  const totalIncome = income.reduce((sum, i) => sum + i.balance, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);
  const netProfit = totalIncome - totalExpenses;
  
  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netProfit
  };
}
```

**Implementation Location**:
- New action: `app/actions/accounts/profit-loss.action.ts`
- Function: `getProfitLoss(startDate: Date, endDate: Date)`

---

## Data Flow Diagrams

### 1. Quotation Acceptance Flow

```
Quotation (DRAFT/SENT)
    ↓
Status Changed to ACCEPTED
    ↓
┌─────────────────────────────────────┐
│ Create Sales Voucher                │
│ - Type: SALES                       │
│ - Linked to Quotation                │
│ - Linked to Client                   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Create Ledger Entries               │
│ - Debit: Accounts Receivable        │
│ - Credit: Sales Account             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Update Balances                     │
│ - Client.accountsReceivableBalance  │
│ - ChartOfAccount.currentBalance     │
└─────────────────────────────────────┘
```

### 2. Client Payment Flow

```
Client Payment Received
    ↓
┌─────────────────────────────────────┐
│ Create Receipt Voucher              │
│ - Type: RECEIPT                     │
│ - Linked to Client                  │
│ - Linked to Quotation (optional)     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Create Ledger Entries               │
│ - Debit: Cash/Bank Account         │
│ - Credit: Accounts Receivable       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Update Balances                     │
│ - CashBankAccount.currentBalance    │
│ - Client.accountsReceivableBalance  │
└─────────────────────────────────────┘
```

### 3. Voucher Posting Flow

```
Voucher Created (DRAFT)
    ↓
User Posts Voucher
    ↓
┌─────────────────────────────────────┐
│ Validate Double-Entry               │
│ - Sum of Debits = Sum of Credits   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Create Ledger Entries               │
│ - One entry per VoucherEntry        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Update Account Balances              │
│ - For each account in voucher       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Mark Voucher as Posted               │
│ - status = "posted"                 │
│ - isPosted = true                   │
│ - postedAt = now()                 │
└─────────────────────────────────────┘
```

### 4. Trial Balance Generation Flow

```
User Requests Trial Balance
    ↓
┌─────────────────────────────────────┐
│ Get All Active Accounts             │
│ - ChartOfAccount (isActive = true) │
└─────────────────────────────────────┘
    ↓
For Each Account:
    ↓
┌─────────────────────────────────────┐
│ Calculate Balance                    │
│ - Sum all LedgerEntry.debit         │
│ - Sum all LedgerEntry.credit        │
│ - Balance = Debit - Credit          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Generate Report                      │
│ - Group by AccountType              │
│ - Calculate Totals                  │
│ - Verify: Total Debits = Credits    │
└─────────────────────────────────────┘
```

---

## Implementation Requirements

### Phase 1: Core Data Models
1. ✅ Create Prisma schema for all accounting models
2. ✅ Run database migrations
3. ✅ Generate Prisma client

### Phase 2: Chart of Accounts
1. ✅ Create server actions (CRUD)
2. ✅ Create UI components (form, table, tree view)
3. ✅ Implement account hierarchy
4. ✅ Add default accounts seeding

### Phase 3: Vouchers
1. ✅ Create server actions (CRUD, posting)
2. ✅ Create UI components (form, table)
3. ✅ Implement double-entry validation
4. ✅ Add voucher types (Payment, Receipt, Journal, Contra, Sales, Purchase)

### Phase 4: Ledgers
1. ✅ Create server actions (read, filter)
2. ✅ Create UI components (table, filters)
3. ✅ Implement balance calculations
4. ✅ Add account-wise ledger view

### Phase 5: Cash & Bank
1. ✅ Create server actions (CRUD)
2. ✅ Create UI components (form, table)
3. ✅ Implement transaction tracking
4. ✅ Add bank reconciliation

### Phase 6: Reports (Trial Balance, Balance Sheet, P&L)
1. ✅ Create server actions (calculation logic)
2. ✅ Create UI components (report views)
3. ✅ Implement date range filtering
4. ✅ Add export functionality (PDF, Excel)

### Phase 7: Accounts Receivable
1. ✅ Create server actions (calculation from Quotations)
2. ✅ Create UI components (aging report)
3. ✅ Integrate with Quotation module
4. ✅ Add client-wise reports

### Phase 8: Accounts Payable
1. ✅ Create server actions (calculation from Suppliers)
2. ✅ Create UI components (aging report)
3. ✅ Integrate with Supplier module
4. ✅ Add supplier-wise reports

### Phase 9: Integration
1. ✅ Integrate Quotation status change → Accounting entry
2. ✅ Add payment tracking for clients
3. ✅ Add payment tracking for suppliers
4. ✅ Implement automatic voucher creation

### Phase 10: Permissions & Security
1. ✅ Implement permission checks
2. ✅ Add audit logging
3. ✅ Add data validation
4. ✅ Add transaction locking

---

## Module-Specific Details

### Chart of Accounts

**Key Features**:
- Hierarchical account structure (parent-child)
- Account codes (numeric or alphanumeric)
- Account types (Asset, Liability, Equity, Income, Expense)
- Opening balance support
- System accounts (cannot be deleted)

**Default Accounts to Seed**:
```
Assets:
  - 1000: Current Assets
    - 1100: Cash
    - 1200: Bank Accounts
    - 1300: Accounts Receivable
  - 2000: Fixed Assets
    - 2100: Property, Plant & Equipment

Liabilities:
  - 3000: Current Liabilities
    - 3100: Accounts Payable
    - 3200: Short-term Loans
  - 4000: Long-term Liabilities

Equity:
  - 5000: Capital
  - 6000: Retained Earnings

Income:
  - 7000: Sales
  - 8000: Other Income

Expenses:
  - 9000: Cost of Goods Sold
  - 9100: Operating Expenses
```

---

### Vouchers

**Voucher Types**:
1. **Payment Voucher**: Cash/Bank payment (Debit: Expense/Asset, Credit: Cash/Bank)
2. **Receipt Voucher**: Cash/Bank receipt (Debit: Cash/Bank, Credit: Income/Asset)
3. **Journal Voucher**: Non-cash transactions (Debit: Any, Credit: Any)
4. **Contra Voucher**: Cash to Bank or Bank to Cash transfers
5. **Sales Voucher**: Sales transactions (auto-created from Quotations)
6. **Purchase Voucher**: Purchase transactions (for suppliers)

**Validation Rules**:
- Sum of Debits must equal Sum of Credits
- At least 2 entries required (double-entry)
- Cannot modify posted vouchers
- Cannot delete posted vouchers (only cancel)

---

### Ledgers

**Features**:
- Account-wise transaction listing
- Running balance calculation
- Date range filtering
- Reference linking (Quotation, Client, Supplier)
- Export functionality

---

### Trial Balance

**Features**:
- All accounts with debit/credit balances
- Date range selection
- Grouping by account type
- Total verification (Debits = Credits)
- Export to PDF/Excel

---

### Balance Sheet

**Features**:
- Assets section (Current + Fixed)
- Liabilities section (Current + Long-term)
- Equity section
- Date selection
- Comparison with previous period
- Export functionality

---

### Profit & Loss

**Features**:
- Income section
- Expense section
- Gross Profit calculation
- Net Profit calculation
- Date range selection
- Comparison with previous period
- Export functionality

---

### Cash & Bank

**Features**:
- Multiple cash accounts
- Multiple bank accounts
- Transaction tracking
- Balance reconciliation
- Bank statement import (future)
- Transfer between accounts

---

### Accounts Receivable

**Features**:
- Client-wise outstanding
- Aging analysis (0-30, 31-60, 61-90, 90+ days)
- Quotation-wise tracking
- Payment history
- Export functionality

**Calculation**:
```
Accounts Receivable = Sum of (Accepted Quotations) - Sum of (Receipts)
```

---

### Accounts Payable

**Features**:
- Supplier-wise outstanding
- Aging analysis
- Purchase order tracking
- Payment history
- Export functionality

**Calculation**:
```
Accounts Payable = Sum of (Purchase Orders/Invoices) - Sum of (Payments)
```

---

## Conclusion

This documentation provides a complete overview of the Accounts Module structure, required data models, relationships with existing modules, and implementation requirements. The module is designed to integrate seamlessly with the existing Quotation, Client, Supplier, Organization, and User modules to provide comprehensive accounting functionality.

**Next Steps**:
1. Review and approve this documentation
2. Create detailed implementation plan
3. Begin Phase 1 implementation (Data Models)
4. Iterate through remaining phases

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-XX  
**Author**: System Documentation

