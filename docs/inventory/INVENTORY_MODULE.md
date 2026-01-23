# Inventory Module - Development Documentation

**Last Updated**: January 2026  
**Module Path**: `/dashboard/inventory/stock`  
**Permission Key**: `inventory.stock`

---

## 📋 Overview

The Inventory module provides comprehensive stock management capabilities, tracking inventory quantities per item and warehouse, maintaining a complete audit trail via StockLedger, and automatically updating stock when Purchase orders are received.

## 🎯 Features

- ✅ Real-time stock tracking per item and warehouse
- ✅ Automatic stock updates on Purchase receipt
- ✅ Manual stock adjustments with audit trail
- ✅ Reserved quantity tracking for production orders
- ✅ Complete transaction history (StockLedger)
- ✅ Stock reports and analytics
- ✅ Integration with Purchase, Production, and Sales modules
- ✅ Transaction-safe operations
- ✅ Activity logging and notifications
- ✅ Advanced filtering and search
- ✅ Pagination support

## 🗄️ Database Schema

### Stock Model

```prisma
model Stock {
  id              String   @id @default(cuid())
  itemId          String
  warehouseId     String
  quantity        Decimal  @db.Decimal(12, 2) @default(0)
  reservedQuantity Decimal @db.Decimal(12, 2) @default(0) // Reserved for production orders
  lastUpdated     DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  item            Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  warehouse       Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  @@unique([itemId, warehouseId])
  @@index([itemId])
  @@index([warehouseId])
  @@index([lastUpdated])
}
```

### StockLedger Model

```prisma
model StockLedger {
  id              String                @id @default(cuid())
  itemId          String
  warehouseId     String
  transactionType StockTransactionType
  quantity        Decimal               @db.Decimal(12, 2) // Positive for IN, negative for OUT
  referenceType   String?               // "PURCHASE", "PRODUCTION", "SALE", "ADJUSTMENT"
  referenceId     String?               // ID of related document (Purchase.id, ProductionOrder.id, etc.)
  notes           String?
  createdAt       DateTime              @default(now())
  createdBy       String
  
  item            Item                  @relation(fields: [itemId], references: [id], onDelete: Cascade)
  warehouse       Warehouse             @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  creator         User                  @relation("StockLedgerCreator", fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([itemId])
  @@index([warehouseId])
  @@index([transactionType])
  @@index([referenceType, referenceId])
  @@index([createdAt])
  @@index([createdBy])
}
```

### StockTransactionType Enum

```prisma
enum StockTransactionType {
  IN           // Stock received (Purchase, Production output)
  OUT          // Stock issued (Production input, Sales)
  ADJUSTMENT   // Manual adjustment (increase or decrease)
  PRODUCTION   // Production-related movement
}
```

## 📁 File Structure

```
app/(dashboard)/dashboard/inventory/stock/
├── page.tsx                          # Stock list page
├── adjust/
│   └── page.tsx                      # Stock adjustment page
├── ledger/
│   └── page.tsx                      # Stock ledger report page
├── _actions/
│   └── stock.action.tsx              # All stock server actions
└── _components/
    ├── stocks.tsx                     # Stock list component
    ├── stockLedger.tsx                # Ledger report component
    └── stockAdjustForm.tsx             # Adjustment form component
```

## 🔌 Server Actions

### Location
`app/(dashboard)/dashboard/inventory/stock/_actions/stock.action.tsx`

### Available Functions

#### 1. `updateStockOnPurchase(purchaseId: string, warehouseId?: string)`

Automatically updates stock when a Purchase order is received.

**Parameters:**
- `purchaseId`: Purchase order ID
- `warehouseId`: Optional warehouse ID (uses default if not provided)

**Returns:**
```typescript
{ success: boolean; error?: string }
```

**Usage:**
```typescript
// Called automatically when Purchase status = RECEIVED or PARTIALLY_RECEIVED
await updateStockOnPurchase(purchaseId, warehouseId);
```

