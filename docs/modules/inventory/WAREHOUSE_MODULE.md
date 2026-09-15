# Warehouse Module - Development Documentation

**Last Updated**: January 2026  
**Module Path**: `/dashboard/inventory/warehouses`  
**Permission Key**: `inventory.warehouses`

---

## 📋 Overview

The Warehouse module manages all warehouse locations in the ERP system. It provides complete CRUD operations for warehouse management with detailed location information, status tracking, and integration with inventory operations.

## 🎯 Features

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Auto-generated warehouse codes (WH-2026-0001)
- ✅ Complete address information (address, city, state, zip, country)
- ✅ Status management (active, inactive, trash)
- ✅ Search and filtering
- ✅ Pagination
- ✅ Soft delete (trash)
- ✅ Activity logging
- ✅ User notifications
- ✅ Breadcrumb navigation with warehouse names

## 🗄️ Database Schema

### Prisma Model

```prisma
model Warehouse {
  id        String   @id @default(cuid())
  code      String   @unique // Auto-generated: WH-2026-0001
  name      String
  address   String?
  city      String?
  state     String?
  zip       String?
  country   String?
  status    String   @default("active") // active, inactive, trash
  isTrash   Boolean  @default(false)
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  creator   User     @relation("WarehouseCreator", fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([code])
  @@index([name])
  @@index([status])
  @@index([isTrash])
  @@index([createdBy])
}
```

## 📁 File Structure

```
app/(dashboard)/dashboard/inventory/warehouses/
├── page.tsx                          # List page
├── add/
│   └── page.tsx                      # Add warehouse page
├── [id]/
│   ├── page.tsx                      # Warehouse detail view
│   └── edit/
│       └── page.tsx                  # Edit warehouse page
├── _actions/
│   └── warehouse.action.tsx          # Server actions
└── _components/
    ├── warehouses.tsx                # List component
    └── warehouseForm.tsx             # Form component
```

## 🔌 Server Actions

### Location
`app/(dashboard)/dashboard/inventory/warehouses/_actions/warehouse.action.tsx`

### Available Functions

#### `generateWarehouseCode()`
Auto-generates unique warehouse codes in format `WH-{YEAR}-{SEQUENCE}`.

**Internal function** - Used by `createWarehouse`.

#### `getWarehouses()`
Get paginated list of warehouses with search and filtering.

**Signature:**
```typescript
export async function getWarehouses(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
): Promise<{
  success: boolean;
  warehouses: Warehouse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}>
```

**Features:**
- Searches across name, code, address, city, state, country
- Filters by status (active, inactive, trash, all)
- Pagination support
- Permission check: `inventory.warehouses` - `view`

**Example:**
```typescript
const result = await getWarehouses(1, 20, "main", "active");
```

#### `getWarehouseById()`
Get a single warehouse by ID with creator information.

**Signature:**
```typescript
export async function getWarehouseById(
  warehouseId: string
): Promise<{
  success: boolean;
  warehouse: Warehouse | null;
  error?: string;
}>
```

**Features:**
- Includes creator user information
- Permission check: `inventory.warehouses` - `view`

**Example:**
```typescript
const result = await getWarehouseById("clx123...");
```

#### `createWarehouse()`
Create a new warehouse.

**Signature:**
```typescript
export async function createWarehouse(input: {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  status?: "active" | "inactive";
}): Promise<{
  success: boolean;
  warehouse: Warehouse | null;
  error?: string;
}>
```

**Features:**
- Auto-generates warehouse code
- Sets `createdBy` to current user
- Activity logging via `logItemCreated`
- Notification via `notifyItemCreated`
- Cache revalidation
- Permission check: `inventory.warehouses` - `create`

**Example:**
```typescript
const result = await createWarehouse({
  name: "Main Warehouse",
  address: "123 Industrial Area",
  city: "Dhaka",
  state: "Dhaka",
  zip: "1200",
  country: "Bangladesh",
  status: "active"
});
```

#### `updateWarehouse()`
Update an existing warehouse.

**Signature:**
```typescript
export async function updateWarehouse(input: {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  status?: "active" | "inactive";
}): Promise<{
  success: boolean;
  warehouse: Warehouse | null;
  error?: string;
}>
```

**Features:**
- Validates warehouse exists
- Activity logging via `logItemUpdated`
- Notification via `notifyItemUpdated`
- Cache revalidation
- Permission check: `inventory.warehouses` - `edit`

**Example:**
```typescript
const result = await updateWarehouse({
  id: "clx123...",
  name: "Updated Warehouse Name",
  city: "Chittagong"
});
```

#### `deleteWarehouse()`
Soft delete a warehouse (moves to trash).

