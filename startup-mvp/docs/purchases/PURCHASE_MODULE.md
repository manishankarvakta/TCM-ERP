# Purchase Module - Development Documentation

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

The Purchase module manages purchase orders from suppliers. It integrates with the Inventory module to update stock when purchases are received, and with the Accounting module to create vouchers for financial transactions.

### Key Features
- **Purchase Order Management**: Create, view, edit, and track purchase orders
- **Supplier Integration**: Link purchases to suppliers with full supplier information
- **Warehouse Assignment**: Assign purchases to specific warehouses
- **Status Management**: Track purchases through DRAFT → APPROVED → PARTIALLY_RECEIVED → RECEIVED workflow
- **Auto-Generated Codes**: Purchase numbers are automatically generated (e.g., `PUR1000001`)
- **Inventory Integration**: Automatically updates stock when purchase is received
- **Accounting Integration**: Creates accounting vouchers when purchase is received
- **Item-Type Based Accounting**: Different accounting entries for RAW_MATERIAL, READY_PRODUCT, and RETAIL items
- **Stock Ledger Integration**: Creates ledger entries for all stock movements
- **Audit Trail**: Complete user activity logging and notifications
- **Soft Delete**: Trash system for safe deletion

### Module Location
- **Path**: `/dashboard/procurements/purchases`
- **Permission Key**: `purchases.purchases`
- **Module Type**: Procurement Management

---

## Database Schema

### PurchaseStatus Enum

```prisma
enum PurchaseStatus {
  DRAFT
  APPROVED
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}
```

### Purchase Model

```prisma
model Purchase {
  id             String         @id @default(cuid())
  purchaseNumber String         @unique
  supplierId     String
  warehouseId    String?        // Warehouse for all items in purchase
  voucherId      String?        // Link to accounting voucher
  date           DateTime       @default(now())
  status         PurchaseStatus @default(DRAFT)
  notes          String?
  attachmentUrl  String?
  subTotal       Decimal        @db.Decimal(12, 2)
  discount       Decimal?       @db.Decimal(5, 2)
  tax            Decimal?       @db.Decimal(5, 2)
  grandTotal     Decimal        @db.Decimal(12, 2)
  isTrash        Boolean        @default(false)
  createdBy      String
  updatedBy      String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  supplier      Supplier       @relation(fields: [supplierId], references: [id])
  warehouse     Warehouse?     @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  voucher       Voucher?       @relation(fields: [voucherId], references: [id], onDelete: SetNull)
  createdByUser User           @relation("PurchaseCreatedBy", fields: [createdBy], references: [id], onDelete: Cascade)
  updatedByUser User?          @relation("PurchaseUpdatedBy", fields: [updatedBy], references: [id], onDelete: SetNull)
  items         PurchaseItem[]

  @@index([supplierId])
  @@index([warehouseId])
  @@index([voucherId])
  @@index([status])
  @@index([date])
  @@index([isTrash])
  @@index([purchaseNumber])
}
```

### PurchaseItem Model

```prisma
model PurchaseItem {
  id          String   @id @default(cuid())
  purchaseId  String
  itemId      String?  // Optional link to Item master
  description String
  quantity    Decimal  @db.Decimal(10, 2)
  unitPrice   Decimal  @db.Decimal(10, 2)
  amount      Decimal  @db.Decimal(12, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  purchase Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  item     Item?    @relation(fields: [itemId], references: [id], onDelete: SetNull)

  @@index([purchaseId])
  @@index([itemId])
}
```

### Field Descriptions

#### Purchase Fields
- **purchaseNumber**: Auto-generated unique identifier (format: `PURNNNNNNN`)
- **supplierId**: Reference to the supplier
- **warehouseId**: Optional warehouse where items will be received
- **voucherId**: Link to accounting voucher (created when purchase is received)
- **date**: Purchase order date
- **status**: Current purchase status (`DRAFT`, `APPROVED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`)
- **notes**: Optional notes about the purchase
- **attachmentUrl**: Optional URL to purchase documents/attachments
- **subTotal**: Sum of all item amounts
- **discount**: Optional discount amount (max 999.99)
- **tax**: Optional tax amount (max 999.99)
- **grandTotal**: Final total (subTotal - discount + tax)
- **isTrash**: Soft delete flag
- **createdBy**: User ID who created the purchase
- **updatedBy**: User ID who last updated the purchase