**Behavior:**
- Only updates stock for items that have `trackInventory = true`
- Creates StockLedger entries with `transactionType = IN`
- Uses default warehouse if not specified
- Transaction-safe operation

#### 2. `updateStockOnProduction(productionOrderId: string, type: "OUT" | "IN", items: Array<{itemId, quantity, warehouseId}>)`

Updates stock for production-related movements (for future Production module integration).

**Parameters:**
- `productionOrderId`: Production order ID
- `type`: "OUT" for material issue, "IN" for finished goods receipt
- `items`: Array of items with quantities and warehouse IDs

**Returns:**
```typescript
{ success: boolean; error?: string }
```

#### 3. `updateStockOnSale(saleId: string, warehouseId: string, items: Array<{itemId, quantity}>)`

Updates stock when a sale is made (for future Sales module integration).

**Parameters:**
- `saleId`: Sale order ID
- `warehouseId`: Warehouse ID
- `items`: Array of items with quantities

**Returns:**
```typescript
{ success: boolean; error?: string }
```

#### 4. `adjustStock(input: { itemId, warehouseId, quantity, notes? })`

Manually adjusts stock quantity.

**Parameters:**
```typescript
{
  itemId: string;
  warehouseId: string;
  quantity: number; // Can be positive (increase) or negative (decrease)
  notes?: string;
}
```

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  stock?: Stock;
}
```

**Usage:**
```typescript
const result = await adjustStock({
  itemId: "item123",
  warehouseId: "warehouse456",
  quantity: 10, // Increase by 10
  notes: "Stock correction after physical count"
});

if (result.success) {
  console.log("Stock adjusted:", result.stock);
}
```

**Validation:**
- Requires `inventory.stock` permission with "adjust" operation
- Validates item exists and tracks inventory
- Validates warehouse exists
- Creates StockLedger entry with `transactionType = ADJUSTMENT`
- Logs activity and sends notification

#### 5. `getStock(itemId: string, warehouseId: string)`

Gets current stock for a specific item and warehouse.

**Parameters:**
- `itemId`: Item ID
- `warehouseId`: Warehouse ID

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  stock?: Stock & { item: Item; warehouse: Warehouse };
}
```

**Usage:**
```typescript
const result = await getStock(itemId, warehouseId);
if (result.success && result.stock) {
  console.log("Quantity:", result.stock.quantity);
  console.log("Reserved:", result.stock.reservedQuantity);
  console.log("Available:", Number(result.stock.quantity) - Number(result.stock.reservedQuantity));
}
```

#### 6. `getStocks(page: number, limit: number, filters: { itemId?, warehouseId?, search? })`

