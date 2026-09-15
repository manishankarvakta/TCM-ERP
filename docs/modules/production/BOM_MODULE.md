# BOM (Bill of Materials) Module - Development Documentation

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

The BOM (Bill of Materials) module is a production management system that defines recipes for finished goods. Each BOM specifies the raw materials and quantities required to produce a finished good item.

### Key Features
- **Recipe Definition**: Create BOMs that define raw material requirements for finished goods
- **Auto-Generated Codes**: BOM codes are automatically generated (e.g., `BOM-2026-0001`)
- **Quantity Management**: Track quantity of finished goods produced per BOM execution
- **Cost Calculation**: Calculate total raw material cost for production
- **Status Management**: Active, inactive, and trash status support
- **Audit Trail**: Complete user activity logging and notifications

### Module Location
- **Path**: `/dashboard/production/boms`
- **Permission Key**: `production.boms`
- **Module Type**: Production Management

---

## Database Schema

### BOM Model

```prisma
model BOM {
  id                String   @id @default(cuid())
  code              String   @unique // Auto-generated: BOM-2026-0001
  name              String
  description       String?
  itemId            String   // Ready Product item
  quantityPerUnit   Decimal  @db.Decimal(12, 2) // Quantity of FG produced
  status            String   @default("active") // active, inactive, trash
  isTrash           Boolean  @default(false)
  createdBy         String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  item              Item     @relation("BOMFinishedGood", fields: [itemId], references: [id], onDelete: Restrict)
  creator           User     @relation("BOMCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  items             BOMItem[]

  @@index([code])
  @@index([itemId])
  @@index([status])
  @@index([isTrash])
  @@index([createdBy])
}
```

### BOMItem Model

```prisma
model BOMItem {
  id                String   @id @default(cuid())
  bomId             String
  itemId            String   // Raw Material item
  quantityRequired  Decimal  @db.Decimal(12, 2) // Quantity required per FG unit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  bom               BOM      @relation(fields: [bomId], references: [id], onDelete: Cascade)
  item              Item     @relation("BOMRawMaterial", fields: [itemId], references: [id], onDelete: Restrict)

  @@unique([bomId, itemId])
  @@index([bomId])
  @@index([itemId])
}
```

### Field Descriptions

#### BOM Fields
- **code**: Auto-generated unique identifier (format: `BOM-YYYY-NNNN`)
- **name**: Human-readable BOM name (e.g., "Chicken Biryani Recipe")
- **description**: Optional detailed description
- **itemId**: Reference to the finished good item (must be `READY_PRODUCT` type)
- **quantityPerUnit**: Quantity of finished goods produced when this BOM is executed (e.g., 1.0 for full portion, 0.5 for half portion)
- **status**: Current status (`active`, `inactive`, `trash`)
- **isTrash**: Soft delete flag
- **createdBy**: User ID who created the BOM

#### BOMItem Fields
- **bomId**: Reference to parent BOM
- **itemId**: Reference to raw material item (must be `RAW_MATERIAL` type)
- **quantityRequired**: Quantity of raw material needed per unit of finished good

### Relationships
- **BOM → Item (Ready Product)**: Many-to-one relationship (Restrict delete)
- **BOM → User (Creator)**: Many-to-one relationship (Cascade delete)
- **BOM → BOMItem**: One-to-many relationship (Cascade delete)
- **BOMItem → Item (Raw Material)**: Many-to-one relationship (Restrict delete)

---

## Server Actions API

All server actions are located in: `/app/(dashboard)/dashboard/production/boms/_actions/bom.action.tsx`

### Helper Functions

#### `generateBOMCode()`
Generates unique BOM codes in format `BOM-YYYY-NNNN`.

```typescript
async function generateBOMCode(): Promise<string>
// Returns: "BOM-2026-0001"
```

**Logic**:
1. Gets current year
2. Finds last BOM code with same year pattern
3. Increments sequence number
4. Returns formatted code with zero-padding

#### `getActiveFinishedGoods()`
Fetches all active finished good items for dropdown selection.

```typescript
export async function getActiveFinishedGoods()
// Returns: { success: boolean, items: FinishedGood[] }
```

**Returns**:
- `id`: Item ID
- `name`: Item name
- `code`: Item code
- `unit.symbol`: Unit symbol

#### `getActiveRawMaterials()`
Fetches all active raw material items for BOM item selection.

```typescript
export async function getActiveRawMaterials()
// Returns: { success: boolean, items: RawMaterial[] }
```

**Returns**:
- `id`: Item ID
- `name`: Item name
- `code`: Item code
- `unit.symbol`: Unit symbol
- `costPrice`: Cost price for calculations