#### PurchaseItem Fields
- **itemId**: Optional reference to Item master (can be null for non-catalog items)
- **description**: Item description (required)
- **quantity**: Quantity purchased
- **unitPrice**: Price per unit
- **amount**: Total amount (quantity × unitPrice)

### Relationships
- **Purchase → Supplier**: Many-to-one relationship (Required)
- **Purchase → Warehouse**: Many-to-one relationship (Optional, SetNull on delete)
- **Purchase → Voucher**: Many-to-one relationship (Optional, SetNull on delete)
- **Purchase → User (CreatedBy)**: Many-to-one relationship (Cascade on delete)
- **Purchase → User (UpdatedBy)**: Many-to-one relationship (SetNull on delete)
- **Purchase → PurchaseItem**: One-to-many relationship (Cascade on delete)
- **PurchaseItem → Item**: Many-to-one relationship (Optional, SetNull on delete)

---

## Server Actions API

### Location
`app/(dashboard)/dashboard/purchases/_actions/purchase.action.tsx`

### Available Functions

#### 1. `getSuppliersForPurchase()`

Fetches all active suppliers for purchase form dropdown.

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  suppliers: Array<{
    id: string;
    name: string | null;
    email: string;
    company: string | null;
  }>;
}
```

**Usage:**
```typescript
const result = await getSuppliersForPurchase();
if (result.success) {
  // Use result.suppliers
}
```

**Permissions**: Requires authentication

---

#### 2. `getItemsForPurchase()`

Fetches all active items for purchase form dropdown.

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  items: Array<{
    id: string;
    code: string;
    description: string;
    unitPrice: number;
  }>;
}
```

**Usage:**
```typescript
const result = await getItemsForPurchase();
if (result.success) {
  // Use result.items
}
```

**Permissions**: Requires authentication

---

#### 3. `getPurchases(page, limit, search, status)`

Fetches paginated list of purchases with search and filtering.

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search string (searches purchase number, supplier name/email)
- `status`: "trash" | "all" (default: "all")

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  purchases: Array<Purchase>;
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
const result = await getPurchases(1, 10, "PUR", "all");
if (result.success) {
  // Use result.purchases and result.pagination
}
```

**Permissions**: Requires authentication

---

#### 4. `getPurchaseById(purchaseId)`

Fetches a single purchase by ID with all related data.

**Parameters:**
- `purchaseId`: Purchase ID

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  purchase: {
    id: string;
    purchaseNumber: string;
    date: Date;
    status: PurchaseStatus;
    notes: string | null;
    attachmentUrl: string | null;
    subTotal: number;
    discount: number | null;
    tax: number | null;
    grandTotal: number;
    supplier: {
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
    } | null;
    items: Array<{
      id: string;
      itemId: string | null;
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
      } | null;
    }>;
    createdByUser: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}
```

**Usage:**
```typescript
const result = await getPurchaseById(purchaseId);
if (result.success && result.purchase) {
  // Use result.purchase
}
```

**Permissions**: Requires authentication

---

#### 5. `createPurchase(input)`

Creates a new purchase order.

**Parameters:**
```typescript
{
  supplierId: string;
  warehouseId?: string | null;
  date: Date;
  status: PurchaseStatus;
  notes?: string | null;
  attachmentUrl?: string | null;
  discount?: number | null;
  tax?: number | null;
  items: Array<{
    itemId?: string | null;
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
  purchase: {
    id: string;
    purchaseNumber: string;
    grandTotal: number;
    createdAt: Date;
  } | null;
}
```

**Validations:**
- Supplier is required
- At least one item is required
- All items must have description, quantity > 0, unitPrice >= 0
- Discount and tax must be >= 0

**Process:**
1. Validates user session
2. Generates unique purchase number
3. Calculates subtotal, discount, tax, and grand total
4. Creates purchase and purchase items in a transaction
5. Logs user activity
6. Revalidates paths

**Usage:**
```typescript
const result = await createPurchase({
  supplierId: "supplier-id",
  warehouseId: "warehouse-id",
  date: new Date(),
  status: "DRAFT",
  items: [
    {
      itemId: "item-id",
      description: "Item description",
      quantity: 10,
      unitPrice: 100,
      amount: 1000,
    },
  ],
});
```

**Permissions**: Requires authentication

---

#### 6. `updatePurchase(input)`

