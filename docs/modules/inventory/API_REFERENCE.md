# Master Data API Reference

**Last Updated**: January 2026

---

## 📋 Overview

Complete API reference for all Master Data module server actions. All functions are Server Actions and must be called from client components or server components.

## 🔌 Item Master API

### `getItems`

Get paginated list of items with search and filtering.

**Location:** `app/(dashboard)/dashboard/master/items/_actions/item.action.tsx`

**Signature:**
```typescript
export async function getItems(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all",
  itemType?: ItemType
): Promise<{
  success: boolean;
  items: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}>
```

**Example:**
```typescript
const result = await getItems(1, 20, "rice", "active", "RAW_MATERIAL");
```

---

### `getItemById`

Get a single item by ID with all relations.

**Signature:**
```typescript
export async function getItemById(
  itemId: string
): Promise<{
  success: boolean;
  item: Item | null;
  error?: string;
}>
```

**Example:**
```typescript
const result = await getItemById("clx123...");
```

---

### `getItemStock`

Get stock information for an item.

**Signature:**
```typescript
export async function getItemStock(
  itemId: string
): Promise<{
  success: boolean;
  stock: {
    quantity: number | null;
    averageCost: number;
    totalValue: number;
    lastUpdated: Date | null;
    message: string | null;
  } | null;
  error?: string;
}>
```

**Example:**
```typescript
const result = await getItemStock("clx123...");
```

---

### `createItem`

Create a new item.

**Signature:**
```typescript
export async function createItem(input: {
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
}): Promise<{
  success: boolean;
  item?: Item;
  error?: string;
}>
```

**Example:**
```typescript
const result = await createItem({
  name: "Basmati Rice",
  itemType: "RAW_MATERIAL",
  unitId: "clx456...",
  costPrice: 120.50,
  trackInventory: true,
  status: "active",
});
```

---

### `updateItem`

Update an existing item.

**Signature:**
```typescript
export async function updateItem(input: {
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
}): Promise<{
  success: boolean;
  item?: Item;
  error?: string;
}>
```

**Example:**
```typescript
const result = await updateItem({
  id: "clx123...",
  name: "Premium Basmati Rice",
  // ... other fields
});
```

---

### `deleteItem`

Soft delete an item.

**Signature:**
```typescript
export async function deleteItem(
  itemId: string
): Promise<{
  success: boolean;
  error?: string;
}>
```

**Example:**
```typescript
const result = await deleteItem("clx123...");
```

---

### `deleteItemsPermanently`

Permanently delete items from database.

**Signature:**
```typescript
export async function deleteItemsPermanently(
  itemIds: string[]
): Promise<{
  success: boolean;
  error?: string;
}>
```

**Example:**
```typescript
const result = await deleteItemsPermanently(["clx123...", "clx456..."]);
```

---

### `bulkUpdateItemStatus`

Bulk update item status.

**Signature:**
```typescript
export async function bulkUpdateItemStatus(
  itemIds: string[],
  status: "active" | "inactive"
): Promise<{
  success: boolean;
  error?: string;
}>
```

**Example:**
```typescript
const result = await bulkUpdateItemStatus(["clx123...", "clx456..."], "inactive");
```

---

### `getActiveCategories`

Get active categories for dropdown.

**Signature:**
```typescript
export async function getActiveCategories(): Promise<{
  success: boolean;
  categories: Category[];
  error?: string;
}>
```

**Example:**
```typescript
const result = await getActiveCategories();
```

---

### `getActiveUnits`

Get active units for dropdown.

**Signature:**
```typescript
export async function getActiveUnits(): Promise<{
  success: boolean;
  units: Unit[];
  error?: string;
}>
```

**Example:**
```typescript
const result = await getActiveUnits();
```

---

## 📁 Category API

### `getCategories`

Get paginated list of categories.

**Location:** `app/(dashboard)/dashboard/master/categories/_actions/category.action.tsx`

**Signature:**
```typescript
export async function getCategories(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
): Promise<{
  success: boolean;
  categories: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}>
```

**Example:**
```typescript
const result = await getCategories(1, 20, "rice", "active");
```

---

### `getCategoryById`

Get a single category by ID.

**Signature:**
```typescript
export async function getCategoryById(
  categoryId: string
): Promise<{
  success: boolean;
  category: Category | null;
  error?: string;
}>
```

---

### `createCategory`

Create a new category.

**Signature:**
```typescript
export async function createCategory(input: {
  name: string;
  description?: string;
  status?: "active" | "inactive";
}): Promise<{
  success: boolean;
  category?: Category;
  error?: string;
}>
```

