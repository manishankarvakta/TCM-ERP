# Item Master Module - Development Documentation

**Last Updated**: January 2026  
**Module Path**: `/dashboard/master/items`  
**Permission Key**: `master.items`

---

## 📋 Overview

The Item Master module manages all items in the ERP system, including raw materials, finished goods, and retail items. It provides complete CRUD operations with inventory tracking, pricing, and categorization.

## 🎯 Features

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Auto-generated item codes (RM-2026-0001, FG-2026-0001, RT-2026-0001)
- ✅ Item types: Raw Material, Finished Good, Retail
- ✅ Category and Unit assignment
- ✅ Cost and Sales price management
- ✅ Inventory tracking flag
- ✅ Image upload support
- ✅ Stock information display
- ✅ Search and filtering
- ✅ Pagination
- ✅ Soft delete (trash)
- ✅ Activity logging
- ✅ User notifications

## 🗄️ Database Schema

### Prisma Model

```prisma
model Item {
  id                String    @id @default(cuid())
  code              String    @unique // Auto-generated: RM-2026-0001, FG-2026-0001, RT-2026-0001
  name              String
  description       String?
  itemType          ItemType  // RAW_MATERIAL, FINISHED_GOOD, RETAIL
  categoryId        String?
  unitId            String
  costPrice         Decimal   @db.Decimal(12, 2)
  salesPrice        Decimal?  @db.Decimal(12, 2) // Required for FINISHED_GOOD and RETAIL
  trackInventory    Boolean   @default(false)
  image             String?
  status            String    @default("active") // active, inactive, trash
  isTrash           Boolean   @default(false)
  createdBy         String
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  category          Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  unit              Unit      @relation(fields: [unitId], references: [id], onDelete: Restrict)
  creator           User      @relation("ItemCreator", fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([code])
  @@index([name])
  @@index([itemType])
  @@index([categoryId])
  @@index([unitId])
  @@index([status])
  @@index([isTrash])
  @@index([createdBy])
}
```

### ItemType Enum

```prisma
enum ItemType {
  RAW_MATERIAL   // Raw materials for production
  FINISHED_GOOD  // Finished products
  RETAIL         // Retail items (beverages, sides, etc.)
}
```

## 📁 File Structure

```
app/(dashboard)/dashboard/master/items/
├── page.tsx                          # List page
├── add/
│   └── page.tsx                      # Add item page
├── [id]/
│   ├── page.tsx                      # Item detail view
│   └── edit/
│       └── page.tsx                  # Edit item page
├── _actions/
│   └── item.action.tsx               # Server actions
└── _components/
    ├── items.tsx                     # List component
    └── itemForm.tsx                  # Form component
```

## 🔌 Server Actions

### Location
`app/(dashboard)/dashboard/master/items/_actions/item.action.tsx`

### Available Functions

#### `getItems(page, limit, search, status, itemType)`
Get paginated list of items with search and filtering.

**Parameters:**
- `page: number` - Page number (default: 1)
- `limit: number` - Items per page (default: 10)
- `search: string` - Search query (searches name, code, description)
- `status: "active" | "inactive" | "trash" | "all"` - Status filter
- `itemType?: ItemType` - Filter by item type

**Returns:**
```typescript
{
  success: boolean;
  items: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}
```

#### `getItemById(itemId)`
Get a single item by ID with all relations.

**Parameters:**
- `itemId: string` - Item ID

**Returns:**
```typescript
{
  success: boolean;
  item: Item | null;
  error?: string;
}
```

#### `getItemStock(itemId)`
Get stock information for an item (calculated from purchase items).

**Parameters:**
- `itemId: string` - Item ID

**Returns:**
```typescript
{
  success: boolean;
  stock: {
    quantity: number | null;
    averageCost: number;
    totalValue: number;
    lastUpdated: Date | null;
    message: string | null;
  } | null;
  error?: string;
}
```

#### `createItem(input)`
Create a new item.

**Parameters:**
```typescript
{
  name: string;
  description?: string;
  itemType: ItemType;
  categoryId?: string | null;
  unitId: string;
  costPrice: number;
  salesPrice?: number | null;
  trackInventory?: boolean;
  image?: string | null;
  status: "active" | "inactive";
}
```

**Returns:**
```typescript
{
  success: boolean;
  item?: Item;
  error?: string;
}
```

