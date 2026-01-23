# Implementation Plan: Category & Unit Modules
**Date**: January 23, 2026  
**Purpose**: Step-by-step plan to complete Category and Unit modules

---

## Overview

### Current Status
- **Category**: ✅ Model exists, ✅ Actions exist, ✅ UI exists, ❌ Missing permission checks
- **Unit**: ✅ Model exists, ❌ Actions missing, ❌ UI missing, ✅ Permissions defined

### Goals
1. Add permission checks to Category server actions
2. Create complete Unit module (CRUD + UI)
3. Ensure both modules follow existing patterns
4. Add page guards and navigation visibility
5. Ensure activity logging is in place

---

## Step-by-Step Implementation Plan

### Phase 1: Prisma Schema Updates

#### Step 1.1: Update Category Model (Optional Enhancement)
**File**: `startup-mvp/prisma/schema.prisma`

**Current Model**:
```prisma
model Category {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
  @@index([status])
}
```

**Proposed Enhancement** (optional - to match other models):
```prisma
model Category {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      String   @default("active")
  isTrash     Boolean  @default(false)  // NEW: Soft delete support
  createdBy   String                    // NEW: Audit trail
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  creator     User     @relation("CategoryCreator", fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([name])
  @@index([status])
  @@index([isTrash])
  @@index([createdBy])
}
```

**Decision**: 
- ✅ Add `isTrash` for consistency with other models
- ✅ Add `createdBy` for audit trail
- ⚠️ **Note**: This requires migration. If existing data exists, need default values.

#### Step 1.2: Update Unit Model (Optional Enhancement)
**File**: `startup-mvp/prisma/schema.prisma`

**Current Model**:
```prisma
model Unit {
  id        String   @id @default(cuid())
  details   String
  symbol    String   @unique
  status    String   @default("active")
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  creator   User     @relation("UnitCreator", fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([createdBy])
}
```

**Proposed Enhancement** (optional - to match other models):
```prisma
model Unit {
  id        String   @id @default(cuid())
  details   String
  symbol    String   @unique
  status    String   @default("active")
  isTrash   Boolean  @default(false)  // NEW: Soft delete support
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  creator   User     @relation("UnitCreator", fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([isTrash])
  @@index([createdBy])
}
```

**Decision**: 
- ✅ Add `isTrash` for consistency
- ✅ `createdBy` already exists (good!)

**Migration Required**: Yes (if adding `isTrash`)

---

### Phase 2: Category Module - Add Permission Checks

#### Step 2.1: Update Category Server Actions
**File**: `startup-mvp/app/(dashboard)/dashboard/master/categories/_actions/category.action.tsx`

**Changes Required**:
1. Import `hasPermission` from `@/lib/permissions`
2. Add permission checks to each function:
   - `getCategories()` → Check `"master.categories"` with `"view"`
   - `getCategoryById()` → Check `"master.categories"` with `"view"`
   - `createCategory()` → Check `"master.categories"` with `"create"`
   - `updateCategory()` → Check `"master.categories"` with `"edit"`
   - `deleteCategory()` → Check `"master.categories"` with `"move-to-trash"`
   - `deleteCategoriesPermanently()` → Check `"master.categories"` with `"delete-permanently"`
   - `bulkUpdateCategoryStatus()` → Check `"master.categories"` with `"edit"`

**Pattern to Follow**:
```typescript
// After auth check, before database operation
const canView = await hasPermission(session.user.id, "master.categories", "view");
if (!canView) {
  return {
    success: false,
    error: "You do not have permission to view categories",
    categories: [],
    pagination: { ... },
  };
}
```

**Files to Update**:
- `app/(dashboard)/dashboard/master/categories/_actions/category.action.tsx` ✅ (primary)
- `app/(dashboard)/dashboard/category/_actions/category.action.tsx` (legacy - update if still used)
- `app/(dashboard)/admin/category/_actions/category.action.tsx` (legacy - update if still used)

#### Step 2.2: Verify Category UI Pages
**Routes to Verify/Create**:
- `/dashboard/master/categories` ✅ (List page - exists)
- `/dashboard/master/categories/add` ❓ (Add page - verify exists)
- `/dashboard/master/categories/[id]` ❓ (Details page - verify exists)
- `/dashboard/master/categories/[id]/edit` ❓ (Edit page - verify exists)