**Signature:**
```typescript
export async function deleteWarehouse(
  warehouseId: string
): Promise<{
  success: boolean;
  error?: string;
}>
```

**Features:**
- Sets `isTrash: true` and `status: "trash"`
- Activity logging via `logItemDeleted`
- Notification via `notifyItemDeleted`
- Cache revalidation
- Permission check: `inventory.warehouses` - `move-to-trash`

**Example:**
```typescript
const result = await deleteWarehouse("clx123...");
```

#### `deleteWarehousesPermanently()`
Permanently delete warehouses from database.

**Signature:**
```typescript
export async function deleteWarehousesPermanently(
  warehouseIds: string[]
): Promise<{
  success: boolean;
  error?: string;
}>
```

**Features:**
- Hard delete (removes from database)
- Cache revalidation
- Permission check: `inventory.warehouses` - `delete-permanently`

**Example:**
```typescript
const result = await deleteWarehousesPermanently(["clx123...", "clx456..."]);
```

#### `bulkUpdateWarehouseStatus()`
Bulk update warehouse status.

**Signature:**
```typescript
export async function bulkUpdateWarehouseStatus(
  warehouseIds: string[],
  status: "active" | "inactive"
): Promise<{
  success: boolean;
  error?: string;
}>
```

**Features:**
- Updates multiple warehouses at once
- Only updates non-trash warehouses
- Cache revalidation
- Permission check: `inventory.warehouses` - `edit`

**Example:**
```typescript
const result = await bulkUpdateWarehouseStatus(
  ["clx123...", "clx456..."],
  "active"
);
```

## 🎨 UI Components

### List Component (`warehouses.tsx`)

**Location:** `app/(dashboard)/dashboard/inventory/warehouses/_components/warehouses.tsx`

**Features:**
- Data table with columns: Code, Name, Location, Status, Created At, Actions
- Search input (searches name, code, location fields)
- Bulk selection with checkboxes
- Bulk actions dropdown (Activate, Deactivate, Move to Trash, Restore, Delete Permanently)
- Individual action buttons (View, Edit, Delete)
- Pagination controls
- Permission-based UI visibility
- Trash view support

**Props:**
```typescript
interface WarehousesListClientProps {
  initialWarehouses: Warehouse[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
}
```

### Form Component (`warehouseForm.tsx`)

**Location:** `app/(dashboard)/dashboard/inventory/warehouses/_components/warehouseForm.tsx`

**Features:**
- React Hook Form integration
- Zod validation schema
- Form fields:
  - Name* (required)
  - Code (read-only, auto-generated)
  - Address (optional)
  - City (optional)
  - State/Province (optional)
  - ZIP/Postal Code (optional)
  - Country (optional)
  - Status* (required: active/inactive)
- Error handling and display
- Loading states
- Create and Edit modes

**Props:**
```typescript
interface WarehouseFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
    status: string;
  };
}
```

**Validation Schema:**
```typescript
const warehouseFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});
```

## 📄 Pages

### List Page (`page.tsx`)

**Location:** `app/(dashboard)/dashboard/inventory/warehouses/page.tsx`

**Features:**
- Server component
- Fetches warehouses via `getWarehouses()`
- Permission checks for UI elements
- Tabs for "All Warehouses" and "Trash"
- Wrapped with `PageGuard` (permission: `inventory.warehouses`, operation: `view`)

### Add Page (`add/page.tsx`)

**Location:** `app/(dashboard)/dashboard/inventory/warehouses/add/page.tsx`

**Features:**
- Server component
- Renders `WarehouseForm` in create mode
- Wrapped with `PageGuard` (permission: `inventory.warehouses`, operation: `create`)

### Detail Page (`[id]/page.tsx`)

**Location:** `app/(dashboard)/dashboard/inventory/warehouses/[id]/page.tsx`

**Features:**
- Server component
- Fetches warehouse via `getWarehouseById()`
- Displays read-only warehouse details
- 3-column grid layout (2 columns for main details, 1 for sidebar)
- Cards with icons:
  - Basic Information card
  - Status card
  - Metadata card (created by, dates)
- Edit button (if user has edit permission)
- Wrapped with `PageGuard` (permission: `inventory.warehouses`, operation: `view`)

### Edit Page (`[id]/edit/page.tsx`)

**Location:** `app/(dashboard)/dashboard/inventory/warehouses/[id]/edit/page.tsx`

**Features:**
- Server component
- Fetches warehouse via `getWarehouseById()`
- Renders `WarehouseForm` in edit mode with initial data
- Wrapped with `PageGuard` (permission: `inventory.warehouses`, operation: `edit`)

## 🔐 Permissions

**Permission Key:** `inventory.warehouses`