Updates an existing purchase order.

**Parameters:**
```typescript
{
  id: string;
  supplierId: string;
  warehouseId?: string | null;
  date: Date;
  status: PurchaseStatus;
  notes?: string | null;
  attachmentUrl?: string | null;
  discount?: number | null;
  tax?: number | null;
  items: Array<{
    itemId?: string | null;
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
  purchase: {
    id: string;
    purchaseNumber: string;
    grandTotal: number;
    updatedAt: Date;
  } | null;
}
```

**Validations:**
- Purchase must exist
- Purchase must not be in trash
- Same validations as createPurchase

**Process:**
1. Validates user session
2. Checks purchase exists and is not in trash
3. Deletes existing purchase items
4. Recalculates totals
5. Updates purchase and creates new items in a transaction
6. Logs user activity
7. Revalidates paths

**Usage:**
```typescript
const result = await updatePurchase({
  id: purchaseId,
  supplierId: "supplier-id",
  // ... other fields
});
```

**Permissions**: Requires authentication

---

#### 7. `deletePurchase(purchaseId)`

Moves a purchase to trash (soft delete).

**Parameters:**
- `purchaseId`: Purchase ID

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Validations:**
- Purchase must exist
- Purchase must not already be in trash

**Process:**
1. Validates user session
2. Checks purchase exists and is not in trash
3. Sets `isTrash = true`
4. Logs user activity
5. Revalidates paths

**Usage:**
```typescript
const result = await deletePurchase(purchaseId);
if (result.success) {
  // Purchase moved to trash
}
```

**Permissions**: Requires authentication

---

#### 8. `bulkUpdatePurchaseStatus(purchaseIds, status)`

Updates status for multiple purchases (for bulk operations).

**Parameters:**
- `purchaseIds`: Array of purchase IDs
- `status`: New PurchaseStatus

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  updated: number;
}
```

**Usage:**
```typescript
const result = await bulkUpdatePurchaseStatus(
  ["id1", "id2"],
  "APPROVED"
);
```

**Permissions**: Requires authentication

---

#### 9. `deletePurchasesPermanently(purchaseIds)`

Permanently deletes purchases from the database.

**Parameters:**
- `purchaseIds`: Array of purchase IDs

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  deleted: number;
}
```

**Validations:**
- Purchases must exist
- Purchases must be in trash

**Process:**
1. Validates user session
2. Checks all purchases exist and are in trash
3. Deletes purchases and related items permanently
4. Logs user activity
5. Revalidates paths

**Usage:**
```typescript
const result = await deletePurchasesPermanently(["id1", "id2"]);
if (result.success) {
  // Purchases permanently deleted
}
```

**Permissions**: Requires authentication

---

## UI Components

### Pages

#### List Page: `/dashboard/procurements/purchases/page.tsx`
- Displays paginated list of purchases
- Search and filter functionality
- Individual actions (view, edit, delete)
- Permission-based action visibility
- Trash view support

**Features:**
- Search by purchase number, supplier name/email
- Filter by status
- Pagination controls
- Status badges with color coding
- Action buttons per purchase
- Bulk operations support

#### Add Page: `/dashboard/procurements/purchases/add/page.tsx`
- Form for creating new purchase order
- Uses `PurchaseForm` component
- Fetches suppliers and items for dropdowns

#### Edit Page: `/dashboard/procurements/purchases/[id]/edit/page.tsx`
- Form for editing existing purchase order
- Pre-populates with existing data
- Uses `PurchaseForm` component
- Fetches suppliers and items for dropdowns

#### View Page: `/dashboard/procurements/purchases/[id]/view/page.tsx`
- Read-only view of purchase order details
- Shows supplier information
- Displays purchase items with item details
- Shows financial summary
- Status timeline
- Audit information
- Action buttons (edit, back)

#### Detail Redirect: `/dashboard/procurements/purchases/[id]/page.tsx`
- Redirects to view page for backward compatibility

### Client Components

#### `PurchaseForm` (`_components/purchaseForm.tsx`)
Form component for creating/editing purchase orders.

**Features:**
- React Hook Form with Zod validation
- Supplier selection dropdown
- Warehouse selection dropdown
- Dynamic item list with add/remove
- Item selection with auto-fill of description and price
- Quantity, unit price, and amount calculations
- Discount and tax inputs
- Subtotal, tax, discount, and grand total calculations
- Status selection
- Notes field
- Attachment URL field
- Form validation
- Error handling

