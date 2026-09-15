# Accounts System Developer Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Core Concepts](#core-concepts)
5. [Integration Points](#integration-points)
6. [API Reference](#api-reference)
7. [Adding New Accounting Features](#adding-new-accounting-features)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Accounts System is a comprehensive double-entry accounting module integrated with inventory and sales operations. It automatically creates accounting entries for purchases, production, and sales transactions, ensuring accurate financial tracking.

### Key Features

- **Double-Entry Accounting**: All transactions maintain Debit = Credit balance
- **Automatic Voucher Creation**: Purchases, production, and sales auto-create accounting vouchers
- **Item-Type Based Accounting**: Different inventory accounts for RAW_MATERIAL, READY_PRODUCT, and RETAIL
- **Transaction Safety**: All operations use database transactions for atomicity
- **Audit Trail**: Complete logging of all accounting operations

### Integration Modules

- **Purchases**:** Auto-creates PURCHASE vouchers when items are received
- **Production**:** Auto-creates JOURNAL vouchers when production is completed
- **Sales**:** Auto-creates SALES vouchers when sales are completed
- **Cash/Bank**:** Manual receipt and payment vouchers

---

## Architecture

### System Flow

```
Business Transaction (Purchase/Sale/Production)
    ↓
Status Change (RECEIVED/COMPLETED)
    ↓
Stock Update (within transaction)
    ↓
Accounting Voucher Creation
    ↓
Journal Entry Creation
    ↓
Voucher Posting (automatic)
    ↓
Voucher Linked to Source Document
```

### Component Structure

```
accounts/
├── vouchers/
│   ├── _actions/
│   │   ├── voucher.action.tsx      # Core voucher operations
│   │   └── accounting-helpers.tsx  # Helper functions
│   └── [type]/
│       ├── add/                    # Create vouchers
│       └── [id]/                   # View/edit vouchers
├── chart-of-accounts/              # Chart of Accounts management
├── ledgers/                        # Account ledger views
└── reports/
    ├── trial-balance/              # Trial Balance report
    ├── balance-sheet/             # Balance Sheet report
    ├── profit-loss/               # P&L report
    ├── accounts-receivable/      # AR Summary
    └── accounts-payable/          # AP Summary
```

### Key Files

- **`voucher.action.tsx`**: Core voucher creation, posting, and management
- **`accounting-helpers.tsx`**: Shared helper functions (e.g., `findControlAccount`)
- **`purchase.action.tsx`**: Purchase accounting integration (`createPurchaseAccountingVoucher`)
- **`sale.action.tsx`**: Sales accounting integration (in `completeSale`)
- **`production.action.tsx`**: Production accounting integration (in `completeProductionOrder`)

---

## Database Schema

### Core Models

#### Voucher

```prisma
model Voucher {
  id            String      @id @default(cuid())
  voucherNumber String      @unique
  date          DateTime    @default(now())
  type          VoucherType
  status        String      @default("draft") // draft, posted, cancelled
  reference     String?     // Purchase number, Sale number, etc.
  description   String?
  supplierId    String?
  clientId      String?
  voucherId     String?     // For contra vouchers
  createdBy     String
  postedById    String?
  postedAt      DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  // Relations
  JournalEntry  JournalEntry[]
  VoucherLine   VoucherLine[]
  Purchase      Purchase[]
  Sale          Sale[]
  ProductionOrder ProductionOrder[]
}
```

#### JournalEntry

```prisma
model JournalEntry {
  id          String   @id
  entryNumber String   @unique
  date        DateTime @default(now())
  voucherId   String
  description String?
  status      String   @default("posted")
  createdBy   String
  postedBy    String
  postedAt    DateTime
  createdAt   DateTime @default(now())
  
  // Relations
  Voucher          Voucher           @relation(...)
  JournalEntryLine JournalEntryLine[]
}
```

#### JournalEntryLine

```prisma
model JournalEntryLine {
  id               String         @id
  lineNumber       Int
  debitAmount      Decimal        @default(0) @db.Decimal(12, 2)
  creditAmount     Decimal        @default(0) @db.Decimal(12, 2)
  description      String?
  journalEntryId   String
  chartOfAccountId String
  clientId         String?
  supplierId       String?
  userId           String?
  organizationId   String?
  createdAt        DateTime       @default(now())
  
  // Relations
  ChartOfAccount ChartOfAccount @relation(...)
  JournalEntry   JournalEntry   @relation(...)
  Client         Client?        @relation(...)
  Supplier       Supplier?      @relation(...)
}
```

#### ChartOfAccount

```prisma
model ChartOfAccount {
  id          String      @id
  code        String      @unique
  name        String
  type        AccountType // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  description String?
  status      String      @default("active")
  parentId    String?
  isPostable  Boolean     @default(false)
  createdBy   String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  // Relations
  JournalEntryLine JournalEntryLine[]
  VoucherLine      VoucherLine[]
}
```

### Enums

```prisma
enum VoucherType {
  PAYMENT   // Supplier payments
  RECEIPT   // Customer receipts
  JOURNAL   // General journal entries (production, adjustments)
  CONTRA    // Cash/Bank transfers
  SALES     // Sales transactions
  PURCHASE  // Purchase transactions
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}
```

---

## Core Concepts

### Double-Entry Accounting

Every transaction must have **equal debits and credits**. The system enforces this through validation:

```typescript
function validateVoucherLines(lines: Array<{ debitAmount: number; creditAmount: number }>): {
  valid: boolean;
  error?: string;
} {
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);
  
  const difference = Math.abs(totalDebit - totalCredit);
  if (difference > 0.01) {
    return {
      valid: false,
      error: `Double-entry balance mismatch: Debit (${totalDebit}) ≠ Credit (${totalCredit})`,
    };
  }
  
  return { valid: true };
}
```

### Voucher Types

1. **PURCHASE**: Created when purchases are received
   - Debit: Inventory (Raw Material/Ready Products/Retail)
   - Credit: Accounts Payable

2. **SALES**: Created when sales are completed
   - Debit: Accounts Receivable
   - Credit: Sales Revenue
   - Debit: COGS (for finished goods)
   - Credit: Ready Products Inventory (for finished goods)

3. **JOURNAL**: Created for production and adjustments
   - Production: Debit FG Inventory, Credit Raw Material Inventory

4. **RECEIPT**: Customer payments
   - Debit: Cash/Bank Account
   - Credit: Accounts Receivable

5. **PAYMENT**: Supplier payments
   - Debit: Accounts Payable
   - Credit: Cash/Bank Account

6. **CONTRA**: Cash/Bank transfers
   - Debit: Destination Account
   - Credit: Source Account

### Control Accounts

Control accounts are special accounts used for automatic accounting:

- **Accounts Receivable (1410)**: Tracks customer balances
- **Accounts Payable (2110)**: Tracks supplier balances
- **Sales Revenue (4110)**: Tracks sales income
- **Cost of Goods Sold (5110)**: Tracks cost of goods sold
- **Raw Material Inventory (1620)**: Tracks raw material stock value
- **Ready Products Inventory (1630)**: Tracks finished goods stock value
- **Retail Inventory (1640)**: Tracks retail item stock value

**Finding Control Accounts**:

```typescript
import { findControlAccount } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/accounting-helpers";

const arAccountId = await findControlAccount("Accounts Receivable");
const apAccountId = await findControlAccount("Accounts Payable");
```

### Voucher Lifecycle

1. **Draft**: Voucher created but not posted
2. **Posted**: Voucher posted to accounting (creates JournalEntry)
3. **Cancelled**: Voucher cancelled (cannot be undone)

**Posting a Voucher**:
- Creates JournalEntry
- Creates JournalEntryLine records
- Sets voucher status to "posted"
- Records postedBy and postedAt

---

## Integration Points

### Purchase Accounting

**Location**: `app/(dashboard)/dashboard/purchases/_actions/purchase.action.tsx`

**Function**: `createPurchaseAccountingVoucher(purchaseId, tx?)`

**Trigger**: When purchase status changes to `RECEIVED` or `PARTIALLY_RECEIVED`

**Process**:

1. Fetches purchase with items and item details
2. Groups items by `itemType` (RAW_MATERIAL, READY_PRODUCT, RETAIL)
3. Calculates totals per item type
4. Creates voucher lines:
   - Debit: Appropriate inventory account based on item type
   - Credit: Accounts Payable
5. Creates PURCHASE voucher
6. Posts voucher automatically
7. Links voucher to purchase

**Example**:

```typescript
// In updatePurchase() or bulkUpdatePurchaseStatus()
if (status === "RECEIVED" || status === "PARTIALLY_RECEIVED") {
  await updateStockOnPurchase(purchase.id);
  if (!purchase.voucherId) {
    await createPurchaseAccountingVoucher(purchase.id);
  }
}
```

**Voucher Structure**:

```typescript
{
  type: VoucherType.PURCHASE,
  date: purchase.date,
  reference: purchase.purchaseNumber,
  description: `Purchase ${purchase.purchaseNumber} - ${supplier.name}`,
  supplierId: purchase.supplierId,
  lines: [
    {
      lineNumber: 1,
      debitAmount: totalRawMaterialCost,
      creditAmount: 0,
      chartOfAccountId: rawMaterialInventoryId,
      description: "Raw Material Inventory - PUR2026000001",
    },
    {
      lineNumber: 2,
      debitAmount: 0,
      creditAmount: totalRawMaterialCost,
      chartOfAccountId: apAccountId,
      supplierId: purchase.supplierId,
      description: "Accounts Payable - PUR2026000001 - Supplier Name",
    },
  ],
}
```

### Production Accounting

**Location**: `app/(dashboard)/dashboard/production/orders/_actions/production.action.tsx`

**Function**: Integrated in `completeProductionOrder(id)`

**Trigger**: When production order status changes to `COMPLETED`

**Process**:

1. Calculates total raw material cost from BOM items
2. Creates JOURNAL voucher:
   - Debit: Ready Products Inventory = raw material cost
   - Credit: Raw Material Inventory = raw material cost
3. Posts voucher automatically
4. Links voucher to production order

**Example**:

```typescript
// After stock transaction completes
let totalRawMaterialCost = 0;
for (const bomItem of order.bom.items) {
  if (bomItem.item.costPrice) {
    const quantityNeeded = (Number(bomItem.quantityRequired) * productionQuantity) / bomQuantityPerUnit;
    totalRawMaterialCost += Number(bomItem.item.costPrice) * quantityNeeded;
  }
}

if (totalRawMaterialCost > 0 && !order.voucherId) {
  const rawMaterialInventoryId = await findControlAccount("Raw Material Inventory");
  const finishedGoodsInventoryId = await findControlAccount("Ready Products Inventory");
  
  if (rawMaterialInventoryId && finishedGoodsInventoryId) {
    const voucherLines = [
      {
        lineNumber: 1,
        debitAmount: totalRawMaterialCost,
        creditAmount: 0,
        chartOfAccountId: finishedGoodsInventoryId,
        description: `Production ${order.code} - Ready Products`,
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: totalRawMaterialCost,
        chartOfAccountId: rawMaterialInventoryId,
        description: `Production ${order.code} - Raw Materials`,
      },
    ];
    
    const voucherResult = await createVoucher({
      date: new Date(),
      type: VoucherType.JOURNAL,
      reference: order.code,
      description: `Production ${order.code}`,
      lines: voucherLines,
    });
    
    if (voucherResult.success && voucherResult.voucher) {
      await postVoucher(voucherResult.voucher.id);
      await prisma.productionOrder.update({
        where: { id },
        data: { voucherId: voucherResult.voucher.id },
      });
    }
  }
}
```

### Sales Accounting

**Location**: `app/(dashboard)/dashboard/sales/_actions/sale.action.tsx`

**Function**: Integrated in `completeSale(saleId)`

**Trigger**: When sale status changes to `COMPLETED`

**Process**:

1. Finds control accounts (AR, Sales Revenue, COGS, FG Inventory)
2. Creates SALES voucher:
   - Debit: Accounts Receivable = grandTotal
   - Credit: Sales Revenue = grandTotal
   - For READY_PRODUCT items:
     - Debit: COGS = quantity × costPrice
     - Credit: Ready Products Inventory = quantity × costPrice
3. Posts voucher automatically
4. Links voucher to sale

**Example**:

```typescript
// Inside completeSale(), within transaction
const arAccountId = await findControlAccount("Accounts Receivable");
const salesRevenueAccountId = await findControlAccount("Sales Revenue");
const cogsAccountId = await findControlAccount("Cost of Goods Sold");
const fgInventoryAccountId = await findControlAccount("Ready Products Inventory");

const voucherLines = [
  {
    lineNumber: 1,
    debitAmount: Number(sale.grandTotal),
    creditAmount: 0,
    chartOfAccountId: arAccountId,
    clientId: sale.clientId,
    description: `Sale ${sale.saleNumber} - ${sale.client.name}`,
  },
  {
    lineNumber: 2,
    debitAmount: 0,
    creditAmount: Number(sale.grandTotal),
    chartOfAccountId: salesRevenueAccountId,
    description: `Sales Revenue for ${sale.saleNumber}`,
  },
];

// Add COGS lines for finished goods
for (const saleItem of sale.items) {
  if (saleItem.item.itemType === "READY_PRODUCT" && saleItem.item.costPrice) {
    const cogsAmount = Number(saleItem.quantity) * Number(saleItem.item.costPrice);
    voucherLines.push(
      {
        lineNumber: voucherLines.length + 1,
        debitAmount: cogsAmount,
        creditAmount: 0,
        chartOfAccountId: cogsAccountId,
        description: `COGS - ${saleItem.item.name}`,
      },
      {
        lineNumber: voucherLines.length + 2,
        debitAmount: 0,
        creditAmount: cogsAmount,
        chartOfAccountId: fgInventoryAccountId,
        description: `FG Inventory - ${saleItem.item.name}`,
      }
    );
  }
}

const voucherResult = await createVoucher({
  date: sale.date,
  type: VoucherType.SALES,
  reference: sale.saleNumber,
  description: `Sale ${sale.saleNumber} - ${sale.client.name}`,
  clientId: sale.clientId,
  lines: voucherLines,
});

if (voucherResult.success && voucherResult.voucher) {
  await postVoucher(voucherResult.voucher.id);
  await tx.sale.update({
    where: { id: saleId },
    data: { voucherId: voucherResult.voucher.id },
  });
}
```

---

## API Reference

### Core Functions

#### `createVoucher(input)`

Creates a new voucher with lines.

**Location**: `app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action.tsx`

**Parameters**:

```typescript
{
  date: Date;
  type: VoucherType;
  reference?: string;
  description?: string;
  supplierId?: string;
  clientId?: string;
  lines: Array<{
    lineNumber: number;
    debitAmount: number;
    creditAmount: number;
    description?: string;
    chartOfAccountId: string;
    supplierId?: string;
    clientId?: string;
  }>;
}
```

**Returns**:

```typescript
{
  success: boolean;
  error?: string;
  voucher?: Voucher;
}
```

**Example**:

```typescript
const result = await createVoucher({
  date: new Date(),
  type: VoucherType.JOURNAL,
  reference: "ADJ-001",
  description: "Inventory adjustment",
  lines: [
    {
      lineNumber: 1,
      debitAmount: 100,
      creditAmount: 0,
      chartOfAccountId: inventoryAccountId,
    },
    {
      lineNumber: 2,
      debitAmount: 0,
      creditAmount: 100,
      chartOfAccountId: expenseAccountId,
    },
  ],
});
```

#### `postVoucher(voucherId)`

Posts a voucher, creating journal entries.

**Location**: `app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action.tsx`

**Parameters**: `voucherId: string`

**Returns**:

```typescript
{
  success: boolean;
  error?: string;
}
```

**Process**:

1. Validates voucher is in "draft" status
2. Validates voucher lines (double-entry balance)
3. Creates JournalEntry
4. Creates JournalEntryLine records
5. Updates voucher status to "posted"
6. Records postedBy and postedAt

**Example**:

```typescript
const result = await postVoucher("voucher-id");
if (result.success) {
  // Voucher posted, journal entries created
}
```

#### `findControlAccount(accountName)`

Finds a control account by name (case-insensitive, partial match).

**Location**: `app/(dashboard)/dashboard/accounts/vouchers/_actions/accounting-helpers.tsx`

**Parameters**: `accountName: string`

**Returns**: `Promise<string | null>` (account ID or null)

**Example**:

```typescript
const arAccountId = await findControlAccount("Accounts Receivable");
const apAccountId = await findControlAccount("Accounts Payable");
const salesRevenueId = await findControlAccount("Sales Revenue");
```

---

## Adding New Accounting Features

### Step 1: Identify Integration Point

Determine where the accounting entry should be created:
- Purchase receipt → `purchase.action.tsx`
- Sale completion → `sale.action.tsx`
- Production completion → `production.action.tsx`
- Manual adjustment → New server action

### Step 2: Create Voucher Lines

Build voucher lines following double-entry principles:

```typescript
const voucherLines: Array<{
  lineNumber: number;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  chartOfAccountId: string;
  clientId?: string;
  supplierId?: string;
}> = [];

let lineNumber = 1;
let totalDebit = 0;

// Add debit lines
voucherLines.push({
  lineNumber: lineNumber++,
  debitAmount: amount,
  creditAmount: 0,
  chartOfAccountId: debitAccountId,
  description: "Description",
});
totalDebit += amount;

// Add credit line
voucherLines.push({
  lineNumber: lineNumber++,
  debitAmount: 0,
  creditAmount: totalDebit,
  chartOfAccountId: creditAccountId,
  description: "Description",
});
```

### Step 3: Create and Post Voucher

```typescript
const voucherResult = await createVoucher({
  date: transactionDate,
  type: VoucherType.JOURNAL, // or appropriate type
  reference: transactionReference,
  description: "Description",
  lines: voucherLines,
});

if (!voucherResult.success || !voucherResult.voucher) {
  throw new Error(voucherResult.error || "Failed to create voucher");
}

const postResult = await postVoucher(voucherResult.voucher.id);
if (!postResult.success) {
  throw new Error(postResult.error || "Failed to post voucher");
}
```

### Step 4: Link Voucher to Source Document

If the voucher is linked to a business transaction:

```typescript
await prisma.sourceDocument.update({
  where: { id: sourceDocumentId },
  data: { voucherId: voucherResult.voucher.id },
});
```

### Step 5: Add Logging

```typescript
await createUserLog(
  session.user.id,
  LogAction.CREATE,
  "Voucher",
  voucherResult.voucher.id,
  `Created accounting voucher for ${transactionReference}`,
  {
    voucherId: voucherResult.voucher.id,
    voucherNumber: voucherResult.voucher.voucherNumber,
    sourceDocumentId: sourceDocumentId,
  }
);
```

### Example: Adding Inventory Adjustment Accounting

```typescript
export async function createInventoryAdjustmentVoucher(
  adjustmentId: string,
  items: Array<{ itemId: string; quantityChange: number; costPrice: number }>
) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  // Find inventory accounts
  const rawMaterialInventoryId = await findControlAccount("Raw Material Inventory");
  const finishedGoodsInventoryId = await findControlAccount("Ready Products Inventory");
  const retailInventoryId = await findControlAccount("Retail Inventory");
  const inventoryAdjustmentAccountId = await findControlAccount("Inventory Adjustment");

  const voucherLines: Array<{
    lineNumber: number;
    debitAmount: number;
    creditAmount: number;
    chartOfAccountId: string;
    description: string;
  }> = [];

  let lineNumber = 1;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const item of items) {
    const itemRecord = await prisma.item.findUnique({
      where: { id: item.itemId },
      select: { itemType: true, name: true },
    });

    if (!itemRecord) continue;

    const amount = Math.abs(item.quantityChange) * item.costPrice;
    let inventoryAccountId: string | null = null;

    switch (itemRecord.itemType) {
      case "RAW_MATERIAL":
        inventoryAccountId = rawMaterialInventoryId;
        break;
      case "READY_PRODUCT":
        inventoryAccountId = finishedGoodsInventoryId;
        break;
      case "RETAIL":
        inventoryAccountId = retailInventoryId;
        break;
    }

    if (!inventoryAccountId) continue;

    if (item.quantityChange > 0) {
      // Increase inventory (debit inventory, credit adjustment account)
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: amount,
        creditAmount: 0,
        chartOfAccountId: inventoryAccountId,
        description: `Inventory increase - ${itemRecord.name}`,
      });
      totalDebit += amount;
    } else {
      // Decrease inventory (debit adjustment account, credit inventory)
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: 0,
        creditAmount: amount,
        chartOfAccountId: inventoryAccountId,
        description: `Inventory decrease - ${itemRecord.name}`,
      });
      totalCredit += amount;
    }
  }

  // Balance the voucher
  if (totalDebit > totalCredit) {
    voucherLines.push({
      lineNumber: lineNumber++,
      debitAmount: 0,
      creditAmount: totalDebit - totalCredit,
      chartOfAccountId: inventoryAdjustmentAccountId!,
      description: "Inventory adjustment balance",
    });
  } else if (totalCredit > totalDebit) {
    voucherLines.push({
      lineNumber: lineNumber++,
      debitAmount: totalCredit - totalDebit,
      creditAmount: 0,
      chartOfAccountId: inventoryAdjustmentAccountId!,
      description: "Inventory adjustment balance",
    });
  }

  const voucherResult = await createVoucher({
    date: new Date(),
    type: VoucherType.JOURNAL,
    reference: `ADJ-${adjustmentId}`,
    description: `Inventory adjustment ${adjustmentId}`,
    lines: voucherLines,
  });

  if (!voucherResult.success || !voucherResult.voucher) {
    return { success: false, error: voucherResult.error };
  }

  const postResult = await postVoucher(voucherResult.voucher.id);
  if (!postResult.success) {
    return { success: false, error: postResult.error };
  }

  await createUserLog(
    session.user.id,
    LogAction.CREATE,
    "Voucher",
    voucherResult.voucher.id,
    `Created inventory adjustment voucher for ${adjustmentId}`,
    { voucherId: voucherResult.voucher.id }
  );

  return { success: true, voucherId: voucherResult.voucher.id };
}
```

---

## Best Practices

### 1. Always Use Transactions

Wrap accounting operations in `prisma.$transaction`:

```typescript
await prisma.$transaction(async (tx) => {
  // Update stock
  await updateStock(tx);
  
  // Create voucher
  const voucher = await createVoucher({ ... });
  
  // Link voucher
  await tx.document.update({
    where: { id: documentId },
    data: { voucherId: voucher.id },
  });
});
```

### 2. Validate Double-Entry Balance

Always ensure Debit = Credit:

```typescript
const totalDebit = lines.reduce((sum, line) => sum + line.debitAmount, 0);
const totalCredit = lines.reduce((sum, line) => sum + line.creditAmount, 0);

if (Math.abs(totalDebit - totalCredit) > 0.01) {
  throw new Error("Double-entry balance mismatch");
}
```

### 3. Check for Existing Vouchers

Prevent duplicate voucher creation:

```typescript
if (document.voucherId) {
  return { success: true, voucherId: document.voucherId };
}
```

### 4. Use Control Account Helper

Always use `findControlAccount()` instead of hardcoding account IDs:

```typescript
// ✅ Good
const arAccountId = await findControlAccount("Accounts Receivable");

// ❌ Bad
const arAccountId = "hardcoded-account-id";
```

### 5. Handle Errors Gracefully

Return structured error responses:

```typescript
try {
  // ... accounting operations
  return { success: true, voucherId: voucher.id };
} catch (error) {
  console.error("Accounting error:", error);
  return {
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
  };
}
```

### 6. Log All Operations

Always log accounting operations:

```typescript
await createUserLog(
  session.user.id,
  LogAction.CREATE,
  "Voucher",
  voucher.id,
  `Created voucher for ${reference}`,
  { voucherId: voucher.id, reference }
);
```

### 7. Post Vouchers Automatically

For automatic accounting integrations, post vouchers immediately:

```typescript
const voucherResult = await createVoucher({ ... });
if (voucherResult.success && voucherResult.voucher) {
  await postVoucher(voucherResult.voucher.id);
}
```

---

## Common Patterns

### Pattern 1: Item-Type Based Accounting

Group items by type and create separate lines:

```typescript
const itemsByType: Record<ItemType, Array<{ totalCost: number }>> = {
  RAW_MATERIAL: [],
  READY_PRODUCT: [],
  RETAIL: [],
};

for (const item of items) {
  itemsByType[item.itemType].push({
    totalCost: item.quantity * item.costPrice,
  });
}

// Create lines for each type
if (itemsByType.RAW_MATERIAL.length > 0) {
  const total = itemsByType.RAW_MATERIAL.reduce((sum, item) => sum + item.totalCost, 0);
  voucherLines.push({
    lineNumber: lineNumber++,
    debitAmount: total,
    creditAmount: 0,
    chartOfAccountId: rawMaterialInventoryId,
  });
}
```

### Pattern 2: COGS Calculation

Calculate COGS for finished goods:

```typescript
const cogsLines: Array<{
  lineNumber: number;
  debitAmount: number;
  creditAmount: number;
  chartOfAccountId: string;
  description: string;
}> = [];

for (const saleItem of saleItems) {
  if (saleItem.item.itemType === "READY_PRODUCT" && saleItem.item.costPrice) {
    const cogsAmount = Number(saleItem.quantity) * Number(saleItem.item.costPrice);
    
    // COGS Debit
    cogsLines.push({
      lineNumber: cogsLines.length + 1,
      debitAmount: cogsAmount,
      creditAmount: 0,
      chartOfAccountId: cogsAccountId,
      description: `COGS - ${saleItem.item.name}`,
    });
    
    // FG Inventory Credit
    cogsLines.push({
      lineNumber: cogsLines.length + 1,
      debitAmount: 0,
      creditAmount: cogsAmount,
      chartOfAccountId: fgInventoryAccountId,
      description: `FG Inventory - ${saleItem.item.name}`,
    });
  }
}
```

### Pattern 3: Client/Supplier Linking

Link journal entry lines to clients or suppliers:

```typescript
voucherLines.push({
  lineNumber: 1,
  debitAmount: amount,
  creditAmount: 0,
  chartOfAccountId: arAccountId,
  clientId: sale.clientId, // Link to client
  description: `Sale ${sale.saleNumber} - ${client.name}`,
});

voucherLines.push({
  lineNumber: 2,
  debitAmount: 0,
  creditAmount: amount,
  chartOfAccountId: apAccountId,
  supplierId: purchase.supplierId, // Link to supplier
  description: `Purchase ${purchase.purchaseNumber} - ${supplier.name}`,
});
```

---

## Troubleshooting

### Issue: Voucher Not Created

**Symptoms**: Business transaction completed but no voucher created

**Checks**:
1. Verify status change triggers voucher creation
2. Check if voucher already exists (`document.voucherId`)
3. Verify control accounts exist
4. Check server logs for errors
5. Verify items have `costPrice` set

**Solution**:

```typescript
// Add logging
console.log("Creating voucher for:", documentId);
const result = await createAccountingVoucher(documentId);
console.log("Voucher creation result:", result);
```

### Issue: Double-Entry Balance Mismatch

**Symptoms**: Voucher creation fails with balance error

**Checks**:
1. Verify total Debit = total Credit
2. Check for floating-point precision issues
3. Verify all lines have either debit or credit (not both, not neither)

**Solution**:

```typescript
// Round amounts to 2 decimal places
const debitAmount = Math.round(amount * 100) / 100;
const creditAmount = Math.round(amount * 100) / 100;

// Validate before creating
const totalDebit = lines.reduce((sum, line) => sum + line.debitAmount, 0);
const totalCredit = lines.reduce((sum, line) => sum + line.creditAmount, 0);
if (Math.abs(totalDebit - totalCredit) > 0.01) {
  throw new Error(`Balance mismatch: ${totalDebit} ≠ ${totalCredit}`);
}
```

### Issue: Control Account Not Found

**Symptoms**: `findControlAccount()` returns null

**Checks**:
1. Verify account exists in Chart of Accounts
2. Check account name spelling (case-insensitive)
3. Verify account status is "active"

**Solution**:

```typescript
const accountId = await findControlAccount("Accounts Receivable");
if (!accountId) {
  throw new Error("Accounts Receivable control account not found. Please ensure it exists in Chart of Accounts.");
}
```

### Issue: Voucher Not Posted

**Symptoms**: Voucher created but status remains "draft"

**Checks**:
1. Verify `postVoucher()` is called
2. Check for errors in `postVoucher()` result
3. Verify voucher is not already posted

**Solution**:

```typescript
const postResult = await postVoucher(voucher.id);
if (!postResult.success) {
  console.error("Posting failed:", postResult.error);
  throw new Error(postResult.error);
}
```

### Issue: Stock Updated But No Voucher

**Symptoms**: Stock changes but accounting entry missing

**Checks**:
1. Verify voucher creation is called after stock update
2. Check if voucher creation is inside transaction
3. Verify error handling doesn't silently fail

**Solution**:

```typescript
// Ensure voucher creation is after stock update
await updateStock(documentId);
if (!document.voucherId) {
  const result = await createAccountingVoucher(documentId);
  if (!result.success) {
    throw new Error(result.error);
  }
}
```

---

## Additional Resources

- **Testing Guide**: `docs/ACCOUNTS_SYSTEM_TESTING_GUIDE.md`
- **Test Results**: `docs/ACCOUNTS_SYSTEM_TEST_RESULTS.md`
- **Test Execution Summary**: `docs/ACCOUNTS_SYSTEM_TEST_EXECUTION_SUMMARY.md`
- **Sales Module Docs**: `docs/sales/SALES_MODULE.md`
- **Purchase Module**: Check purchase action files for integration examples

---

## Support

For questions or issues:
1. Review this documentation
2. Check server logs for error messages
3. Verify database constraints and relationships
4. Review integration module configurations
5. Check control account setup in Chart of Accounts