**Operations:**
- `view` - View warehouses list and details
- `create` - Create new warehouses
- `edit` - Edit existing warehouses
- `move-to-trash` - Soft delete warehouses
- `delete-permanently` - Permanently delete warehouses

**Registration:**
Permissions are registered in `prisma/seed.ts`:
```typescript
await prisma.moduleOperation.upsert({
  where: {
    module_operation: {
      module: "inventory.warehouses",
      operation: "view", // or create, edit, move-to-trash, delete-permanently
    },
  },
  // ...
});
```

## 🧭 Navigation

**Sidebar Entry:**
- **Section:** Inventory
- **Label:** Warehouses
- **Icon:** FiHome
- **Path:** `/dashboard/inventory/warehouses`
- **Module:** `inventory`

**Configuration:**
Updated in `lib/navigation-builder.ts`:
```typescript
{
  label: "Inventory",
  icon: "FiPackage",
  module: "inventory",
  subMenu: [
    { 
      href: "/dashboard/inventory/warehouses", 
      label: "Warehouses", 
      icon: "FiHome", 
      module: "inventory" 
    },
  ],
}
```

## 📝 Activity Logging

All warehouse operations are logged via generic logging functions:

- **Create:** `logItemCreated(userId, "Warehouse", warehouseId, warehouseName)`
- **Update:** `logItemUpdated(userId, "Warehouse", warehouseId, changes, warehouseName)`
- **Delete:** `logItemDeleted(userId, "Warehouse", warehouseId, warehouseName)`

**Location:** `lib/user-log.ts`

## 🔔 Notifications

All warehouse operations trigger user notifications:

- **Create:** `notifyItemCreated(userId, "Warehouse", warehouseName)`
- **Update:** `notifyItemUpdated(userId, "Warehouse", warehouseName)`
- **Delete:** `notifyItemDeleted(userId, "Warehouse", warehouseName)`

**Location:** `lib/notification.ts`

## 🍞 Breadcrumb Support

Warehouse names are dynamically displayed in breadcrumbs instead of IDs.

**Implementation:**
- `components/dashboard/BreadcrumbNav.tsx` detects warehouse routes
- Fetches warehouse name via `getWarehouseById()`
- Updates breadcrumb label dynamically

**Routes Supported:**
- `/dashboard/inventory/warehouses/[id]` - Shows warehouse name
- `/dashboard/inventory/warehouses/[id]/edit` - Shows "Edit [Warehouse Name]"

## 🌱 Seed Data

Sample warehouses are seeded in `prisma/seed.ts`:

```typescript
const warehouses = [
  {
    code: "WH-2026-0001",
    name: "Main Warehouse",
    address: "123 Industrial Area",
    city: "Dhaka",
    state: "Dhaka",
    zip: "1200",
    country: "Bangladesh",
    status: "active",
  },
  // ... more warehouses
];
```

**Run seed:**
```bash
npx prisma db seed
```

## 🔄 Code Generation

Warehouse codes are auto-generated in format: `WH-{YEAR}-{SEQUENCE}`

**Examples:**
- `WH-2026-0001`
- `WH-2026-0002`
- `WH-2026-0003`

**Logic:**
1. Finds last warehouse code with pattern `WH-{YEAR}-`
2. Extracts sequence number
3. Increments by 1
4. Pads to 4 digits with leading zeros

## 🎯 Usage Examples

### Creating a Warehouse

```typescript
const result = await createWarehouse({
  name: "New Warehouse",
  address: "456 Street",
  city: "Dhaka",
  state: "Dhaka",
  country: "Bangladesh",
  status: "active"
});

if (result.success) {
  console.log("Warehouse created:", result.warehouse.code);
}
```

### Fetching Warehouses with Search

```typescript
const result = await getWarehouses(
  1,        // page
  20,       // limit
  "main",   // search term
  "active"  // status filter
);

if (result.success) {
  result.warehouses.forEach(warehouse => {
    console.log(warehouse.name, warehouse.code);
  });
}
```

### Updating Warehouse Status

```typescript
const result = await bulkUpdateWarehouseStatus(
  ["warehouse-id-1", "warehouse-id-2"],
  "inactive"
);
```

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure user has `inventory.warehouses` permissions
   - Check `ModuleOperation` table entries

2. **Code Generation Conflicts**
   - Codes are unique - ensure no duplicates
   - Check for concurrent creation attempts

3. **Breadcrumb Not Updating**
   - Check `BreadcrumbNav.tsx` useEffect dependencies
   - Verify `getWarehouseById` is working correctly

## 🔗 Related Documentation

- [Master Data Architecture](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Master Data README](./README.md)

---

**Questions?** Refer to the [Architecture Guide](./ARCHITECTURE.md) or [API Reference](./API_REFERENCE.md).
