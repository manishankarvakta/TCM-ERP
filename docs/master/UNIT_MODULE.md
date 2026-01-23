# Unit Module - Development Documentation

**Last Updated**: January 2026  
**Module Path**: `/dashboard/master/units`  
**Permission Key**: `master.units`

---

## 📋 Overview

The Unit module manages units of measurement used throughout the ERP system. Units are required for all items and cannot be deleted if they are in use by any items.

## 🎯 Features

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Unit assignment to items (required)
- ✅ Status management (active, inactive)
- ✅ Unique symbol constraint
- ✅ Search and filtering
- ✅ Soft delete support
- ✅ Activity logging
- ✅ User notifications

## 🗄️ Database Schema

### Prisma Model

```prisma
model Unit {
  id        String   @id @default(cuid())
  details   String   // Full name (e.g., "Kilogram")
  symbol    String   @unique // Abbreviation (e.g., "kg")
  status    String   @default("active")
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  creator   User     @relation("UnitCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  items     Item[]

  @@index([status])
  @@index([createdBy])
}
```

### Key Fields

- `id`: Unique identifier (CUID)
- `details`: Full unit name (e.g., "Kilogram", "Liter")
- `symbol`: Unit abbreviation (e.g., "kg", "L") - **Unique**
- `status`: Status (active, inactive)
- `createdBy`: User who created the unit
- `items`: Relation to items using this unit

## 📁 File Structure

```
app/(dashboard)/dashboard/master/units/
├── page.tsx                          # List page
├── _actions/
│   └── unit.action.tsx              # Server actions
└── _components/
    └── units.tsx                    # List component
```

## 🔌 Server Actions

### Location
`app/(dashboard)/dashboard/master/units/_actions/unit.action.tsx`

### Available Functions

#### `getUnits(page, limit, search, status)`
Get paginated list of units.

**Parameters:**
- `page: number` - Page number (default: 1)
- `limit: number` - Items per page (default: 10)
- `search: string` - Search query
- `status: "active" | "inactive" | "all"` - Status filter

**Returns:**
```typescript
{
  success: boolean;
  units: Unit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}
```

#### `getUnitById(unitId)`
Get a single unit by ID.

**Parameters:**
- `unitId: string` - Unit ID

**Returns:**
```typescript
{
  success: boolean;
  unit: Unit | null;
  error?: string;
}
```

#### `createUnit(input)`
Create a new unit.

**Parameters:**
```typescript
{
  details: string;
  symbol: string;
  status?: "active" | "inactive";
}
```

**Returns:**
```typescript
{
  success: boolean;
  unit?: Unit;
  error?: string;
}
```

**Validation:**
- Symbol must be unique
- Details and symbol are required

#### `updateUnit(input)`
Update an existing unit.

**Parameters:**
```typescript
{
  id: string;
  details: string;
  symbol: string;
  status?: "active" | "inactive";
}
```

**Returns:**
```typescript
{
  success: boolean;
  unit?: Unit;
  error?: string;
}
```

**Validation:**
- Symbol must be unique (excluding current unit)

#### `deleteUnit(unitId)`
Delete a unit.

**Parameters:**
- `unitId: string` - Unit ID

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Restriction:**
- Cannot delete if used by any items (`onDelete: Restrict`)

## 🎨 UI Components

### List Page (`page.tsx`)

**Route:** `/dashboard/master/units`

**Features:**
- Paginated unit list
- Search functionality
- Status filtering
- Create, Edit, Delete actions
- Permission-based UI visibility

**Component:** `UnitsListClient` (client component)

## 🔐 Permissions

**Permission Key:** `master.units`

**Operations:**
- `view` - View units list
- `create` - Create new units
- `edit` - Edit existing units
- `delete` - Delete units

## 🎯 Business Rules

1. **Symbol Uniqueness**: Unit symbols must be unique across all units
2. **Required for Items**: All items must have a unit assigned
3. **Deletion Restriction**: Units cannot be deleted if used by any items (`onDelete: Restrict`)
4. **Status Management**: Units can be active or inactive
5. **Creator Tracking**: Units track the user who created them

## 🔗 Integration Points

### With Item Module
- Items require a unit via `Item.unitId`
- Units cannot be deleted if used by items
- Units are displayed in item forms and lists

## 📝 Usage Example

### Creating a Unit

```typescript
const result = await createUnit({
  details: "Kilogram",
  symbol: "kg",
  status: "active"
});
```

### Using Unit in Item

```typescript
const result = await createItem({
  // ... other fields
  unitId: unitId, // Required
});
```

### Getting Active Units for Dropdown

```typescript
const result = await getActiveUnits();
// Returns only active units with symbol and details
```

### Display Format

Units are typically displayed as: `{symbol} ({details})`
- Example: `kg (Kilogram)`
- Example: `L (Liter)`

## 🐛 Common Issues & Solutions

### Issue: Cannot delete unit
**Solution:** Remove all items using the unit before deletion, or set unit status to inactive

### Issue: Symbol already exists
**Solution:** Use a different symbol or update the existing unit

### Issue: Unit not showing in dropdown
**Solution:** Ensure unit status is "active" and user has view permission

## 📚 Related Documentation

- [Item Master](./ITEM_MASTER.md)
- [Category Module](./CATEGORY_MODULE.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)

---

**Last Updated**: January 2026
