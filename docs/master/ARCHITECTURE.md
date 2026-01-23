# Master Data Architecture - Development Guide

**Last Updated**: January 2026

---

## 📋 Overview

This document outlines the architecture patterns, conventions, and best practices for developing Master Data modules in the ERP system.

## 🏗️ Architecture Patterns

### File Structure Convention

All Master Data modules follow this consistent structure:

```
app/(dashboard)/dashboard/master/{module}/
├── page.tsx                    # List page (server component)
├── add/
│   └── page.tsx                # Add page (server component)
├── [id]/
│   ├── page.tsx                # Detail view (server component)
│   └── edit/
│       └── page.tsx            # Edit page (server component)
├── _actions/
│   └── {module}.action.tsx     # Server actions (CRUD)
└── _components/
    ├── {module}s.tsx           # List component (client)
    └── {module}Form.tsx        # Form component (client)
```

### Naming Conventions

- **Files**: kebab-case (e.g., `item-form.tsx`)
- **Components**: PascalCase (e.g., `ItemForm`)
- **Functions**: camelCase (e.g., `getItemById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `ITEM_TYPE`)
- **Types/Interfaces**: PascalCase (e.g., `ItemFormData`)

## 🗄️ Database Patterns

### Standard Fields

All Master Data models should include:

```prisma
model Example {
  id        String   @id @default(cuid())
  // ... module-specific fields
  status    String   @default("active") // active, inactive, trash
  isTrash   Boolean  @default(false)
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  creator   User     @relation("ExampleCreator", fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([isTrash])
  @@index([createdBy])
}
```

### Status Values

- `active` - Active and available for use
- `inactive` - Temporarily disabled
- `trash` - Soft deleted (for recovery)

### Soft Delete Pattern

```prisma
isTrash Boolean @default(false)
status  String  @default("active")
```

When deleting:
1. Set `isTrash: true`
2. Set `status: "trash"`
3. Do NOT permanently delete (unless explicitly requested)

## 🔌 Server Actions Pattern

### Standard Structure

```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { notifyItemCreated, notifyItemUpdated, notifyItemDeleted } from "@/lib/notification";
import { revalidateBothPaths } from "@/lib/route-utils-server";

// 1. Authentication check
const session = await auth();
if (!session?.user) {
  return { success: false, error: "Unauthorized" };
}

// 2. Permission check
const canOperate = await hasPermission(session.user.id, "master.module", "operation");
if (!canOperate) {
  return { success: false, error: "Permission denied" };
}

// 3. Validation (if needed)
// ... validation logic

// 4. Database operation
const result = await prisma.model.create({ data });

// 5. Activity logging
await logItemCreated(session.user.id, result.id, result.name);

// 6. Notification
await notifyItemCreated(session.user.id, result.id);

// 7. Cache revalidation
await revalidateBothPaths("/dashboard/master/module");

return { success: true, item: result };
```

### Error Handling

Always return consistent error format:

```typescript
try {
  // ... operation
} catch (error) {
  console.error("Operation error:", error);
  return {
    success: false,
    error: error instanceof Error ? error.message : "Operation failed",
  };
}
```

## 🎨 UI Component Patterns

### Server Components (Pages)

```typescript
import { getItems } from "../_actions/item.action";
import PageGuard from "@/components/permissions/page-guard";
import ItemsListClient from "../_components/items";

export default async function ItemsPage() {
  const result = await getItems();
  
  return (
    <PageGuard permissionKey="master.items" requiredOperation="view">
      <ItemsListClient initialData={result.items} />
    </PageGuard>
  );
}
```

### Client Components (Forms)

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  // ... fields
});

export default function ItemForm({ mode, initialData }: ItemFormProps) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {},
  });

  const onSubmit = async (data) => {
    // ... submit logic
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* ... form fields */}
    </form>
  );
}
```

### Permission Guards

Always wrap pages with `PageGuard`:

```typescript
<PageGuard permissionKey="master.items" requiredOperation="view">
  {/* Page content */}
</PageGuard>
```

## 🔐 Permission Pattern

### Registration

1. **Add to `types/permissions.ts`:**

```typescript
export const NAVIGATION_STRUCTURE = {
  // ...
  "master.items": {
    label: "Items",
    operations: ["view", "create", "edit", "delete"],
  },
};
```

2. **Register in Seed:**

```typescript
await prisma.moduleOperation.createMany({
  data: [
    { module: "master.items", operation: "view", label: "View Items" },
    { module: "master.items", operation: "create", label: "Create Items" },
    { module: "master.items", operation: "edit", label: "Edit Items" },
    { module: "master.items", operation: "delete", label: "Delete Items" },
  ],
});
```

### Usage

```typescript
// Server-side
const canEdit = await hasPermission(userId, "master.items", "edit");

// Client-side (for UI visibility)
const canEdit = await hasPermission(session.user.id, "master.items", "edit");
```

## 📝 Form Validation Pattern

### Zod Schema

```typescript
const itemFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
}).refine((data) => {
  // Custom validation
  return true;
}, {
  message: "Custom error message",
  path: ["fieldName"],
});
```

### React Hook Form Integration

```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: initialData || {},
});

// For controlled components
<Controller
  name="fieldName"
  control={form.control}
  render={({ field }) => (
    <Select value={field.value} onValueChange={field.onChange}>
      {/* ... */}
    </Select>
  )}
/>
```

## 🔔 Activity Logging Pattern

### Log Functions

```typescript
import { 
  logItemCreated, 
  logItemUpdated, 
  logItemDeleted 
} from "@/lib/user-log";

// After successful create
await logItemCreated(userId, itemId, itemName);

// After successful update
await logItemUpdated(userId, itemId, itemName);

// After successful delete
await logItemDeleted(userId, itemId, itemName);
```

### Log Format

- **Action**: `item.created`, `item.updated`, `item.deleted`
- **Details**: JSON string with relevant information
- **User**: Automatically tracked via `userId`

## 🔔 Notification Pattern

### Notification Functions

```typescript
import { 
  notifyItemCreated, 
  notifyItemUpdated, 
  notifyItemDeleted 
} from "@/lib/notification";

// After successful create
await notifyItemCreated(userId, itemId);

// After successful update
await notifyItemUpdated(userId, itemId);

// After successful delete
await notifyItemDeleted(userId, itemId);
```

## 🔄 Cache Revalidation Pattern

### Revalidation Functions

```typescript
import { revalidateBothPaths } from "@/lib/route-utils-server";

// After create/update/delete
await revalidateBothPaths("/dashboard/master/items");
```

This revalidates both the list page and detail pages.

## 🎨 UI Component Patterns

### List Component

```typescript
"use client";

export default function ItemsListClient({ initialData }) {
  const [items, setItems] = useState(initialData);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  // ... filtering and pagination logic

  return (
    <div>
      {/* Search and filters */}
      {/* Data table */}
      {/* Pagination */}
    </div>
  );
}
```

### Form Component

```typescript
"use client";

export default function ItemForm({ mode, initialData }) {
  const form = useForm({ /* ... */ });
  const router = useRouter();

  const onSubmit = async (data) => {
    if (mode === "create") {
      await createItem(data);
    } else {
      await updateItem({ id: initialData.id, ...data });
    }
    router.push("/dashboard/master/items");
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

## 🧭 Navigation Pattern

### Sidebar Integration

Update `lib/navigation-builder.ts`:

```typescript
export const MENU_TEMPLATE = {
  // ...
  subMenu: [
    {
      label: "Items",
      path: "/dashboard/master/items",
      icon: FiPackage,
      permission: "master.items",
      operation: "view",
    },
  ],
};
```

## 📊 Code Generation Pattern

### Auto-Generated Codes

```typescript
async function generateCode(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;
  
  const lastItem = await prisma.model.findFirst({
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

## 🎯 Best Practices

### 1. Always Check Permissions

```typescript
const canOperate = await hasPermission(userId, "master.module", "operation");
if (!canOperate) {
  return { success: false, error: "Permission denied" };
}
```

### 2. Use Transactions for Multi-Step Operations

```typescript
await prisma.$transaction(async (tx) => {
  // ... multiple operations
});
```

### 3. Validate Inputs

Always validate inputs using Zod schemas before database operations.

### 4. Handle Errors Gracefully

```typescript
try {
  // ... operation
} catch (error) {
  console.error("Error:", error);
  return { success: false, error: "User-friendly message" };
}
```

### 5. Log All Operations

Always log create, update, and delete operations for audit trail.

### 6. Send Notifications

Notify users of important operations (create, update, delete).

### 7. Revalidate Cache

Always revalidate cache after mutations.

### 8. Use Soft Delete

Prefer soft delete (`isTrash: true`) over permanent deletion.

### 9. Index Frequently Queried Fields

Add database indexes for:
- Status fields
- Foreign keys
- Searchable fields
- Frequently filtered fields

### 10. Document Your Code

Add JSDoc comments for all exported functions:

```typescript
/**
 * Get item by ID
 * @param itemId - Item ID
 * @returns Item with relations or null if not found
 */
export async function getItemById(itemId: string) {
  // ...
}
```

## 🔗 Related Documentation

- [Item Master](./ITEM_MASTER.md)
- [Category Module](./CATEGORY_MODULE.md)
- [Unit Module](./UNIT_MODULE.md)
- [API Reference](./API_REFERENCE.md)

---

**Last Updated**: January 2026