### CRUD Operations

#### `getBOMs()`
Fetches paginated list of BOMs with filters.

```typescript
export async function getBOMs(
  page: number = 1,
  limit: number = 10,
  filters: {
    search?: string;
    status?: string;
    itemId?: string;
  } = {}
)
```

**Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `filters.search`: Search by name, code, or item name/code
- `filters.status`: Filter by status (`active`, `inactive`, `trash`, `all`)
- `filters.itemId`: Filter by finished good item ID

**Returns**:
```typescript
{
  success: boolean;
  boms: BOM[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Permissions**: Requires `production.boms` `view` permission

#### `getBOMById()`
Fetches a single BOM with all related data.

```typescript
export async function getBOMById(id: string)
```

**Returns**:
```typescript
{
  success: boolean;
  bom: BOM & {
    item: Item;
    creator: User;
    items: (BOMItem & { item: Item })[];
  };
}
```

**Permissions**: Requires `production.boms` `view` permission

#### `getBOMForProduction()`
Fetches BOM optimized for production calculations.

```typescript
export async function getBOMForProduction(itemId: string)
```

**Returns**: BOM with raw materials and quantities, formatted for production module consumption.

**Permissions**: Requires `production.boms` `view` permission

#### `createBOM()`
Creates a new BOM with BOM items.

```typescript
export async function createBOM(input: {
  name: string;
  description?: string | null;
  itemId: string;
  quantityPerUnit: number;
  status: "active" | "inactive";
  items: Array<{
    itemId: string;
    quantityRequired: number;
  }>;
})
```

**Validations**:
- Finished good item must exist and be `READY_PRODUCT` type
- All raw material items must exist and be `RAW_MATERIAL` type
- No duplicate raw materials in items array
- At least one BOM item required
- All quantities must be positive

**Process**:
1. Validates user session and permissions
2. Validates input data
3. Generates BOM code
4. Creates BOM and BOM items in transaction
5. Logs user activity
6. Sends notification
7. Revalidates paths

**Permissions**: Requires `production.boms` `create` permission

#### `updateBOM()`
Updates an existing BOM and its items.

```typescript
export async function updateBOM(
  id: string,
  input: {
    name: string;
    description?: string | null;
    itemId: string;
    quantityPerUnit: number;
    status: "active" | "inactive";
    items: Array<{
      itemId: string;
      quantityRequired: number;
    }>;
  }
)
```

**Validations**: Same as `createBOM()`

**Process**:
1. Validates user session and permissions
2. Checks BOM exists and not in trash
3. Validates input data
4. Updates BOM and replaces BOM items in transaction
5. Logs user activity
6. Sends notification
7. Revalidates paths

**Permissions**: Requires `production.boms` `edit` permission

#### `deleteBOM()`
Soft deletes a BOM (moves to trash).

```typescript
export async function deleteBOM(id: string)
```

**Process**:
1. Validates user session and permissions
2. Checks BOM exists and not already in trash
3. Updates `isTrash` flag
4. Logs user activity
5. Sends notification
6. Revalidates paths

**Permissions**: Requires `production.boms` `move-to-trash` permission

#### `deleteBOMPermanently()`
Permanently deletes a BOM from database.

```typescript
export async function deleteBOMPermanently(id: string)
```

**Process**:
1. Validates user session and permissions
2. Checks BOM exists and is in trash
3. Deletes BOM and all BOM items (cascade)
4. Logs user activity
5. Sends notification
6. Revalidates paths

**Permissions**: Requires `production.boms` `delete-permanently` permission

#### `bulkUpdateBOMStatus()`
Bulk updates status for multiple BOMs.

```typescript
export async function bulkUpdateBOMStatus(
  bomIds: string[],
  action: "trash" | "restore" | "activate" | "deactivate"
)
```

**Actions**:
- `trash`: Move to trash
- `restore`: Restore from trash
- `activate`: Set status to active
- `deactivate`: Set status to inactive

**Permissions**: 
- `trash`/`restore`: Requires `move-to-trash` permission
- `activate`/`deactivate`: Requires `edit` permission

---

## UI Components

### Pages

#### List Page: `/dashboard/production/boms/page.tsx`
- Displays paginated list of BOMs
- Search and filter functionality
- Bulk actions (trash, restore)
- Individual actions (view, edit, delete)
- Tab navigation (All BOMs, Trash)

**Features**:
- Search by name, code, or item name
- Filter by status and finished good
- Pagination controls
- Permission-based action visibility

#### Add Page: `/dashboard/production/boms/add/page.tsx`
- Form for creating new BOM
- Uses `BOMForm` component
- Protected by `PageGuard`

#### Edit Page: `/dashboard/production/boms/[id]/edit/page.tsx`
- Form for editing existing BOM
- Pre-populates with existing data
- Uses `BOMForm` component
- Protected by `PageGuard`

#### Detail Page: `/dashboard/production/boms/[id]/page.tsx`
- Read-only view of BOM details
- Shows all raw materials with quantities
- Displays cost calculations
- Action buttons (edit, delete)
- Protected by `PageGuard`

### Client Components

#### `BOMForm` (`_components/bomForm.tsx`)
Form component for creating/editing BOMs.

**Features**:
- React Hook Form with Zod validation
- Dynamic BOM items using `useFieldArray`
- Finished good selection dropdown
- Raw material selection with quantity input
- Real-time cost calculation
- Duplicate raw material prevention
- Form validation with error messages

**Form Fields**:
- `name`: BOM name (required)
- `description`: Optional description
- `itemId`: Finished good selection (required)
- `quantityPerUnit`: Quantity produced (required, > 0)
- `status`: Active/Inactive (required)
- `items[]`: Array of raw materials
  - `itemId`: Raw material selection (required)
  - `quantityRequired`: Quantity needed (required, > 0)

**Validation Rules**:
- All required fields must be filled
- Quantities must be positive numbers
- No duplicate raw materials
- At least one BOM item required

#### `BOMsListClient` (`_components/boms.tsx`)
Client component for displaying BOM list.

**Features**:
- Search input with debouncing
- Status and item filters
- Pagination controls
- Bulk selection and actions
- Individual row actions
- Permission-based UI rendering
- URL parameter management

**Actions**:
- View: Navigate to detail page
- Edit: Navigate to edit page
- Delete: Move to trash or permanent delete
- Bulk Trash: Move multiple to trash
- Bulk Restore: Restore from trash

---

## Permissions

### Permission Key
`production.boms`

### Operations
1. **create**: Create new BOMs
2. **view**: View BOM list and details
3. **edit**: Edit existing BOMs
4. **move-to-trash**: Soft delete BOMs
5. **delete-permanently**: Permanently delete BOMs

### Permission Registration
Permissions are registered in `prisma/seed.ts`:

```typescript
const bomOperations = [
  { operation: "create", label: "Create BOM" },
  { operation: "view", label: "View BOM" },
  { operation: "edit", label: "Edit BOM" },
  { operation: "move-to-trash", label: "Move BOM to Trash" },
  { operation: "delete-permanently", label: "Delete BOM Permanently" },
];
```

### Usage in Code
```typescript
// Check permission
const canView = await hasPermission(userId, "production.boms", "view");

