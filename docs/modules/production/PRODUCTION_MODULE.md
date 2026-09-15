# Production Module - Development Documentation

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

The Production module manages production orders for manufacturing finished goods. It integrates with the BOM (Bill of Materials) module to calculate raw material requirements, validates stock availability, and automatically updates inventory when production is completed.

### Key Features
- **Production Order Management**: Create, view, edit, and track production orders
- **BOM Integration**: Automatically calculates raw material requirements from BOM
- **Stock Validation**: Validates stock availability before and during production
- **Automatic Inventory Updates**: Deducts raw materials and adds finished goods to stock on completion
- **Status Management**: Track production through PLANNED → IN_PROGRESS → COMPLETED workflow
- **Auto-Generated Codes**: Production order codes are automatically generated (e.g., `PROD-2026-0001`)
- **Stock Ledger Integration**: Creates ledger entries for all stock movements
- **Audit Trail**: Complete user activity logging and notifications

### Module Location
- **Path**: `/dashboard/production/orders`
- **Permission Key**: `production.orders`
- **Module Type**: Production Management

---

## Database Schema

### ProductionOrderStatus Enum

```prisma
enum ProductionOrderStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

### ProductionOrder Model

```prisma
model ProductionOrder {
  id                String                 @id @default(cuid())
  code              String                 @unique // Auto-generated: PROD-2026-0001
  bomId             String                 // Link to BOM
  itemId            String                 // Ready Product item (for quick access)
  warehouseId       String                 // Production warehouse
  quantity          Decimal                @db.Decimal(12, 2) // Quantity to produce
  status            ProductionOrderStatus  @default(PLANNED)
  notes             String?
  isTrash           Boolean                @default(false)
  createdBy         String
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt
  completedAt       DateTime?              // When status = COMPLETED
  
  bom               BOM                    @relation(fields: [bomId], references: [id], onDelete: Restrict)
  item              Item                   @relation("ProductionOrderFG", fields: [itemId], references: [id], onDelete: Restrict)
  warehouse         Warehouse              @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  creator           User                   @relation("ProductionOrderCreator", fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([code])
  @@index([bomId])
  @@index([itemId])
  @@index([warehouseId])
  @@index([status])
  @@index([isTrash])
  @@index([createdBy])
}
```

### Field Descriptions

#### ProductionOrder Fields
- **code**: Auto-generated unique identifier (format: `PROD-YYYY-NNNN`)
- **bomId**: Reference to the BOM (Bill of Materials) used for production
- **itemId**: Reference to the finished good item (for quick access, derived from BOM)
- **warehouseId**: Warehouse where production occurs and finished goods are stored
- **quantity**: Quantity of production units (e.g., 10 units)
- **status**: Current production status (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- **notes**: Optional notes about the production order
- **isTrash**: Soft delete flag
- **createdBy**: User ID who created the production order
- **completedAt**: Timestamp when production was completed

### Relationships
- **ProductionOrder → BOM**: Many-to-one relationship (Restrict delete)
- **ProductionOrder → Item (Ready Product)**: Many-to-one relationship (Restrict delete)
- **ProductionOrder → Warehouse**: Many-to-one relationship (Restrict delete)
- **ProductionOrder → User (Creator)**: Many-to-one relationship (Cascade delete)

---

## Server Actions API

All server actions are located in: `/app/(dashboard)/dashboard/production/orders/_actions/production.action.tsx`

### Helper Functions

#### `generateProductionCode()`
Generates unique production order codes in format `PROD-YYYY-NNNN`.

```typescript
async function generateProductionCode(): Promise<string>
// Returns: "PROD-2026-0001"
```

**Logic**:
1. Gets current year
2. Finds last production order code with same year pattern
3. Increments sequence number
4. Returns formatted code with zero-padding

#### `calculateRawMaterialsNeeded(bomId, productionQuantity)`
Calculates required raw materials from BOM for given production quantity.

```typescript
export async function calculateRawMaterialsNeeded(
  bomId: string,
  productionQuantity: number
)
// Returns: { success: boolean, materials: RawMaterial[] }
```

**Calculation Formula**:
```
quantityNeeded = (bomItem.quantityRequired × productionQuantity) / bom.quantityPerUnit
```

**Returns**:
- `itemId`: Raw material item ID
- `itemName`: Raw material name
- `itemCode`: Raw material code
- `unitSymbol`: Unit symbol
- `quantityRequired`: Required per BOM unit
- `quantityNeeded`: Total needed for production
- `costPrice`: Unit cost price

#### `validateStockAvailability(materials, warehouseId)`
Validates if sufficient stock exists for raw materials.

```typescript
export async function validateStockAvailability(
  materials: Array<{ itemId: string; quantityNeeded: number }>,
  warehouseId: string
)
// Returns: { success: boolean, allAvailable: boolean, results: ValidationResult[] }
```

**Returns**:
- `allAvailable`: Whether all materials have sufficient stock
- `results[]`: Array of validation results per material
  - `itemId`, `itemName`, `itemCode`
  - `required`: Quantity needed
  - `available`: Current stock available
  - `isAvailable`: Whether stock is sufficient
  - `trackInventory`: Whether item tracks inventory

#### `getActiveBOMs()`
Fetches all active BOMs for dropdown selection.

```typescript
export async function getActiveBOMs()
// Returns: { success: boolean, boms: BOM[] }
```

#### `getActiveWarehouses()`
Fetches all active warehouses for dropdown selection.

```typescript
export async function getActiveWarehouses()
// Returns: { success: boolean, warehouses: Warehouse[] }
```

### CRUD Operations

#### `getProductionOrders()`
Fetches paginated list of production orders with filters.

```typescript
export async function getProductionOrders(
  page: number = 1,
  limit: number = 10,
  filters: {
    search?: string;
    status?: ProductionOrderStatus | "all";
    warehouseId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}
)
```

**Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `filters.search`: Search by code, item name/code, BOM name, or warehouse name
- `filters.status`: Filter by status (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `all`)
- `filters.warehouseId`: Filter by warehouse ID
- `filters.dateFrom`: Filter orders created from this date
- `filters.dateTo`: Filter orders created until this date

**Returns**:
```typescript
{
  success: boolean;
  orders: ProductionOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Permissions**: Requires `production.orders` `view` permission

#### `getProductionOrderById()`
Fetches a single production order with all related data.

```typescript
export async function getProductionOrderById(orderId: string)
```

**Returns**:
```typescript
{
  success: boolean;
  order: ProductionOrder & {
    bom: BOM & { items: BOMItem[] };
    item: Item;
    warehouse: Warehouse;
    creator: User;
  };
}
```

**Permissions**: Requires `production.orders` `view` permission

#### `createProductionOrder()`
Creates a new production order.

```typescript
export async function createProductionOrder(input: {
  bomId: string;
  warehouseId: string;
  quantity: number;
  notes?: string | null;
})
```

**Validations**:
- BOM must exist and be active
- Warehouse must exist and be active
- Quantity must be greater than 0
- Stock availability is checked (warns if insufficient, but allows creation)

**Process**:
1. Validates user session and permissions
2. Validates BOM and warehouse exist and are active
3. Validates quantity > 0
4. Calculates raw materials needed
5. Validates stock availability (warns but doesn't block)
6. Generates production order code
7. Creates production order with PLANNED status
8. Logs user activity
9. Sends notification
10. Revalidates paths

**Returns**:
```typescript
{
  success: boolean;
  order: ProductionOrder;
  stockWarnings?: Array<{ itemName, required, available }>; // If stock insufficient
}
```

**Permissions**: Requires `production.orders` `create` permission

#### `updateProductionOrder()`
Updates an existing production order (only if status is PLANNED).

```typescript
export async function updateProductionOrder(
  id: string,
  input: {
    bomId?: string;
    warehouseId?: string;
    quantity?: number;
    notes?: string | null;
  }
)
```

**Validations**:
- Order must exist
- Order status must be PLANNED
- If BOM changed, new BOM must be active
- If warehouse changed, new warehouse must be active
- Quantity must be greater than 0

**Process**:
1. Validates user session and permissions
2. Checks order exists and status is PLANNED
3. Validates input data
4. Updates order
5. Updates itemId if BOM changed
6. Logs user activity
7. Sends notification
8. Revalidates paths

**Permissions**: Requires `production.orders` `edit` permission

#### `startProductionOrder()`
Changes production order status from PLANNED to IN_PROGRESS.

```typescript
export async function startProductionOrder(id: string)
```

**Validations**:
- Order must exist
- Order status must be PLANNED

**Process**:
1. Validates user session and permissions
2. Checks order exists and status is PLANNED
3. Updates status to IN_PROGRESS
4. Logs user activity
5. Sends notification
6. Revalidates paths

**Permissions**: Requires `production.orders` `start` permission

#### `completeProductionOrder()`
Completes production order and updates inventory.

```typescript
export async function completeProductionOrder(id: string)
```

**Validations**:
- Order must exist
- Order status must be IN_PROGRESS
- Stock availability must be sufficient (fails if insufficient)

**Process**:
1. Validates user session and permissions
2. Checks order exists and status is IN_PROGRESS
3. Calculates raw materials needed
4. Validates stock availability (fails if insufficient)
5. Uses `prisma.$transaction` to:
   - Deduct raw materials from stock (OUT transactions)
   - Add finished goods to stock (IN transactions)
   - Create StockLedger entries for all movements
   - Update ProductionOrder status to COMPLETED
   - Set completedAt timestamp
6. Logs user activity
7. Sends notification
8. Revalidates paths

**Stock Updates**:
- **Raw Materials**: Stock quantity decremented, StockLedger entry with `OUT` transaction
- **Ready Products**: Stock quantity incremented, StockLedger entry with `IN` transaction
- **Reference**: All ledger entries reference production order ID

**Permissions**: Requires `production.orders` `complete` permission

#### `cancelProductionOrder()`
Cancels a production order.

```typescript
export async function cancelProductionOrder(id: string)
```

**Validations**:
- Order must exist
- Order status must be PLANNED or IN_PROGRESS

**Process**:
1. Validates user session and permissions
2. Checks order exists and status is PLANNED or IN_PROGRESS
3. Updates status to CANCELLED
4. Logs user activity
5. Sends notification
6. Revalidates paths

**Permissions**: Requires `production.orders` `cancel` permission

---

## UI Components

### Pages

#### List Page: `/dashboard/production/orders/page.tsx`
- Displays paginated list of production orders
- Search and filter functionality
- Individual actions (view, edit, start, complete, cancel)
- Permission-based action visibility

**Features**:
- Search by code, item name, BOM name, or warehouse name
- Filter by status and warehouse
- Pagination controls
- Status badges with color coding
- Action dropdown menu per order

#### Add Page: `/dashboard/production/orders/add/page.tsx`
- Form for creating new production order
- Uses `ProductionForm` component
- Protected by `PageGuard`

#### Edit Page: `/dashboard/production/orders/[id]/edit/page.tsx`
- Form for editing existing production order
- Pre-populates with existing data
- Only allows editing if status is PLANNED
- Uses `ProductionForm` component
- Protected by `PageGuard`

#### Detail Page: `/dashboard/production/orders/[id]/page.tsx`
- Read-only view of production order details
- Shows BOM information
- Displays raw materials breakdown with stock availability
- Shows production status and timeline
- Action buttons (edit, start, complete, cancel) based on status
- Protected by `PageGuard`

### Client Components

#### `ProductionForm` (`_components/productionForm.tsx`)
Form component for creating/editing production orders.

**Features**:
- React Hook Form with Zod validation
- BOM selection dropdown (filtered by active BOMs)
- Warehouse selection dropdown
- Quantity input
- Notes field
- Real-time raw materials calculation
- Stock availability display with warnings
- Cost calculation display
- Form validation with error messages

**Form Fields**:
- `bomId`: BOM selection (required)
- `warehouseId`: Warehouse selection (required)
- `quantity`: Production quantity (required, > 0)
- `notes`: Optional notes

**Real-time Features**:
- Calculates raw materials when BOM or quantity changes
- Validates stock availability when warehouse is selected
- Shows stock warnings for insufficient materials
- Displays estimated raw material cost

#### `ProductionsListClient` (`_components/productions.tsx`)
Client component for displaying production orders list.

**Features**:
- Search input with debouncing
- Status and warehouse filters
- Pagination controls
- Individual row actions
- Permission-based UI rendering
- URL parameter management
- Action dialogs (start, complete, cancel)

**Actions**:
- View: Navigate to detail page
- Edit: Navigate to edit page (PLANNED only)
- Start: Change status to IN_PROGRESS (PLANNED only)
- Complete: Complete production and update stock (IN_PROGRESS only)
- Cancel: Cancel production order (PLANNED or IN_PROGRESS)

#### `ProductionOrderActions` (`[id]/_components/productionOrderActions.tsx`)
Client component for production order action buttons on detail page.

**Features**:
- Start button (PLANNED status)
- Complete button (IN_PROGRESS status)
- Cancel button (PLANNED or IN_PROGRESS status)
- Confirmation dialogs for all actions
- Toast notifications on success/error

---

## Permissions

### Permission Key
`production.orders`

### Operations
1. **view**: View production orders list and details
2. **create**: Create new production orders
3. **edit**: Edit production orders (PLANNED status only)
4. **start**: Start production orders (PLANNED → IN_PROGRESS)
5. **complete**: Complete production orders (IN_PROGRESS → COMPLETED)
6. **cancel**: Cancel production orders

### Permission Registration
Permissions are registered in `prisma/seed.ts`:

```typescript
const productionOrderOperations = [
  { operation: "view", label: "View Production Orders" },
  { operation: "create", label: "Create Production Order" },
  { operation: "edit", label: "Edit Production Order" },
  { operation: "start", label: "Start Production Order" },
  { operation: "complete", label: "Complete Production Order" },
  { operation: "cancel", label: "Cancel Production Order" },
];
```

### Usage in Code
```typescript
// Check permission
const canView = await hasPermission(userId, "production.orders", "view");

// Page guard
<PageGuard permissionKey="production.orders" requiredOperation="view">
  {/* Page content */}
</PageGuard>
```

---

## Integration Points

### BOM Module Integration
- **BOM Selection**: Production orders link to BOMs to define recipes
- **Material Calculation**: Uses BOM items to calculate raw material requirements
- **Validation**: Ensures BOM is active before creating order
- **Helper Function**: Uses `calculateRawMaterialsNeeded()` to get material breakdown

### Inventory Module Integration
- **Stock Validation**: Validates raw material stock before completion
- **Stock Updates**: Automatically updates stock on production completion
  - Deducts raw materials (OUT transaction)
  - Adds finished goods (IN transaction)
- **Stock Ledger**: Creates ledger entries for all stock movements
  - `transactionType`: `OUT` for raw materials, `IN` for finished goods
  - `referenceType`: `"PRODUCTION"`
  - `referenceId`: ProductionOrder ID

### Item Master Integration
- **Ready Products**: Production orders link to `Item` with `itemType = READY_PRODUCT`
- **Raw Materials**: Raw materials are linked via BOM items
- **Validation**: Ensures items track inventory before updating stock

### Warehouse Module Integration
- **Production Location**: Production orders specify warehouse for production
- **Stock Location**: Finished goods are added to the same warehouse
- **Validation**: Ensures warehouse is active before creating order

### User Activity Logging
All production order operations are logged:
- `logItemCreated()`: When production order is created
- `logItemUpdated()`: When production order is updated/started/completed
- `logItemDeleted()`: When production order is cancelled

### Notifications
All production order operations trigger notifications:
- `notifyItemCreated()`: Notify on production order creation
- `notifyItemUpdated()`: Notify on status changes (start, complete, cancel)

---

## Business Logic

### Code Generation
Production order codes are auto-generated in format `PROD-YYYY-NNNN`:
- `YYYY`: Current year
- `NNNN`: Sequential number (zero-padded, 4 digits)
- Example: `PROD-2026-0001`, `PROD-2026-0002`

### Raw Material Calculation
Formula for calculating raw materials needed:
```
quantityNeeded = (bomItem.quantityRequired × productionQuantity) / bom.quantityPerUnit
```

**Example**:
- BOM produces 10 pieces per unit (`quantityPerUnit = 10`)
- Production quantity: 5 units
- Raw material required per BOM unit: 0.5 kg
- Total needed: `(0.5 × 5) / 10 = 0.25 kg`

### Ready Product Calculation
Formula for calculating finished goods produced:
```
finishedGoodQuantity = bom.quantityPerUnit × productionQuantity
```

**Example**:
- BOM produces 10 pieces per unit (`quantityPerUnit = 10`)
- Production quantity: 5 units
- Finished goods produced: `10 × 5 = 50 pieces`

### Status Transitions
- **PLANNED → IN_PROGRESS**: Via `startProductionOrder()`
- **IN_PROGRESS → COMPLETED**: Via `completeProductionOrder()`
- **PLANNED/IN_PROGRESS → CANCELLED**: Via `cancelProductionOrder()`

### Stock Validation Flow
1. **On Creation**: 
   - Calculates raw materials needed
   - Validates stock availability
   - Shows warnings if insufficient (but allows creation)
2. **On Completion**:
   - Re-validates stock availability
   - Fails if insufficient stock
   - Proceeds with stock updates if sufficient

### Transaction Safety
All production completion operations use Prisma transactions:
- `completeProductionOrder()`: Updates stock and order status atomically
- If any step fails, entire transaction rolls back
- Ensures data consistency

### Validation Rules
1. Can only edit if status = PLANNED
2. Can only start if status = PLANNED
3. Can only complete if status = IN_PROGRESS
4. Can only cancel if status = PLANNED or IN_PROGRESS
5. Must validate stock before completion
6. BOM must be active
7. Warehouse must be active
8. Quantity must be greater than 0

---

## Testing

### Manual Testing Checklist

#### Create Production Order
- [ ] Create production order with valid data
- [ ] Verify code auto-generation
- [ ] Test BOM selection
- [ ] Test warehouse selection
- [ ] Verify raw materials calculation
- [ ] Test stock availability warnings
- [ ] Test validation errors
- [ ] Check activity log entry
- [ ] Check notification sent

#### View Production Orders
- [ ] List page displays all orders
- [ ] Search functionality works
- [ ] Filter by status works
- [ ] Filter by warehouse works
- [ ] Pagination works correctly
- [ ] Detail page shows all information
- [ ] Raw materials breakdown displays correctly
- [ ] Stock availability shows correctly

#### Edit Production Order
- [ ] Edit existing order (PLANNED only)
- [ ] Update BOM
- [ ] Update warehouse
- [ ] Modify quantity
- [ ] Verify validation
- [ ] Check activity log
- [ ] Check notification

#### Start Production Order
- [ ] Start order (PLANNED → IN_PROGRESS)
- [ ] Verify status change
- [ ] Check activity log
- [ ] Check notification
- [ ] Verify cannot start if not PLANNED

#### Complete Production Order
- [ ] Complete order (IN_PROGRESS → COMPLETED)
- [ ] Verify stock deduction for raw materials
- [ ] Verify stock addition for finished goods
- [ ] Check stock ledger entries created
- [ ] Verify completedAt timestamp
- [ ] Test insufficient stock scenario
- [ ] Check activity log
- [ ] Check notification

#### Cancel Production Order
- [ ] Cancel order (PLANNED or IN_PROGRESS)
- [ ] Verify status change to CANCELLED
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
- Active warehouses
- Stock data for raw materials
- Production orders can be created using existing BOMs

---

## Troubleshooting

### Common Issues

#### Production Code Generation Fails
**Symptom**: Error creating production order, code generation fails
**Solution**: Check database connection, verify ProductionOrder table exists, check for code conflicts

#### Insufficient Stock on Completion
**Symptom**: Error when completing production order
**Solution**: 
1. Check raw material stock levels
2. Ensure items track inventory
3. Verify warehouse has sufficient stock
4. Check stock ledger for recent movements

#### Stock Not Updated on Completion
**Symptom**: Production completed but stock not updated
**Solution**:
1. Check transaction completed successfully
2. Verify items track inventory
3. Check stock ledger entries were created
4. Verify warehouse ID is correct

#### Cannot Edit Production Order
**Symptom**: Edit button not visible or edit fails
**Solution**: 
1. Verify order status is PLANNED
2. Check user has edit permission
3. Verify order exists and not in trash

#### Cannot Complete Production Order
**Symptom**: Complete button not visible or complete fails
**Solution**:
1. Verify order status is IN_PROGRESS
2. Check user has complete permission
3. Verify sufficient stock available
4. Check all raw materials have stock

#### Raw Materials Calculation Incorrect
**Symptom**: Calculated quantities don't match expected
**Solution**:
1. Verify BOM quantityPerUnit is correct
2. Check production quantity input
3. Verify formula: `(quantityRequired × productionQuantity) / quantityPerUnit`
4. Check BOM items have correct quantityRequired values

#### Stock Ledger Entries Missing
**Symptom**: Production completed but no ledger entries
**Solution**:
1. Check transaction completed successfully
2. Verify items track inventory
3. Check StockLedger table for entries with referenceType = "PRODUCTION"
4. Verify createdBy field is set

### Debugging Tips

1. **Check Server Logs**: All server actions log errors to console
2. **Verify Database**: Use Prisma Studio to inspect ProductionOrder data
3. **Check Permissions**: Use `hasPermission()` utility to debug permission issues
4. **Validate Input**: Check Zod validation errors in form components
5. **Transaction Issues**: Verify Prisma transactions complete successfully
6. **Stock Calculations**: Verify stock calculations match expected formulas
7. **Status Transitions**: Check order status before attempting transitions

---

## Related Documentation

- [BOM Module Documentation](./BOM_MODULE.md) - Bill of Materials definitions
- [Inventory Module Documentation](../inventory/INVENTORY_MODULE.md) - Stock management
- [Item Master Documentation](../master/ITEM_MASTER.md) - Item definitions
- [Permission System Documentation](../USER_PERMISSION_SYSTEM.md) - Permission system
- [Food Production Domain Model](../FOOD_PRODUCTION_DOMAIN_MODEL.md) - Domain model

---

## Version History

- **v1.0.0** (2026-01-23): Initial Production module implementation
  - Production order CRUD operations
  - BOM integration and material calculation
  - Stock validation and updates
  - Status management workflow
  - Auto-generated codes
  - Permission system integration
  - Activity logging and notifications
  - Transaction-safe stock updates