Gets paginated list of stocks with filters.

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `filters`: Optional filters
  - `itemId`: Filter by item
  - `warehouseId`: Filter by warehouse
  - `search`: Search by item name, code, or warehouse name

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  stocks?: Stock[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Usage:**
```typescript
const result = await getStocks(1, 10, {
  itemId: "item123",
  warehouseId: "warehouse456",
  search: "rice"
});
```

#### 7. `getStockLedger(page: number, limit: number, filters: { itemId?, warehouseId?, transactionType?, dateFrom?, dateTo? })`

Gets stock ledger entries with advanced filtering.

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `filters`: Optional filters
  - `itemId`: Filter by item
  - `warehouseId`: Filter by warehouse
  - `transactionType`: Filter by transaction type (IN, OUT, ADJUSTMENT, PRODUCTION)
  - `dateFrom`: Start date
  - `dateTo`: End date

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  entries?: StockLedgerEntry[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Usage:**
```typescript
const result = await getStockLedger(1, 20, {
  itemId: "item123",
  transactionType: StockTransactionType.IN,
  dateFrom: new Date("2026-01-01"),
  dateTo: new Date("2026-01-31")
});
```

#### 8. `getStockReport(itemId?: string, warehouseId?: string)`

Gets aggregate stock report.

**Parameters:**
- `itemId`: Optional item ID filter
- `warehouseId`: Optional warehouse ID filter

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  report?: {
    totalStocks: number;
    totalQuantity: number;
    totalReserved: number;
    availableQuantity: number;
    totalValue: number;
    recentMovements: number; // Last 30 days
    stocks: Stock[];
  };
}
```

**Usage:**
```typescript
// Get report for all stocks
const result = await getStockReport();

// Get report for specific item
const itemReport = await getStockReport("item123");

// Get report for specific warehouse
const warehouseReport = await getStockReport(undefined, "warehouse456");
```

#### 9. `getActiveItems()`

Gets active items that track inventory (for dropdowns).

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  items?: Array<{
    id: string;
    name: string;
    code: string;
    trackInventory: boolean;
  }>;
}
```

#### 10. `getActiveWarehouses()`

Gets active warehouses (for dropdowns).

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  warehouses?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}
```

## 🎨 UI Components

### StocksListClient

**Location:** `app/(dashboard)/dashboard/inventory/stock/_components/stocks.tsx`

**Props:**
```typescript
interface StocksListClientProps {
  initialStocks: Stock[];
  initialPagination: Pagination;
  initialSearch: string;
  initialItemId?: string;
  initialWarehouseId?: string;
  items?: Array<{ id: string; name: string; code: string }>;
  warehouses?: Array<{ id: string; name: string; code: string }>;
}
```

**Features:**
- Search by item name, code, or warehouse
- Filter by item and warehouse
- Displays quantity, reserved quantity, and available quantity
- Low stock warning (when available < 10)
- Links to item and warehouse detail pages
- Pagination support

### StockLedgerClient

**Location:** `app/(dashboard)/dashboard/inventory/stock/_components/stockLedger.tsx`

**Props:**
```typescript
interface StockLedgerClientProps {
  initialEntries: StockLedgerEntry[];
  initialPagination: Pagination;
  initialSearch: string;
  initialItemId?: string;
  initialWarehouseId?: string;
  initialTransactionType?: StockTransactionType | "all";
  initialDateFrom?: string;
  initialDateTo?: string;
  items?: Array<{ id: string; name: string; code: string }>;
  warehouses?: Array<{ id: string; name: string; code: string }>;
}
```

**Features:**
- Advanced filtering (item, warehouse, transaction type, date range)
- Color-coded transaction types
- Displays reference information
- Shows creator information
- Pagination support

### StockAdjustForm

**Location:** `app/(dashboard)/dashboard/inventory/stock/_components/stockAdjustForm.tsx`

**Features:**
- Item and warehouse selection
- Current stock display (total, reserved, available)
- Quantity adjustment (positive or negative)
- Notes field
- Real-time calculation of new quantity
- Validation (item must track inventory)

## 🔐 Permissions

### Permission Key
`inventory.stock`

### Operations

1. **view** - View stock list and ledger
2. **adjust** - Adjust stock quantities

### Registration

Permissions are registered in:
- `types/permissions.ts` - Navigation structure
- `prisma/seed.ts` - ModuleOperation table

### Usage in Code

```typescript
import { hasPermission } from "@/lib/permissions";

// Check permission
const canView = await hasPermission(userId, "inventory.stock", "view");
const canAdjust = await hasPermission(userId, "inventory.stock", "adjust");
```

## 🔗 Integration Points

### Purchase Module

Stock is automatically updated when Purchase status changes to `RECEIVED` or `PARTIALLY_RECEIVED`.

**Location:** `app/(dashboard)/dashboard/purchases/_actions/purchase.action.tsx`

**Integration:**
```typescript
import { updateStockOnPurchase } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";

// In updatePurchase function
if (validated.status === "RECEIVED" || validated.status === "PARTIALLY_RECEIVED") {
  await updateStockOnPurchase(purchase.id);
}

