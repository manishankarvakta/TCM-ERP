# Category Module - Development Documentation

**Last Updated**: January 2026  
**Module Path**: `/dashboard/master/categories`  
**Permission Key**: `master.categories`

---

## 📋 Overview

The Category module manages item categories used for classification and organization of items in the ERP system. Categories are optional and can be assigned to items for better organization and filtering.

## 🎯 Features

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Category assignment to items
- ✅ Status management (active, inactive)
- ✅ Search and filtering
- ✅ Soft delete support
- ✅ Activity logging
- ✅ User notifications

## 🗄️ Database Schema

### Prisma Model

```prisma
model Category {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  items       Item[]

  @@index([name])
  @@index([status])
}
```

### Key Fields

- `id`: Unique identifier (CUID)
- `name`: Category name (required)
- `description`: Optional description
- `status`: Status (active, inactive)
- `items`: Relation to items using this category

## 📁 File Structure

```
app/(dashboard)/dashboard/master/categories/
├── page.tsx                          # List page
├── _actions/
│   └── category.action.tsx          # Server actions
└── _components/
    └── categories.tsx                # List component
```

## 🔌 Server Actions

### Location
`app/(dashboard)/dashboard/master/categories/_actions/category.action.tsx`

### Available Functions

#### `getCategories(page, limit, search, status)`
Get paginated list of categories.

**Parameters:**
- `page: number` - Page number (default: 1)
- `limit: number` - Items per page (default: 10)
- `search: string` - Search query
- `status: "active" | "inactive" | "all"` - Status filter

**Returns:**
```typescript
{
  success: boolean;
  categories: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}
```

#### `getCategoryById(categoryId)`
Get a single category by ID.

**Parameters:**
- `categoryId: string` - Category ID

**Returns:**
```typescript
{
  success: boolean;
  category: Category | null;
  error?: string;
}
```

#### `createCategory(input)`
Create a new category.

**Parameters:**
```typescript
{
  name: string;
  description?: string;
  status?: "active" | "inactive";
}
```

**Returns:**
```typescript
{
  success: boolean;
  category?: Category;
  error?: string;
}
```

#### `updateCategory(input)`
Update an existing category.

**Parameters:**
```typescript
{
  id: string;
  name: string;
  description?: string;
  status?: "active" | "inactive";
}
```

**Returns:**
```typescript
{
  success: boolean;
  category?: Category;
  error?: string;
}
```

#### `deleteCategory(categoryId)`
Delete a category.

**Parameters:**
- `categoryId: string` - Category ID

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

## 🎨 UI Components

### List Page (`page.tsx`)

**Route:** `/dashboard/master/categories`

**Features:**
- Paginated category list
- Search functionality
- Status filtering
- Create, Edit, Delete actions
- Permission-based UI visibility

**Component:** `CategoriesListClient` (client component)

## 🔐 Permissions

**Permission Key:** `master.categories`

**Operations:**
- `view` - View categories list
- `create` - Create new categories
- `edit` - Edit existing categories
- `delete` - Delete categories

## 🎯 Business Rules

1. **Name Uniqueness**: Category names should be unique (enforced at application level)
2. **Optional for Items**: Categories are optional - items can exist without categories
3. **Cascade Delete**: Deleting a category sets `categoryId: null` on related items (`onDelete: SetNull`)
4. **Status Management**: Categories can be active or inactive

## 🔗 Integration Points

### With Item Module
- Items can be assigned to categories via `Item.categoryId`
- Categories are optional for items
- Deleting a category does not delete items, only removes the category reference

## 📝 Usage Example

### Creating a Category

```typescript
const result = await createCategory({
  name: "Rice & Grains",
  description: "Rice and grain products",
  status: "active"
});
```

### Assigning Category to Item

```typescript
const result = await createItem({
  // ... other fields
  categoryId: categoryId, // Optional
});
```

### Getting Categories for Dropdown

```typescript
const result = await getActiveCategories();
// Returns only active categories
```

## 📚 Related Documentation

- [Item Master](./ITEM_MASTER.md)
- [Unit Module](./UNIT_MODULE.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)

---

**Last Updated**: January 2026