**Props:**
```typescript
{
  mode: "create" | "edit";
  suppliers: Array<Supplier>;
  items: Array<Item>;
  initialData?: Purchase;
}
```

#### `PurchasesListClient` (`_components/purchases.tsx`)
Client component for displaying purchase list with search, filters, and actions.

**Features:**
- Search input with debouncing
- Status filter
- Pagination
- Action buttons (view, edit, delete)
- Bulk selection
- Trash management
- Permission-based UI

---

## Permissions

### Permission Key
`purchases.purchases`

### Operations
- **view**: View purchase orders
- **create**: Create new purchase orders
- **edit**: Edit existing purchase orders
- **move-to-trash**: Move purchases to trash
- **delete-permanently**: Permanently delete purchases

### Registration
Permissions are registered in `prisma/seed.ts`:

```typescript
const purchaseOperations = [
  { operation: "view", label: "View Purchases" },
  { operation: "create", label: "Create Purchase" },
  { operation: "edit", label: "Edit Purchase" },
  { operation: "move-to-trash", label: "Delete Purchase" },
  { operation: "delete-permanently", label: "Permanently Delete Purchase" },
];
```

### Usage
```typescript
import { hasPermission } from "@/lib/permissions";

const canEdit = await hasPermission(userId, "purchases.purchases", "edit");
```

---

## Integration Points

### 1. Inventory Integration

When a purchase status changes to `RECEIVED` or `PARTIALLY_RECEIVED`, the system automatically:

1. **Updates Stock**: Calls `updateStockOnPurchase()` to update inventory
2. **Creates Stock Ledger Entries**: Records all stock movements
3. **Item-Type Aware**: Only updates stock for items with `trackInventory = true`

**Integration Function:**
```typescript
import { updateStockOnPurchase } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";

// Called automatically when purchase is received
await updateStockOnPurchase(purchaseId, warehouseId);
```

### 2. Accounting Integration

When a purchase is received, the system:

1. **Creates Accounting Voucher**: Creates a PURCHASE type voucher
2. **Item-Type Based Entries**:
   - **RAW_MATERIAL**: Debits Raw Material Inventory, Credits Accounts Payable
   - **READY_PRODUCT**: Debits Ready Products Inventory, Credits Accounts Payable
   - **RETAIL**: Debits Retail Inventory, Credits Accounts Payable
3. **Links Voucher**: Stores `voucherId` in Purchase record
4. **Posts Voucher**: Automatically posts the voucher to accounting

**Integration Functions:**
```typescript
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";

// Creates and posts voucher when purchase is received
const voucher = await createVoucher({...});
await postVoucher(voucher.id);
```

### 3. Supplier Integration

- Purchases are linked to suppliers
- Supplier information is displayed in purchase details
- Supplier selection in purchase form

### 4. Warehouse Integration

- Purchases can be assigned to warehouses
- Stock updates go to the assigned warehouse
- Warehouse information displayed in purchase details

### 5. Item Master Integration

- Purchase items can be linked to Item master
- Item details (code, name, unit) displayed in purchase items
- Cost price auto-filled from item master

---

## Business Logic

### Purchase Number Generation

Purchase numbers are auto-generated in format: `PURNNNNNNN`

**Algorithm:**
1. Find last purchase number starting with "PUR"
2. Extract numeric part
3. Increment by 1
4. Pad to 7 digits with leading zeros
5. Handle collisions (up to 10 attempts)

**Example:**
- First purchase: `PUR1000001`
- Second purchase: `PUR1000002`
- etc.

### Status Workflow

```
DRAFT → APPROVED → PARTIALLY_RECEIVED → RECEIVED
  ↓
CANCELLED
```

**Status Rules:**
- **DRAFT**: Can be edited, no inventory/accounting updates
- **APPROVED**: Can be edited, no inventory/accounting updates
- **PARTIALLY_RECEIVED**: Partial inventory update, partial accounting
- **RECEIVED**: Full inventory update, full accounting, cannot be edited
- **CANCELLED**: Cannot be edited, no inventory/accounting updates

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

### Inventory Update Rules