**Actions**:
1. Check if add page exists, create if missing
2. Check if edit page exists, create if missing
3. Check if details page exists, create if missing
4. Add `PageGuard` to all pages
5. Update form component to use correct routes

#### Step 2.3: Add Page Guards to Category Pages
**Pattern**:
```typescript
import PageGuard from "@/components/permissions/page-guard";

export default async function CategoriesPage() {
  return (
    <PageGuard permissionKey="master.categories">
      {/* Page content */}
    </PageGuard>
  );
}
```

**Pages to Update**:
- `app/(dashboard)/dashboard/master/categories/page.tsx` (add PageGuard)
- `app/(dashboard)/dashboard/master/categories/add/page.tsx` (add PageGuard with `requiredOperation="create"`)
- `app/(dashboard)/dashboard/master/categories/[id]/page.tsx` (add PageGuard with `requiredOperation="view"`)
- `app/(dashboard)/dashboard/master/categories/[id]/edit/page.tsx` (add PageGuard with `requiredOperation="edit"`)

---

### Phase 3: Unit Module - Full Implementation

#### Step 3.1: Create Unit Server Actions
**File**: `startup-mvp/app/(dashboard)/dashboard/master/units/_actions/unit.action.tsx`

**Functions to Create** (following Category pattern):
1. `getUnits(page, limit, search, status)` - List with pagination
2. `getUnitById(unitId)` - Get single unit
3. `createUnit(input)` - Create new unit
4. `updateUnit(input)` - Update unit
5. `deleteUnit(unitId)` - Move to trash (soft delete)
6. `deleteUnitsPermanently(unitIds)` - Hard delete
7. `bulkUpdateUnitStatus(unitIds, status)` - Bulk status update

**Pattern to Follow** (from Category):
```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";

export async function getUnits(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", units: [], pagination: null };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "master.units", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view units",
        units: [],
        pagination: null,
      };
    }

    // ... rest of implementation
  } catch (error) {
    // ... error handling
  }
}
```

**Key Features**:
- ✅ Authentication check
- ✅ Permission check (all functions)
- ✅ User activity logging
- ✅ Path revalidation
- ✅ Search by `details` and `symbol`
- ✅ Status filtering (active/inactive/trash)
- ✅ Pagination
- ✅ Soft delete support (if `isTrash` added to model)

#### Step 3.2: Create Unit UI Components

##### Step 3.2.1: Unit List Component
**File**: `startup-mvp/app/(dashboard)/dashboard/master/units/_components/units.tsx`

**Pattern**: Copy from `categories.tsx` and adapt for Unit fields:
- `details` (name)
- `symbol` (unique identifier)
- `status`
- `createdAt`

**Features**:
- Search by details and symbol
- Status filtering (All, Active, Inactive, Trash)
- Bulk actions (activate, deactivate, trash, restore, delete permanently)
- Individual actions (view, edit, delete)
- Pagination

##### Step 3.2.2: Unit Form Component
**File**: `startup-mvp/app/(dashboard)/dashboard/master/units/_components/unitForm.tsx`

**Pattern**: Copy from `categoryForm.tsx` and adapt:
- `details` field (text input) - Unit name/description
- `symbol` field (text input) - Unit symbol (e.g., "kg", "L", "pcs")
- `status` field (select) - Active/Inactive

**Zod Schema**:
```typescript
const unitFormSchema = z.object({
  details: z.string().min(1, "Unit name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  status: z.enum(["active", "inactive"]),
});
```

**Validation**:
- Check if symbol already exists (unique constraint)
- Validate symbol format (optional: alphanumeric, max length)

#### Step 3.3: Create Unit UI Pages

##### Step 3.3.1: Unit List Page
**File**: `startup-mvp/app/(dashboard)/dashboard/master/units/page.tsx`

**Pattern**: Copy from `categories/page.tsx` and adapt:
- Use `getUnits()` action
- Check permissions: `view`, `edit`, `move-to-trash`, `delete-permanently`
- Render `UnitsListClient` component
- Add `PageGuard` wrapper

##### Step 3.3.2: Unit Add Page
**File**: `startup-mvp/app/(dashboard)/dashboard/master/units/add/page.tsx`