**Example:**
```typescript
const result = await createCategory({
  name: "Rice & Grains",
  description: "Rice and grain products",
  status: "active",
});
```

---

### `updateCategory`

Update an existing category.

**Signature:**
```typescript
export async function updateCategory(input: {
  id: string;
  name: string;
  description?: string;
  status?: "active" | "inactive";
}): Promise<{
  success: boolean;
  category?: Category;
  error?: string;
}>
```

---

### `deleteCategory`

Delete a category.

**Signature:**
```typescript
export async function deleteCategory(
  categoryId: string
): Promise<{
  success: boolean;
  error?: string;
}>
```

---

## 📏 Unit API

### `getUnits`

Get paginated list of units.

**Location:** `app/(dashboard)/dashboard/master/units/_actions/unit.action.tsx`

**Signature:**
```typescript
export async function getUnits(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "all" = "all"
): Promise<{
  success: boolean;
  units: Unit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}>
```

---

### `getUnitById`

Get a single unit by ID.

**Signature:**
```typescript
export async function getUnitById(
  unitId: string
): Promise<{
  success: boolean;
  unit: Unit | null;
  error?: string;
}>
```

---

### `createUnit`

Create a new unit.

**Signature:**
```typescript
export async function createUnit(input: {
  details: string;
  symbol: string;
  status?: "active" | "inactive";
}): Promise<{
  success: boolean;
  unit?: Unit;
  error?: string;
}>
```

**Example:**
```typescript
const result = await createUnit({
  details: "Kilogram",
  symbol: "kg",
  status: "active",
});
```

---

### `updateUnit`

Update an existing unit.

**Signature:**
```typescript
export async function updateUnit(input: {
  id: string;
  details: string;
  symbol: string;
  status?: "active" | "inactive";
}): Promise<{
  success: boolean;
  unit?: Unit;
  error?: string;
}>
```

---

### `deleteUnit`

Delete a unit (fails if used by items).

**Signature:**
```typescript
export async function deleteUnit(
  unitId: string
): Promise<{
  success: boolean;
  error?: string;
}>
```

---

## 🏢 Warehouse API

### `getWarehouses`

Get paginated list of warehouses with search and filtering.

**Location:** `app/(dashboard)/dashboard/inventory/warehouses/_actions/warehouse.action.tsx`

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

**Example:**
```typescript
const result = await getWarehouses(1, 20, "main", "active");
```

---

### `getWarehouseById`

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

**Example:**
```typescript
const result = await getWarehouseById("clx123...");
```

---

### `createWarehouse`

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

---

### `updateWarehouse`

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

**Example:**
```typescript
const result = await updateWarehouse({
  id: "clx123...",
  name: "Updated Warehouse Name",
  city: "Chittagong"
});
```

---

### `deleteWarehouse`

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

**Example:**
```typescript
const result = await deleteWarehouse("clx123...");
```

---

### `deleteWarehousesPermanently`

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

**Example:**
```typescript
const result = await deleteWarehousesPermanently(["clx123...", "clx456..."]);
```

---

### `bulkUpdateWarehouseStatus`

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

**Example:**
```typescript
const result = await bulkUpdateWarehouseStatus(
  ["clx123...", "clx456..."],
  "active"
);
```

---

## 🔐 Authentication & Permissions

All API functions automatically:
1. Check authentication via `auth()`
2. Check permissions via `hasPermission()`
3. Return `{ success: false, error: "Unauthorized" }` if not authenticated
4. Return `{ success: false, error: "Permission denied" }` if no permission

## 📝 Error Handling

All functions return consistent error format:

```typescript
{
  success: boolean;
  error?: string;
  // ... module-specific data
}
```

**Error Types:**
- `"Unauthorized"` - User not authenticated
- `"Permission denied"` - User lacks required permission
- `"Validation error"` - Input validation failed
- `"Not found"` - Resource not found
- `"Operation failed"` - Generic operation failure

## 🔔 Activity Logging

All create, update, and delete operations automatically:
- Log activity via `createUserLog`
- Send notifications to users
- Revalidate cache paths

## 📚 Related Documentation

- [Item Master](./ITEM_MASTER.md)
- [Category Module](./CATEGORY_MODULE.md)
- [Unit Module](./UNIT_MODULE.md)
- [Warehouse Module](./WAREHOUSE_MODULE.md)
- [Architecture Guide](./ARCHITECTURE.md)

---

**Last Updated**: January 2026