**Features:**
- Auto-generates item code based on item type
- Validates sales price requirement for FINISHED_GOOD and RETAIL
- Logs activity via `logItemCreated`
- Sends notification via `notifyItemCreated`

#### `updateItem(input)`
Update an existing item.

**Parameters:**
```typescript
{
  id: string;
  name: string;
  description?: string;
  itemType: ItemType;
  categoryId?: string | null;
  unitId: string;
  costPrice: number;
  salesPrice?: number | null;
  trackInventory?: boolean;
  image?: string | null;
  status: "active" | "inactive";
}
```

**Returns:**
```typescript
{
  success: boolean;
  item?: Item;
  error?: string;
}
```

**Features:**
- Validates sales price requirement
- Logs activity via `logItemUpdated`
- Sends notification via `notifyItemUpdated`
- Revalidates cache paths

#### `deleteItem(itemId)`
Soft delete an item (sets `isTrash: true`).

**Parameters:**
- `itemId: string` - Item ID

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Features:**
- Soft delete (sets `isTrash: true`, `status: "trash"`)
- Logs activity via `logItemDeleted`
- Sends notification via `notifyItemDeleted`

#### `deleteItemsPermanently(itemIds)`
Permanently delete items from database.

**Parameters:**
- `itemIds: string[]` - Array of item IDs

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

#### `bulkUpdateItemStatus(itemIds, status)`
Bulk update item status.

**Parameters:**
- `itemIds: string[]` - Array of item IDs
- `status: "active" | "inactive"` - New status

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

#### `getActiveCategories()`
Get active categories for dropdown.

**Returns:**
```typescript
{
  success: boolean;
  categories: Category[];
  error?: string;
}
```

#### `getActiveUnits()`
Get active units for dropdown.

**Returns:**
```typescript
{
  success: boolean;
  units: Unit[];
  error?: string;
}
```

## 🎨 UI Components

### List Page (`page.tsx`)

**Route:** `/dashboard/master/items`

**Features:**
- Paginated item list
- Search by name, code, description
- Filter by status and item type
- Bulk actions (delete, status update)
- Individual action buttons (view, edit, delete)
- Permission-based UI visibility

**Component:** `ItemsListClient` (client component)

### Add Page (`add/page.tsx`)

**Route:** `/dashboard/master/items/add`

**Features:**
- Create new item form
- Permission guard for `create` operation
- Redirects to list after creation

**Component:** `ItemForm` (mode: "create")

### Edit Page (`[id]/edit/page.tsx`)

**Route:** `/dashboard/master/items/[id]/edit`

**Features:**
- Edit existing item form
- Pre-populated with current data
- Permission guard for `edit` operation
- Redirects to list after update

**Component:** `ItemForm` (mode: "edit")

### Detail View (`[id]/page.tsx`)

**Route:** `/dashboard/master/items/[id]`

**Features:**
- Read-only item details
- Stock information display
- Pricing and profit margin
- Metadata (created by, dates)
- Permission guard for `view` operation
- Edit button (if user has edit permission)

### Form Component (`itemForm.tsx`)

**Location:** `_components/itemForm.tsx`

**Layout:** 5:1 grid (left: form inputs, right: image uploader)

**Form Fields:**
- Item Name* (text input)
- Item Type* (select: RAW_MATERIAL, FINISHED_GOOD, RETAIL)
- Description (textarea, optional)
- Category (select, optional)
- Unit* (select)
- Cost Price* (number input)
- Sales Price (number input, required for FINISHED_GOOD and RETAIL)
- Status* (select: active, inactive)
- Track Inventory (checkbox)
- Image (MediaSelector component)

**Validation:**
- Zod schema: `itemFormSchema`
- Sales price required for FINISHED_GOOD and RETAIL
- All required fields validated
- URL validation for image field

**Features:**
- React Hook Form integration
- Real-time validation
- Conditional field requirements
- Image upload via MediaSelector
- Loading states
- Error handling

### List Component (`items.tsx`)

**Location:** `_components/items.tsx`

**Features:**
- Data table with columns:
  - Code
  - Name
  - Type (badge)
  - Category
  - Unit
  - Cost Price (৳ formatted)
  - Sales Price (৳ formatted)
  - Status (badge)
  - Actions (view, edit, delete)
- Search input
- Status filter dropdown
- Item type filter dropdown
- Bulk selection checkbox
- Bulk actions dropdown
- Pagination controls
- Permission-based action visibility

## 🔐 Permissions

**Permission Key:** `master.items`

