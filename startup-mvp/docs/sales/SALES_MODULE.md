# Sales Module - Development Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Server Actions API](#server-actions-api)
4. [UI Components](#ui-components)
5. [Permissions](#permissions)
6. [Integration Points](#integration-points)
7. [Business Logic](#business-logic)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Sales module manages sales orders to clients. It integrates with the Inventory module to deduct stock when sales are completed, and with the Accounting module to create vouchers for financial transactions including Accounts Receivable, Sales Revenue, and COGS (Cost of Goods Sold).

### Key Features
- **Sales Order Management**: Create, view, edit, and track sales orders
- **Client Integration**: Link sales to clients with full client information
- **Warehouse Assignment**: Assign sales to specific warehouses for stock deduction
- **Status Management**: Track sales through DRAFT → COMPLETED → CANCELLED workflow
- **Auto-Generated Codes**: Sale numbers are automatically generated (e.g., `SAL-2026-0001`)
- **Item Type Restriction**: Only READY_PRODUCT and RETAIL items can be sold
- **Inventory Integration**: Automatically deducts stock when sale is completed
- **Accounting Integration**: Creates accounting vouchers when sale is completed
- **COGS Calculation**: Automatically calculates and records Cost of Goods Sold for READY_PRODUCT items
- **Stock Ledger Integration**: Creates ledger entries for all stock movements
- **Audit Trail**: Complete user activity logging and notifications
- **Soft Delete**: Trash system for safe deletion
- **Quick Client Creation**: Add new clients directly from the sale form

### Module Location
- **Path**: `/dashboard/sales`
- **Permission Key**: `sales.sales`
- **Module Type**: Sales Management

---

## Database Schema

### SaleStatus Enum

```prisma
enum SaleStatus {
  DRAFT
  COMPLETED
  CANCELLED
}
```

### Sale Model

```prisma
model Sale {
  id             String      @id @default(cuid())
  saleNumber     String      @unique // Auto-generated: SAL-2026-0001
  clientId       String
  warehouseId    String
  voucherId      String?     // Link to accounting voucher
  date           DateTime    @default(now())
  status         SaleStatus  @default(DRAFT)
  notes          String?
  attachmentUrl  String?
  subTotal       Decimal     @db.Decimal(12, 2)
  discount       Decimal?    @db.Decimal(5, 2)
  tax            Decimal?    @db.Decimal(5, 2)
  grandTotal     Decimal     @db.Decimal(12, 2)
  isTrash        Boolean     @default(false)
  createdBy      String
  updatedBy      String?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  completedAt    DateTime?   // When status = COMPLETED

  client         Client      @relation(fields: [clientId], references: [id], onDelete: Restrict)
  warehouse      Warehouse   @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  voucher        Voucher?    @relation(fields: [voucherId], references: [id], onDelete: SetNull)
  createdByUser  User        @relation("SaleCreatedBy", fields: [createdBy], references: [id], onDelete: Cascade)
  updatedByUser  User?        @relation("SaleUpdatedBy", fields: [updatedBy], references: [id], onDelete: SetNull)
  items          SaleItem[]

  @@index([clientId])
  @@index([warehouseId])
  @@index([voucherId])
  @@index([status])
  @@index([date])
  @@index([isTrash])
  @@index([saleNumber])
  @@index([createdBy])
}
```

### SaleItem Model

```prisma
model SaleItem {
  id          String   @id @default(cuid())
  saleId      String
  itemId      String   // Required - only FG and RETAIL items
  description String
  quantity    Decimal  @db.Decimal(10, 2)
  unitPrice   Decimal  @db.Decimal(10, 2)
  amount      Decimal  @db.Decimal(12, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sale Sale @relation(fields: [saleId], references: [id], onDelete: Cascade)
  item Item @relation(fields: [itemId], references: [id], onDelete: Restrict)

  @@index([saleId])
  @@index([itemId])
}
```

### Field Descriptions

#### Sale Fields
- **saleNumber**: Auto-generated unique identifier (format: `SAL-YYYY-NNNN`)
- **clientId**: Reference to the client (required)
- **warehouseId**: Warehouse from which stock will be deducted (required)
- **voucherId**: Link to accounting voucher (created when sale is completed)
- **date**: Sale date
- **status**: Current sale status (`DRAFT`, `COMPLETED`, `CANCELLED`)
- **notes**: Optional notes about the sale
- **attachmentUrl**: Optional URL to sale documents/attachments
- **subTotal**: Sum of all item amounts
- **discount**: Optional discount amount (max 999.99)
- **tax**: Optional tax amount (max 999.99, typically 15% VAT)
- **grandTotal**: Final total (subTotal - discount + tax)
- **completedAt**: Timestamp when sale was completed
- **isTrash**: Soft delete flag
- **createdBy**: User ID who created the sale
- **updatedBy**: User ID who last updated the sale

#### SaleItem Fields
- **itemId**: Required reference to Item master (must be READY_PRODUCT or RETAIL)
- **description**: Item description (required)
- **quantity**: Quantity sold
- **unitPrice**: Price per unit (typically from item's salesPrice)
- **amount**: Total amount (quantity × unitPrice)

### Relationships
- **Sale → Client**: Many-to-one relationship (Required, Restrict on delete)
- **Sale → Warehouse**: Many-to-one relationship (Required, Restrict on delete)
- **Sale → Voucher**: Many-to-one relationship (Optional, SetNull on delete)
- **Sale → User (CreatedBy)**: Many-to-one relationship (Cascade on delete)
- **Sale → User (UpdatedBy)**: Many-to-one relationship (SetNull on delete)
- **Sale → SaleItem**: One-to-many relationship (Cascade on delete)
- **SaleItem → Item**: Many-to-one relationship (Required, Restrict on delete)

---

## Server Actions API

### Location
`app/(dashboard)/dashboard/sales/_actions/sale.action.tsx`

### Available Functions

#### 1. `getClientsForSale()`

Fetches all active clients for sale form dropdown.

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  clients: Array<{
    id: string;
    name: string | null;
    email: string;
    company: string | null;
  }>;
}
```

**Usage:**
```typescript
const result = await getClientsForSale();
if (result.success) {
  // Use result.clients
}
```

**Permissions**: Requires authentication

---

#### 2. `getItemsForSale()`

Fetches all active READY_PRODUCT and RETAIL items with salesPrice for sale form dropdown.

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  items: Array<{
    id: string;
    code: string;
    description: string;
    unitPrice: number; // Mapped from salesPrice
  }>;
}
```

**Usage:**
```typescript
const result = await getItemsForSale();
if (result.success) {
  // Use result.items (only READY_PRODUCT and RETAIL items)
}
```

**Filters:**
- Only items with `itemType = READY_PRODUCT` or `RETAIL`
- Only items with `salesPrice` not null
- Only active, non-trashed items

**Permissions**: Requires authentication

---

#### 3. `getWarehousesForSale()`

Fetches all active warehouses for sale form dropdown.

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  warehouses: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}
```

**Usage:**
```typescript
const result = await getWarehousesForSale();
if (result.success) {
  // Use result.warehouses
}
```

**Permissions**: Requires authentication

---

#### 4. `generateSaleNumber(tx?: Prisma.TransactionClient)`

Generates a unique sale number in the format `SAL-YYYY-NNNN`.

**Parameters:**
- `tx` (optional): Prisma transaction client for use within transactions

**Returns:**
```typescript
Promise<string> // e.g., "SAL-2026-0001"
```

**Usage:**
```typescript
const saleNumber = await generateSaleNumber();
```

**Logic:**
- Format: `SAL-{YEAR}-{SEQUENCE}`
- Sequence starts at 0001 for each year
- Automatically increments if number exists

---

#### 5. `getSales(page, limit, search, status)`

Fetches paginated list of sales with search and filter.

**Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Items per page
- `search` (string, default: ""): Search term (searches saleNumber, client name/email)
- `status` ("all" | "trash", default: "all"): Filter by status

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  sales: Array<{
    id: string;
    saleNumber: string;
    date: Date;
    status: SaleStatus;
    grandTotal: number;
    isTrash: boolean;
    client: {
      id: string;
      name: string | null;
      email: string;
    };
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Usage:**
```typescript
const result = await getSales(1, 10, "search-term", "all");
if (result.success) {
  // Use result.sales and result.pagination
}
```

**Permissions**: Requires authentication

---

#### 6. `getSaleById(saleId)`

Fetches a single sale with all related data.

**Parameters:**
- `saleId` (string): Sale ID

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  sale: {
    id: string;
    saleNumber: string;
    date: Date;
    status: SaleStatus;
    notes: string | null;
    attachmentUrl: string | null;
    subTotal: number;
    discount: number | null;
    tax: number | null;
    grandTotal: number;
    isTrash: boolean;
    client: {
      id: string;
      name: string | null;
      email: string;
      company: string | null;
      phone: string | null;
    };
    warehouse: {
      id: string;
      name: string;
      code: string;
    };
    createdByUser: {
      id: string;
      name: string | null;
      email: string;
    };
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    items: Array<{
      id: string;
      itemId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      item: {
        id: string;
        code: string;
        name: string;
        unit: {
          symbol: string;
        };
      };
    }>;
  } | null;
}
```

**Usage:**
```typescript
const result = await getSaleById("sale-id");
if (result.success && result.sale) {
  // Use result.sale
}
```

**Permissions**: Requires authentication

---

#### 7. `createSale(input)`

Creates a new sale order.

**Parameters:**
```typescript
{
  clientId: string;
  warehouseId: string;
  date: Date;
  status: SaleStatus;
  notes?: string | null;
  attachmentUrl?: string | null;
  discount?: number | null;
  tax?: number | null;
  items: Array<{
    itemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}
```

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  sale: {
    id: string;
    saleNumber: string;
    grandTotal: number;
    createdAt: Date;
  } | null;
}
```

**Usage:**
```typescript
const result = await createSale({
  clientId: "client-id",
  warehouseId: "warehouse-id",
  date: new Date(),
  status: "DRAFT",
  items: [
    {
      itemId: "item-id",
      description: "Item description",
      quantity: 2,
      unitPrice: 100,
      amount: 200,
    },
  ],
});
```

**Business Logic:**
- Auto-generates sale number
- Calculates subtotal from items
- Calculates grand total (subTotal - discount + tax)
- Creates sale with DRAFT status by default
- Logs user activity
- Revalidates sales pages

**Permissions**: Requires authentication

---

#### 8. `updateSale(input)`

Updates an existing sale (only DRAFT sales can be edited).

**Parameters:**
```typescript
{
  id: string;
  clientId: string;
  warehouseId: string;
  date: Date;
  status: SaleStatus;
  notes?: string | null;
  attachmentUrl?: string | null;
  discount?: number | null;
  tax?: number | null;
  items: Array<{
    itemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}
```

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  sale: {
    id: string;
    saleNumber: string;
    grandTotal: number;
    updatedAt: Date;
  } | null;
}
```

**Usage:**
```typescript
const result = await updateSale({
  id: "sale-id",
  clientId: "client-id",
  warehouseId: "warehouse-id",
  date: new Date(),
  status: "DRAFT",
  items: [...],
});
```

**Business Logic:**
- Only allows editing DRAFT sales
- Deletes existing items and recreates them
- Recalculates totals
- Logs user activity
- Revalidates sales pages

**Permissions**: Requires authentication

---

#### 9. `deleteSale(saleId)`

Moves a sale to trash (only DRAFT sales can be deleted).

**Parameters:**
- `saleId` (string): Sale ID

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Usage:**
```typescript
const result = await deleteSale("sale-id");
```

**Business Logic:**
- Only allows deleting DRAFT sales
- Sets `isTrash = true` (soft delete)
- Logs user activity
- Revalidates sales pages

**Permissions**: Requires authentication

---

#### 10. `deleteSalesPermanently(saleIds)`

Permanently deletes sales from trash (only DRAFT sales).

**Parameters:**
- `saleIds` (string[]): Array of sale IDs

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Usage:**
```typescript
const result = await deleteSalesPermanently(["sale-id-1", "sale-id-2"]);
```

**Business Logic:**
- Only deletes DRAFT sales from trash
- Permanently removes from database
- Logs user activity for each deleted sale
- Revalidates sales pages

**Permissions**: Requires authentication

---

#### 11. `completeSale(saleId)`

Completes a sale: deducts stock, creates accounting entries, and updates status.

**Parameters:**
- `saleId` (string): Sale ID

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  sale: {
    id: string;
    saleNumber: string;
    status: SaleStatus;
    completedAt: Date;
    voucherId: string;
  } | null;
}
```

**Usage:**
```typescript
const result = await completeSale("sale-id");
if (result.success) {
  // Sale completed, stock deducted, accounting entries created
}
```

**Business Logic:**
1. **Validates Sale Status**: Only DRAFT sales can be completed
2. **Validates Stock Availability**: Checks if sufficient stock exists for all items
3. **Deducts Stock**: Calls `updateStockOnSale()` to reduce inventory
4. **Creates Accounting Voucher**:
   - Debit: Accounts Receivable (client-specific)
   - Credit: Sales Revenue
   - For READY_PRODUCT items:
     - Debit: COGS (Cost of Goods Sold)
     - Credit: Ready Products Inventory
5. **Posts Voucher**: Automatically posts the voucher to accounting
6. **Updates Sale Status**: Sets status to COMPLETED and records completedAt
7. **Links Voucher**: Links the voucher to the sale
8. **Logs Activity**: Records completion in user activity log

**Stock Validation:**
- Checks available quantity (quantity - reservedQuantity) for each item
- Validates against required quantity
- Returns error if insufficient stock

**Accounting Entries:**
- Uses `findControlAccount()` to locate control accounts
- Creates SALES type voucher
- Automatically posts voucher
- Links voucher to sale via `voucherId`

**Permissions**: Requires authentication

---

#### 12. `cancelSale(saleId)`

Cancels a sale (only DRAFT sales can be cancelled).

**Parameters:**
- `saleId` (string): Sale ID

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  sale: {
    id: string;
    saleNumber: string;
    status: SaleStatus;
    updatedAt: Date;
  } | null;
}
```

**Usage:**
```typescript
const result = await cancelSale("sale-id");
```

**Business Logic:**
- Only allows cancelling DRAFT sales
- Sets status to CANCELLED
- Does NOT deduct stock or create accounting entries
- Logs user activity
- Revalidates sales pages

**Permissions**: Requires authentication

---

## UI Components

### Location
`app/(dashboard)/dashboard/sales/`

### Pages

#### 1. Sales List Page
**Path**: `/dashboard/sales/page.tsx`

**Features:**
- Paginated sales list
- Search by sale number or client name/email
- Filter by status (All / Trash)
- Permission-based actions
- Bulk actions (delete permanently from trash)

**Components Used:**
- `SalesListClient` - Client-side list component

---

#### 2. Add Sale Page
**Path**: `/dashboard/sales/add/page.tsx`

**Features:**
- Creates new sale orders
- Uses `SaleForm` component
- Pre-fetches clients, items, and warehouses

---

#### 3. Edit Sale Page
**Path**: `/dashboard/sales/[id]/edit/page.tsx`

**Features:**
- Edits existing DRAFT sales only
- Uses `SaleForm` component
- Redirects to 404 if sale is not DRAFT

---

#### 4. View Sale Page
**Path**: `/dashboard/sales/[id]/view/page.tsx`

**Features:**
- Displays comprehensive sale details
- Shows client information
- Shows warehouse information
- Displays all sale items with item details
- Financial summary (subtotal, discount, tax, grand total)
- Status timeline
- Audit information (created by, dates)
- Action buttons (Edit for DRAFT, Back)

---

#### 5. POS Page (Placeholder)
**Path**: `/dashboard/sales/pos/page.tsx`

**Features:**
- Placeholder for Point of Sale interface
- Future implementation for quick sales

---

### Components

#### 1. `SalesListClient`
**Path**: `app/(dashboard)/dashboard/sales/_components/sales.tsx`

**Props:**
```typescript
{
  initialSales: Sale[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
  userId?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
    moveToTrash: boolean;
    deletePermanently: boolean;
  };
}
```

**Features:**
- Search functionality with debouncing
- Table display with status badges
- Row selection for bulk actions
- Action buttons (View, Edit, Delete)
- Pagination controls
- Permission-based UI visibility

---

#### 2. `SaleForm`
**Path**: `app/(dashboard)/dashboard/sales/_components/saleForm.tsx`

**Props:**
```typescript
{
  mode: "create" | "edit";
  clients: Array<{
    id: string;
    name: string | null;
    email: string;
    company: string | null;
  }>;
  items: Array<{
    id: string;
    code: string;
    description: string;
    unitPrice: number;
  }>;
  warehouses: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  initialData?: {
    id: string;
    client: { id: string };
    warehouse: { id: string };
    saleNumber: string;
    date: Date;
    status: SaleStatus;
    notes: string | null;
    attachmentUrl: string | null;
    discount: number | null;
    tax: number | null;
    items: Array<{
      id: string;
      itemId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  };
}
```

**Features:**
- Client selection with "Add Client" button
- Warehouse selection
- Date picker (current date for create, sale date for edit)
- Status selection (DRAFT, COMPLETED, CANCELLED)
- Dynamic item management:
  - Add/remove items
  - Item selection (FG and RETAIL only)
  - Auto-fill description and unit price
  - Auto-calculate amounts
  - Real-time subtotal calculation
- Tax calculation:
  - Manual tax input
  - "Auto 15%" toggle button for automatic VAT calculation
  - Tax updates automatically when subtotal changes (if auto enabled)
- Financial summary display
- Form validation with Zod
- Error handling and toast notifications

**Client Creation Dialog:**
- Opens from "Add Client" button next to client select
- Inline client creation form
- Automatically selects newly created client
- Adds client to local state without page refresh

---

## Permissions

### Permission Key
`sales.sales`

### Available Operations
- **view**: View sales list and details
- **create**: Create new sales
- **edit**: Edit DRAFT sales
- **approve**: Complete sales (change status to COMPLETED)
- **move-to-trash**: Move sales to trash
- **delete-permanently**: Permanently delete sales from trash

### Registration
Permissions are registered in `prisma/seed.ts`:

```typescript
const saleOperations = [
  { operation: "view", label: "View Sales" },
  { operation: "create", label: "Create Sale" },
  { operation: "edit", label: "Edit Sale" },
  { operation: "approve", label: "Complete Sale" },
  { operation: "move-to-trash", label: "Move Sale to Trash" },
  { operation: "delete-permanently", label: "Delete Sale Permanently" },
];
```

### Navigation
Sales module is added to `lib/navigation-builder.ts`:

```typescript
{
  label: "Sales",
  icon: "FiDollarSign",
  module: "sales",
  subMenu: [
    { href: "/dashboard/sales", label: "Sales", icon: "FiDollarSign", module: "sales" },
    { href: "/dashboard/sales/pos", label: "POS", icon: "FiShoppingBag", module: "sales" },
  ],
}
```

---

## Integration Points

### 1. Inventory Integration

#### Function: `updateStockOnSale()`
**Location**: `app/(dashboard)/dashboard/inventory/stock/_actions/stock.action.tsx`

**Trigger**: Called from `completeSale()` action

**Process:**
1. Validates item tracking (only items with `trackInventory = true`)
2. Decrements stock quantity in specified warehouse
3. Creates StockLedger entry with:
   - `transactionType = OUT`
   - `referenceType = "SALE"`
   - `referenceId = saleId`
   - Negative quantity for OUT transactions

**Usage:**
```typescript
await updateStockOnSale(saleId, warehouseId, [
  { itemId: "item-1", quantity: 2 },
  { itemId: "item-2", quantity: 5 },
]);
```

---

### 2. Accounting Integration

#### Functions: `createVoucher()`, `postVoucher()`
**Location**: `app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action.tsx`

**Trigger**: Called from `completeSale()` action

**Process:**
1. Finds control accounts:
   - Accounts Receivable (AR)
   - Sales Revenue
   - Cost of Goods Sold (COGS)
   - Ready Products Inventory
2. Creates SALES type voucher with lines:
   - **Debit**: Accounts Receivable (client-specific) = grandTotal
   - **Credit**: Sales Revenue = grandTotal
   - **For READY_PRODUCT items**:
     - **Debit**: COGS = quantity × costPrice
     - **Credit**: Ready Products Inventory = quantity × costPrice
3. Posts voucher automatically
4. Links voucher to sale via `voucherId`

**Voucher Structure:**
```typescript
{
  type: "SALES",
  date: sale.date,
  reference: sale.saleNumber,
  description: `Sale ${sale.saleNumber} - ${client.name}`,
  clientId: sale.clientId,
  lines: [
    {
      chartOfAccountId: arAccountId,
      debitAmount: grandTotal,
      creditAmount: 0,
      clientId: sale.clientId,
    },
    {
      chartOfAccountId: salesRevenueAccountId,
      debitAmount: 0,
      creditAmount: grandTotal,
    },
    // COGS lines for READY_PRODUCT items
    {
      chartOfAccountId: cogsAccountId,
      debitAmount: itemCOGS,
      creditAmount: 0,
    },
    {
      chartOfAccountId: fgInventoryAccountId,
      debitAmount: 0,
      creditAmount: itemCOGS,
    },
  ],
}
```

---

### 3. Stock Validation

Before completing a sale, the system validates stock availability:

```typescript
// For each item in sale
const stock = await prisma.stock.findUnique({
  where: {
    itemId_warehouseId: {
      itemId: item.itemId,
      warehouseId: sale.warehouseId,
    },
  },
});

const availableQuantity = stock
  ? Number(stock.quantity) - Number(stock.reservedQuantity)
  : 0;

if (availableQuantity < requiredQuantity) {
  return { error: "Insufficient stock" };
}
```

---

## Business Logic

### Sale Number Generation

**Format**: `SAL-YYYY-NNNN`

**Example**: `SAL-2026-0001`

**Logic:**
- Year: Current year (4 digits)
- Sequence: 4-digit zero-padded number starting from 0001
- Resets sequence each year
- Auto-increments if number exists

**Implementation:**
```typescript
async function generateSaleNumber(tx?: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const client = tx || prisma;
  
  // Find last sale number for current year
  const lastSale = await client.sale.findFirst({
    where: {
      saleNumber: {
        startsWith: `SAL-${year}-`,
      },
    },
    orderBy: {
      saleNumber: "desc",
    },
  });

  let sequence = 1;
  if (lastSale) {
    const parts = lastSale.saleNumber.split("-");
    const lastSequence = parseInt(parts[2] || "0", 10);
    sequence = lastSequence + 1;
  }

  return `SAL-${year}-${sequence.toString().padStart(4, "0")}`;
}
```

---

### Status Workflow

**DRAFT** → **COMPLETED** → (Final)
**DRAFT** → **CANCELLED** → (Final)

**Rules:**
- **DRAFT**: Can be edited, deleted, completed, or cancelled
- **COMPLETED**: Cannot be edited or deleted. Stock is deducted, accounting entries created
- **CANCELLED**: Cannot be edited or deleted. No stock/accounting changes

**Status Transitions:**
- `createSale()` → Creates with DRAFT status
- `updateSale()` → Only works on DRAFT sales
- `completeSale()` → Changes DRAFT to COMPLETED
- `cancelSale()` → Changes DRAFT to CANCELLED
- `deleteSale()` → Only works on DRAFT sales

---

### Financial Calculations

**Subtotal**: Sum of all item amounts
```typescript
subTotal = items.reduce((sum, item) => sum + item.amount, 0);
```

**Grand Total**: Subtotal - Discount + Tax
```typescript
grandTotal = subTotal - (discount || 0) + (tax || 0);
```

**Item Amount**: Quantity × Unit Price
```typescript
amount = quantity * unitPrice;
```

**Tax Calculation**:
- Manual: User enters tax amount
- Automatic: 15% VAT on subtotal (toggle button)
- Formula: `tax = subTotal × 0.15` (when auto enabled)

---

### Inventory Update Rules

1. **Only on Completion**: Stock is deducted only when sale status is changed to COMPLETED
2. **Item Filtering**: Only items with `trackInventory = true` are updated
3. **Warehouse Assignment**: Uses `warehouseId` from sale
4. **Stock Validation**: Validates stock availability before completion
5. **Stock Ledger**: Creates ledger entries with `transactionType = OUT`
6. **Transaction Safety**: All updates happen in a database transaction

---

### Accounting Entry Rules

1. **Voucher Creation**: Only when sale is completed
2. **Entry Structure**:
   - **Debit**: Accounts Receivable (client-specific) = grandTotal
   - **Credit**: Sales Revenue = grandTotal
   - **For READY_PRODUCT items**:
     - **Debit**: COGS = quantity × costPrice
     - **Credit**: Ready Products Inventory = quantity × costPrice
3. **COGS Calculation**: Only for READY_PRODUCT items, uses item's `costPrice`
4. **Voucher Posting**: Automatically posted to accounting
5. **Voucher Linking**: Voucher is linked to sale via `voucherId`

---

## Testing

### Manual Testing Checklist

#### Create Sale
- [ ] Can create sale with client
- [ ] Can add multiple items (FG and RETAIL only)
- [ ] Sale number is auto-generated
- [ ] Totals are calculated correctly
- [ ] Tax auto-calculation works (15% toggle)
- [ ] Validation works (required fields, positive numbers)
- [ ] Can save as DRAFT
- [ ] Can create new client from dialog
- [ ] New client is automatically selected after creation

#### Edit Sale
- [ ] Can edit DRAFT sales
- [ ] Cannot edit COMPLETED sales
- [ ] Cannot edit CANCELLED sales
- [ ] Items can be added/removed
- [ ] Totals recalculate correctly
- [ ] Date defaults to sale date (not current date)

#### Complete Sale
- [ ] Status can be changed to COMPLETED
- [ ] Stock validation works (insufficient stock error)
- [ ] Stock is deducted correctly
- [ ] Stock ledger entries are created
- [ ] Accounting voucher is created
- [ ] Voucher is posted automatically
- [ ] COGS entries are created for FG items
- [ ] AR entry is created with client link

#### Cancel Sale
- [ ] Can cancel DRAFT sales
- [ ] Cannot cancel COMPLETED sales
- [ ] Status changes to CANCELLED
- [ ] No stock or accounting changes

#### Delete Sale
- [ ] Can move DRAFT sales to trash
- [ ] Cannot delete COMPLETED sales
- [ ] Can restore from trash
- [ ] Can permanently delete DRAFT sales from trash

---

## Troubleshooting

### Common Issues

#### 1. "Insufficient stock" error when completing sale

**Cause**: Not enough stock available in the warehouse

**Solution**:
- Check stock levels in the warehouse
- Verify warehouse assignment is correct
- Check if items have `trackInventory = true`
- Reduce quantity or add stock via inventory module

---

#### 2. "Required control accounts not found" error

**Cause**: Missing Chart of Accounts setup

**Solution**:
- Ensure "Accounts Receivable" account exists
- Ensure "Sales Revenue" account exists
- Ensure "Cost of Goods Sold" account exists (for FG items)
- Ensure "Ready Products Inventory" account exists (for FG items)
- Run chart of accounts seed if needed

---

#### 3. Sale number generation fails

**Cause**: Duplicate sale number or database issue

**Solution**:
- Check for duplicate sale numbers in database
- Verify sale number generation logic
- Check database constraints

---

#### 4. Client not appearing in dropdown after creation

**Cause**: State update timing issue

**Solution**:
- Client should be automatically added to list
- If not, refresh the page
- Check browser console for errors

---

#### 5. Tax calculation not updating

**Cause**: Auto tax toggle not working

**Solution**:
- Click "Auto 15%" button to enable
- Tax should update when subtotal changes
- If not, manually enter tax amount

---

#### 6. Items not showing in sale form

**Cause**: Items don't meet criteria

**Solution**:
- Verify items are READY_PRODUCT or RETAIL type
- Verify items have `salesPrice` set
- Verify items are active and not trashed

---

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Only DRAFT sales can be edited" | Trying to edit COMPLETED/CANCELLED sale | Use view page instead |
| "Insufficient stock for {item}" | Not enough stock available | Add stock or reduce quantity |
| "Required control accounts not found" | Missing COA setup | Create missing accounts |
| "Client with this email already exists" | Duplicate email | Use existing client or different email |
| "Sale is already {status}" | Invalid status transition | Check current status |

---

## Related Modules

- **Inventory**: Stock deduction on sale completion
- **Accounting**: Voucher creation for financial transactions
- **Clients**: Client information and management
- **Warehouses**: Warehouse assignment and stock location
- **Items**: Item master data and sales prices (FG and RETAIL only)

---

## Future Enhancements

1. **POS Interface**: Quick sale interface with barcode scanning
2. **Payment Integration**: Record payments against sales
3. **Sales Returns**: Handle return transactions
4. **Sales Reports**: Revenue reports, top-selling items, client sales history
5. **Discount Rules**: Automatic discount calculation based on rules
6. **Price Lists**: Client-specific pricing
7. **Sales Quotations**: Convert quotations to sales
8. **Delivery Tracking**: Track delivery status for sales

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review server logs for error messages
3. Verify permissions and database constraints
4. Check integration module configurations
5. Review accounting setup (control accounts)