1. **Only on Receipt**: Stock is updated only when status is `RECEIVED` or `PARTIALLY_RECEIVED`
2. **Item Filtering**: Only items with `trackInventory = true` are updated
3. **Warehouse Assignment**: Uses `warehouseId` from purchase, or default warehouse
4. **Stock Ledger**: Creates ledger entries with `transactionType = IN`
5. **Transaction Safety**: All updates happen in a database transaction

### Accounting Entry Rules

1. **Voucher Creation**: Only when purchase is received
2. **Item-Type Based**:
   - RAW_MATERIAL → Raw Material Inventory (Debit), Accounts Payable (Credit)
   - READY_PRODUCT → Ready Products Inventory (Debit), Accounts Payable (Credit)
   - RETAIL → Retail Inventory (Debit), Accounts Payable (Credit)
3. **Partial Receipt**: Accounting entries are proportional to received quantity
4. **Voucher Posting**: Automatically posted to accounting

---

## Testing

### Manual Testing Checklist

#### Create Purchase
- [ ] Can create purchase with supplier
- [ ] Can add multiple items
- [ ] Purchase number is auto-generated
- [ ] Totals are calculated correctly
- [ ] Validation works (required fields, positive numbers)
- [ ] Can save as DRAFT

#### Edit Purchase
- [ ] Can edit DRAFT purchases
- [ ] Cannot edit RECEIVED purchases
- [ ] Items can be added/removed
- [ ] Totals recalculate correctly

#### Receive Purchase
- [ ] Status can be changed to RECEIVED
- [ ] Stock is updated correctly
- [ ] Stock ledger entries are created
- [ ] Accounting voucher is created
- [ ] Voucher is posted automatically

#### Delete Purchase
- [ ] Can move to trash
- [ ] Can restore from trash
- [ ] Can permanently delete from trash
- [ ] Related items are deleted

#### Search and Filter
- [ ] Search by purchase number works
- [ ] Search by supplier name works
- [ ] Filter by status works
- [ ] Pagination works

### Test Data

Use seed data from `prisma/seed.ts`:
- Suppliers: 5 biryani house suppliers
- Items: Raw materials, finished goods, retail items
- Warehouses: 5 warehouses
- Purchases: 8 sample purchases with various statuses

---

## Troubleshooting

### Common Issues

#### 1. Purchase Number Collision
**Error**: "Unable to generate unique purchase number"

**Solution**: The system tries up to 10 times. If it still fails, check for database constraints or manually verify purchase numbers.

#### 2. Stock Not Updating
**Error**: Stock doesn't update when purchase is received

**Possible Causes:**
- Purchase status is not RECEIVED or PARTIALLY_RECEIVED
- Items don't have `trackInventory = true`
- Warehouse is not assigned
- `updateStockOnPurchase` function failed

**Solution**: Check purchase status, item inventory tracking flag, and warehouse assignment.

#### 3. Accounting Voucher Not Created
**Error**: Voucher not created when purchase is received

**Possible Causes:**
- Accounting module not properly configured
- Chart of accounts missing required accounts
- `createVoucher` function failed

**Solution**: Verify accounting setup, check chart of accounts, review server logs.

#### 4. Decimal Serialization Error
**Error**: "A non-serializable value was detected"

**Solution**: All Decimal values are converted to numbers in server actions using `serializePurchase()` function.

#### 5. Permission Errors
**Error**: "Unauthorized" or permission denied

**Solution**: Verify user has required permissions for `purchases.purchases` module operations.

### Debug Tips

1. **Check Server Logs**: All errors are logged to console
2. **Verify Database**: Check Purchase and PurchaseItem records directly
3. **Test Permissions**: Use `hasPermission()` to verify user permissions
4. **Check Relations**: Verify Supplier, Warehouse, and Item records exist
5. **Transaction Rollback**: All operations use transactions, so partial updates are prevented

---

## Related Documentation

- [Inventory Module Documentation](../inventory/INVENTORY_MODULE.md)
- [Production Module Documentation](../production/PRODUCTION_MODULE.md)
- [BOM Module Documentation](../production/BOM_MODULE.md)
- [Accounts Module Documentation](../ACCOUNTS_MODULE_DOCUMENTATION.md)

---

## Changelog

### Version 1.0.0 (Current)
- Initial implementation
- Purchase order CRUD operations
- Inventory integration
- Accounting integration
- Status workflow
- Auto-generated purchase numbers
- Soft delete support
- Search and filtering
- Permission-based access control