**Operations:**
- `view` - View items list and details
- `create` - Create new items
- `edit` - Edit existing items
- `delete` - Delete items

**Usage:**
```typescript
import { hasPermission } from "@/lib/permissions";

const canEdit = await hasPermission(userId, "master.items", "edit");
```

**Page Guards:**
All pages use `PageGuard` component:
```tsx
<PageGuard permissionKey="master.items" requiredOperation="view">
  {/* Page content */}
</PageGuard>
```

## 📝 Code Generation

Item codes are auto-generated based on item type:

- **Raw Material**: `RM-{YEAR}-{SEQUENCE}` (e.g., `RM-2026-0001`)
- **Finished Good**: `FG-{YEAR}-{SEQUENCE}` (e.g., `FG-2026-0001`)
- **Retail**: `RT-{YEAR}-{SEQUENCE}` (e.g., `RT-2026-0001`)

**Implementation:**
```typescript
async function generateItemCode(itemType: ItemType): Promise<string> {
  const prefix = {
    RAW_MATERIAL: "RM",
    FINISHED_GOOD: "FG",
    RETAIL: "RT",
  }[itemType];
  
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;
  
  // Find last code with this pattern
  const lastItem = await prisma.item.findFirst({
    where: { 
      code: { startsWith: pattern },
      isTrash: false,
    },
    orderBy: { code: "desc" },
  });
  
  let sequence = 1;
  if (lastItem) {
    const parts = lastItem.code.split("-");
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2] || "0");
      sequence = lastSeq + 1;
    }
  }
  
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}
```

## 💰 Pricing Rules

### Cost Price
- **Required**: Yes
- **Type**: Decimal (12, 2)
- **Purpose**: Purchase/cost price per unit
- **Used for**: Inventory valuation, cost calculations

### Sales Price
- **Required**: Yes for `FINISHED_GOOD` and `RETAIL`
- **Required**: No for `RAW_MATERIAL`
- **Type**: Decimal (12, 2)
- **Purpose**: Selling price per unit
- **Used for**: Sales transactions, profit calculations

### Validation
```typescript
.refine((data) => {
  if ((data.itemType === "FINISHED_GOOD" || data.itemType === "RETAIL") 
      && (!data.salesPrice || data.salesPrice <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Sales price is required for Finished Goods and Retail items",
  path: ["salesPrice"],
})
```

## 📊 Stock Information

Stock information is calculated from purchase items where purchase status is `RECEIVED`.

**Display:**
- Current Stock (quantity + unit)
- Average Cost (per unit)
- Total Value (stock valuation)
- Last Purchase Date

**Note:** This is a simplified calculation. When a full inventory system is implemented, this will use proper stock transactions and inventory balances.

## 🎯 Business Rules

1. **Item Code Uniqueness**: Item codes must be unique across all items
2. **Unit Restriction**: Units cannot be deleted if used by items (`onDelete: Restrict`)
3. **Category Optional**: Categories can be deleted, items will have `categoryId: null`
4. **Sales Price Requirement**: FINISHED_GOOD and RETAIL items must have sales price
5. **Soft Delete**: Items are soft-deleted (trash) by default, not permanently deleted
6. **Inventory Tracking**: Only items with `trackInventory: true` show stock information

## 🔗 Integration Points

### With Purchase Module
- Items referenced in `PurchaseItem.itemId`
- Stock calculated from received purchases

### With Category Module
- Items linked via `Item.categoryId`
- Categories can be assigned to items

### With Unit Module
- Items require a unit (`Item.unitId`)
- Units cannot be deleted if used by items

### With Accounts Module (Future)
- Inventory valuation
- Cost of goods sold calculations

### With Production Module (Future)
- Raw materials used in BOM
- Finished goods produced

## 🐛 Common Issues & Solutions

### Issue: Sales price validation error
**Solution:** Ensure sales price is provided for FINISHED_GOOD and RETAIL items

### Issue: Unit deletion fails
**Solution:** Remove all items using the unit before deletion

### Issue: Stock shows 0 when items purchased
**Solution:** Ensure purchase status is `RECEIVED` for stock calculation

### Issue: Item code not generating
**Solution:** Check database connection and ensure previous items exist for sequence calculation

## 📚 Related Documentation

- [Category Module](./CATEGORY_MODULE.md)
- [Unit Module](./UNIT_MODULE.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)

---

**Last Updated**: January 2026