// In bulkUpdatePurchaseStatus function
if (status === "RECEIVED" || status === "PARTIALLY_RECEIVED") {
  for (const purchaseId of purchaseIds) {
    await updateStockOnPurchase(purchaseId);
  }
}
```

### Production Module (Future)

Use `updateStockOnProduction` to:
- Decrease stock when materials are issued (OUT)
- Increase stock when finished goods are received (IN)

### Sales Module (Future)

Use `updateStockOnSale` to decrease stock when items are sold.

## 🔄 Transaction Safety

All stock update operations use Prisma transactions to ensure atomicity:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Update or create Stock record
  // 2. Create StockLedger entry
  // 3. Validate quantities
});
```

This ensures:
- Stock and StockLedger are always in sync
- No partial updates
- Data consistency

## 📊 Stock Calculation

### Available Quantity
```
Available = Quantity - ReservedQuantity
```

### Stock Updates

**On Purchase (IN):**
```
New Quantity = Current Quantity + Purchase Quantity
```

**On Sale (OUT):**
```
New Quantity = Current Quantity - Sale Quantity
```

**On Adjustment:**
```
New Quantity = Current Quantity + Adjustment Quantity
```

## 📝 Logging and Notifications

### Activity Logging

Stock adjustments are logged using:
```typescript
await logItemUpdated(
  userId,
  "Stock",
  stockId,
  [`Stock adjusted: ${quantity > 0 ? "+" : ""}${quantity}`],
  `${item.name} - ${warehouse.name}`
);
```

### Notifications

Stock adjustments trigger notifications:
```typescript
await notifyItemUpdated(userId, "Stock", `${item.name} - ${warehouse.name}`);
```

## 🚨 Important Considerations

### Negative Stock

- Negative stock is allowed for adjustments (logged as warning)
- Consider implementing business rules to prevent negative stock for finished goods

### Default Warehouse

- When `warehouseId` is not provided in `updateStockOnPurchase`, the system uses the first active warehouse
- Consider implementing warehouse selection per purchase item

### Concurrency

- Stock updates use database transactions for consistency
- For high-concurrency scenarios, consider implementing optimistic locking

### Performance

- Stock and StockLedger tables are indexed appropriately
- Consider pagination for large datasets
- Use filters to limit query results

## 🧪 Testing

### Test Scenarios

1. **Purchase Stock Update**
   - Create purchase with items
   - Update status to RECEIVED
   - Verify stock is updated
   - Verify StockLedger entry is created

2. **Manual Adjustment**
   - Select item and warehouse
   - Adjust quantity (positive and negative)
   - Verify stock is updated
   - Verify StockLedger entry is created
   - Verify logging and notifications

3. **Stock Reports**
   - Generate report for all stocks
   - Generate report for specific item
   - Generate report for specific warehouse
   - Verify calculations are correct

4. **Stock Ledger**
   - Filter by item
   - Filter by warehouse
   - Filter by transaction type
   - Filter by date range
   - Verify entries are correct

## 📚 Related Documentation

- [Item Master Module](../master/ITEM_MASTER.md)
- [Warehouse Module](../master/WAREHOUSE_MODULE.md)
- [Purchase Module](../ACCOUNTING_SALES_PROCUREMENT_ANALYSIS.md)

## 🔧 Troubleshooting

### Stock Not Updating on Purchase

1. Check if Purchase status is `RECEIVED` or `PARTIALLY_RECEIVED`
2. Verify items have `trackInventory = true`
3. Check if default warehouse exists
4. Review server logs for errors

### Adjustment Fails

1. Verify user has `inventory.stock` permission with "adjust" operation
2. Check if item tracks inventory
3. Verify warehouse exists
4. Check server logs for validation errors

### Stock Ledger Not Showing Entries

1. Verify filters are correct
2. Check date range
3. Ensure entries exist in database
4. Review pagination settings