**Pattern**: Copy from `employees/add/page.tsx`:
```typescript
import React from "react";
import UnitForm from "../_components/unitForm";
import PageGuard from "@/components/permissions/page-guard";

export default function AddUnitPage() {
  return (
    <PageGuard permissionKey="master.units" requiredOperation="create">
      <div className="space-y-6">
        <UnitForm mode="create" />
      </div>
    </PageGuard>
  );
}
```

##### Step 3.3.3: Unit Edit Page
**File**: `startup-mvp/app/(dashboard)/dashboard/master/units/[id]/edit/page.tsx`

**Pattern**: 
- Fetch unit by ID using `getUnitById()`
- Pass to `UnitForm` with `mode="edit"`
- Add `PageGuard` with `requiredOperation="edit"`

##### Step 3.3.4: Unit Details Page (Optional)
**File**: `startup-mvp/app/(dashboard)/dashboard/master/units/[id]/page.tsx`

**Pattern**: Read-only view of unit details
- Fetch unit by ID
- Display all fields
- Add `PageGuard` with `requiredOperation="view"`

---

### Phase 4: Permissions & Navigation

#### Step 4.1: Verify Permission Keys
**File**: `startup-mvp/types/permissions.ts`

**Verify**:
- ✅ `master.categories` exists (line 366-370)
- ✅ `master.units` exists (line 372-376)

**Status**: Already defined ✅

#### Step 4.2: Verify Navigation Structure
**File**: `startup-mvp/types/permissions.ts`

**Verify**:
- ✅ Categories in `NAVIGATION_STRUCTURE` (line 366-370)
- ✅ Units in `NAVIGATION_STRUCTURE` (line 372-376)

**Status**: Already defined ✅

#### Step 4.3: Verify Sidebar Menu
**File**: `startup-mvp/lib/navigation-builder.ts`

**Verify**:
- ✅ Master Data menu exists (line 29-36)
- ✅ Categories sub-menu item exists (line 34)
- ✅ Units sub-menu item exists (line 35)

**Status**: Already defined ✅

**No changes needed** - Navigation already configured

---

### Phase 5: Activity Logging

#### Step 5.1: Verify Category Logging
**File**: `startup-mvp/app/(dashboard)/dashboard/master/categories/_actions/category.action.tsx`

**Status**: ✅ Already implemented
- `logItemCreated()` in `createCategory()`
- `logItemUpdated()` in `updateCategory()`
- `logItemDeleted()` in `deleteCategory()`

**No changes needed** ✅

#### Step 5.2: Add Unit Logging
**File**: `startup-mvp/app/(dashboard)/dashboard/master/units/_actions/unit.action.tsx`

**Add to each function**:
- `createUnit()` → `logItemCreated(session.user.id, "Unit", unit.id, unit.details, {...})`
- `updateUnit()` → `logItemUpdated(session.user.id, "Unit", unit.id, changes, unit.details, {...})`
- `deleteUnit()` → `logItemDeleted(session.user.id, "Unit", unitId, unit.details, {...})`

**Pattern** (from Category):
```typescript
await logItemCreated(
  session.user.id,
  "Unit",
  unit.id,
  unit.details,
  { details: unit.details, symbol: unit.symbol }
);
```

---

## Implementation Order

### Priority 1: Category Permission Checks (Quick Fix)
1. ✅ Update Category server actions with permission checks
2. ✅ Verify/add missing Category UI pages
3. ✅ Add PageGuard to Category pages

### Priority 2: Unit Module (Full Implementation)
1. ✅ Create Unit server actions (full CRUD)
2. ✅ Create Unit UI components (list, form)
3. ✅ Create Unit UI pages (list, add, edit, details)
4. ✅ Add PageGuard to all Unit pages
5. ✅ Add activity logging to Unit actions

### Priority 3: Schema Enhancements (Optional)
1. ⚠️ Add `isTrash` to Category model (if needed)
2. ⚠️ Add `createdBy` to Category model (if needed)
3. ⚠️ Add `isTrash` to Unit model (if needed)
4. ⚠️ Create and run migrations

---

## File Structure