// Page guard
<PageGuard permissionKey="production.boms" requiredOperation="view">
  {/* Page content */}
</PageGuard>
```

---

## Integration Points

### Item Master Integration
- **Ready Products**: BOMs link to `Item` with `itemType = READY_PRODUCT`
- **Raw Materials**: BOM items link to `Item` with `itemType = RAW_MATERIAL`
- **Validation**: Server actions validate item types before creating/updating

### Production Module (Future)
- `getBOMForProduction()` provides optimized BOM data for production calculations
- Production module will consume BOMs to:
  - Calculate raw material requirements
  - Validate stock availability
  - Create production orders
  - Update inventory on production completion

### Inventory Module
- BOMs reference items that may have inventory tracking
- Production module will use BOMs to:
  - Deduct raw materials from stock (OUT transaction)
  - Add finished goods to stock (IN transaction)

### User Activity Logging
All BOM operations are logged:
- `logItemCreated()`: When BOM is created
- `logItemUpdated()`: When BOM is updated
- `logItemDeleted()`: When BOM is deleted

### Notifications
All BOM operations trigger notifications:
- `notifyItemCreated()`: Notify on BOM creation
- `notifyItemUpdated()`: Notify on BOM update
- `notifyItemDeleted()`: Notify on BOM deletion

---

## Business Logic

### Code Generation
BOM codes are auto-generated in format `BOM-YYYY-NNNN`:
- `YYYY`: Current year
- `NNNN`: Sequential number (zero-padded, 4 digits)
- Example: `BOM-2026-0001`, `BOM-2026-0002`

### Quantity Calculation
- **quantityPerUnit**: Quantity of finished goods produced (e.g., 1.0 for full portion, 0.5 for half portion)
- **quantityRequired**: Quantity of raw material needed per unit of finished good
- **Total Raw Material**: `quantityRequired × quantityPerUnit × productionQuantity`

### Cost Calculation
Total raw material cost is calculated as:
```typescript
totalCost = sum(bomItem.quantityRequired × bomItem.item.costPrice)
```

### Status Management
- **active**: BOM is available for use in production
- **inactive**: BOM is temporarily disabled
- **trash**: BOM is soft-deleted (can be restored)

### Validation Rules
1. Finished good must be `READY_PRODUCT` type
2. Raw materials must be `RAW_MATERIAL` type
3. No duplicate raw materials in same BOM
4. All quantities must be positive numbers
5. At least one BOM item required
6. BOM code must be unique

### Transaction Safety
All BOM operations use Prisma transactions:
- `createBOM()`: Creates BOM and all BOM items atomically
- `updateBOM()`: Updates BOM and replaces BOM items atomically
- `deleteBOMPermanently()`: Deletes BOM and all BOM items atomically

---

## Testing

### Manual Testing Checklist

#### Create BOM
- [ ] Create BOM with valid data
- [ ] Verify code auto-generation
- [ ] Add multiple raw materials
- [ ] Verify duplicate raw material prevention
- [ ] Test validation errors
- [ ] Verify cost calculation
- [ ] Check activity log entry
- [ ] Check notification sent

#### View BOM
- [ ] List page displays all BOMs
- [ ] Search functionality works
- [ ] Filter by status works
- [ ] Filter by finished good works
- [ ] Pagination works correctly
- [ ] Detail page shows all information
- [ ] Cost calculation displays correctly

#### Edit BOM
- [ ] Edit existing BOM
- [ ] Update raw materials
- [ ] Change finished good
- [ ] Modify quantities
- [ ] Verify validation
- [ ] Check activity log
- [ ] Check notification

#### Delete BOM
- [ ] Soft delete (move to trash)
- [ ] Restore from trash
- [ ] Permanent delete
- [ ] Verify cascade delete of BOM items
- [ ] Check activity log
- [ ] Check notification

#### Permissions
- [ ] Test with user without permissions
- [ ] Verify permission checks in all actions
- [ ] Test page guards
- [ ] Verify UI elements hidden based on permissions

### Test Data
Seed data includes:
- 8 BOMs for biryani dishes
- 82 BOM items with realistic quantities
- Finished goods: Chicken, Mutton, Beef, Special Biryani (Half & Full)
- Raw materials: Rice, Meat, Spices, Vegetables, etc.

---

## Troubleshooting

### Common Issues

#### BOM Code Generation Fails
**Symptom**: Error creating BOM, code generation fails
**Solution**: Check database connection, verify BOM table exists, check for code conflicts

#### Duplicate Raw Materials
**Symptom**: Validation error when adding same raw material twice
**Solution**: This is expected behavior - each raw material can only appear once per BOM

#### Decimal Serialization Error
**Symptom**: Error displaying quantities in UI
**Solution**: Server actions convert Prisma `Decimal` to `number` before returning

#### Permission Denied
**Symptom**: User cannot access BOM pages
**Solution**: 
1. Verify user has `production.boms` permissions
2. Check `ModuleOperation` table has correct entries
3. Run seed script to register permissions

#### BOM Not Found
**Symptom**: Error when viewing/editing BOM
**Solution**: 
1. Verify BOM exists and not in trash
2. Check BOM ID is correct
3. Verify user has view permission

#### Cost Calculation Incorrect
**Symptom**: Total cost shows wrong value
**Solution**: 
1. Verify raw material items have `costPrice` set
2. Check quantity calculations
3. Verify Decimal to number conversion

### Debugging Tips

1. **Check Server Logs**: All server actions log errors to console
2. **Verify Database**: Use Prisma Studio to inspect BOM data
3. **Check Permissions**: Use `hasPermission()` utility to debug permission issues
4. **Validate Input**: Check Zod validation errors in form components
5. **Transaction Issues**: Verify Prisma transactions complete successfully

---

## Related Documentation

- [Item Master Documentation](/docs/master/ITEM_MASTER.md)
- [Inventory Module Documentation](/docs/inventory/INVENTORY_MODULE.md)
- [Permission System Documentation](/docs/USER_PERMISSION_SYSTEM.md)
- [Food Production Domain Model](/docs/FOOD_PRODUCTION_DOMAIN_MODEL.md)

---

## Version History

- **v1.0.0** (2026-01-23): Initial BOM module implementation
  - CRUD operations
  - Auto-generated codes
  - Cost calculations
  - Permission system integration
  - Activity logging and notifications