### Category Module (Update Existing)
```
app/(dashboard)/dashboard/master/categories/
├── _actions/
│   └── category.action.tsx          [UPDATE: Add permission checks]
├── _components/
│   └── categories.tsx               [EXISTS ✅]
│   └── categoryForm.tsx             [CREATE: If missing]
├── [id]/
│   ├── page.tsx                     [CREATE: Details page]
│   └── edit/
│       └── page.tsx                 [CREATE: Edit page]
├── add/
│   └── page.tsx                     [CREATE: Add page]
└── page.tsx                         [UPDATE: Add PageGuard]
```

### Unit Module (Create New)
```
app/(dashboard)/dashboard/master/units/
├── _actions/
│   └── unit.action.tsx              [CREATE: Full CRUD]
├── _components/
│   ├── units.tsx                    [CREATE: List component]
│   └── unitForm.tsx                 [CREATE: Form component]
├── [id]/
│   ├── page.tsx                     [CREATE: Details page]
│   └── edit/
│       └── page.tsx                 [CREATE: Edit page]
├── add/
│   └── page.tsx                     [CREATE: Add page]
└── page.tsx                         [CREATE: List page]
```

---

## Code Patterns to Follow

### Server Action Pattern
```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";

export async function getEntities(...) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", ... };
    }

    // 2. Permission check
    const canView = await hasPermission(session.user.id, "master.units", "view");
    if (!canView) {
      return { success: false, error: "Permission denied", ... };
    }

    // 3. Database operation
    // ...

    // 4. Return result
    return { success: true, ... };
  } catch (error) {
    // Error handling
  }
}
```

### Form Component Pattern
```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  // fields
});

export default function EntityForm({ mode, initialData }: Props) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || { ... },
  });

  const onSubmit = async (data) => {
    // Call server action
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Page Pattern
```typescript
import PageGuard from "@/components/permissions/page-guard";
import { getEntities } from "./_actions/entity.action";
import { hasPermission } from "@/lib/permissions";
import { auth } from "@/lib/auth";

export default async function EntityPage({ searchParams }) {
  const session = await auth();
  const userId = session?.user?.id;

  const [result, canView, canEdit] = await Promise.all([
    getEntities(...),
    userId ? hasPermission(userId, "master.units", "view") : false,
    userId ? hasPermission(userId, "master.units", "edit") : false,
  ]);

  return (
    <PageGuard permissionKey="master.units">
      {/* Page content */}
    </PageGuard>
  );
}
```

---

## Testing Checklist

### Category Module
- [ ] Permission checks work in all server actions
- [ ] Page guards redirect unauthorized users
- [ ] List page shows only accessible items
- [ ] Add page requires "create" permission
- [ ] Edit page requires "edit" permission
- [ ] Delete requires "move-to-trash" permission
- [ ] Activity logs are created for all operations

### Unit Module
- [ ] List page displays units correctly
- [ ] Search works (by details and symbol)
- [ ] Status filtering works
- [ ] Pagination works
- [ ] Add page creates unit successfully
- [ ] Edit page updates unit successfully
- [ ] Delete moves to trash
- [ ] Permanent delete works
- [ ] Bulk actions work
- [ ] Permission checks work in all actions
- [ ] Page guards redirect unauthorized users
- [ ] Activity logs are created for all operations
- [ ] Symbol uniqueness is enforced

---

## Estimated Effort

- **Category Permission Checks**: 30 minutes
- **Category UI Pages** (if missing): 1 hour
- **Unit Server Actions**: 2-3 hours
- **Unit UI Components**: 2-3 hours
- **Unit UI Pages**: 1-2 hours
- **Schema Updates** (optional): 30 minutes + migration
- **Testing**: 1 hour

**Total**: ~8-10 hours

---

## Notes

1. **Schema Updates**: Adding `isTrash` and `createdBy` to Category is optional. Current implementation uses `status = "trash"` which works fine.

2. **Legacy Routes**: Category has routes in both `/master/categories` and `/category`. Should consolidate to `/master/categories` only.

3. **Unit Symbol Validation**: Consider adding validation for symbol format (e.g., max 10 chars, alphanumeric).

4. **Migration**: If adding `isTrash` to models, need to:
   - Create migration
   - Set default values for existing records
   - Update all queries to use `isTrash` instead of `status = "trash"`

5. **Permission Keys**: Already defined in `types/permissions.ts` - no changes needed.

6. **Navigation**: Already configured in `navigation-builder.ts` - no changes needed.

---

**Ready to implement?** This plan follows all existing patterns and conventions.
