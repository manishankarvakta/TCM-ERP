# User Permission System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [Permission Structure](#permission-structure)
5. [Permission Resolution Flow](#permission-resolution-flow)
6. [Permission Checking Functions](#permission-checking-functions)
7. [UI Components](#ui-components)
8. [Navigation Filtering](#navigation-filtering)
9. [Saving and Updating Permissions](#saving-and-updating-permissions)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The User Permission System is a **template-based role system** with **per-user overrides**. It provides fine-grained control over what users can access and what operations they can perform within the application.

### Key Features

- **Template-Based**: Users inherit permissions from reusable templates (e.g., "Manager", "Sales Executive")
- **Per-User Overrides**: Individual users can have custom permissions that override template permissions
- **Granular Control**: Permissions are set at the page/sub-page level with specific operations
- **Navigation Filtering**: Sidebar navigation automatically shows/hides items based on permissions
- **Page Protection**: Pages and actions are protected based on permission checks

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Permission System                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  Templates   │───▶│    Users     │───▶│  Overrides   │ │
│  │  (Base)      │    │  (Inherit)   │    │  (Custom)    │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
│         └────────────────────┼────────────────────┘         │
│                              │                               │
│                    ┌─────────▼─────────┐                    │
│                    │  Merged Permissions│                    │
│                    │   (Final State)    │                    │
│                    └─────────┬─────────┘                    │
│                              │                               │
│         ┌────────────────────┼────────────────────┐         │
│         │                    │                    │         │
│  ┌──────▼──────┐    ┌───────▼──────┐    ┌───────▼──────┐ │
│  │ Navigation  │    │ Page Access  │    │  Operations  │ │
│  │  Filtering  │    │  Control     │    │   Control     │ │
│  └─────────────┘    └──────────────┘    └───────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User selects template** → Template permissions loaded
2. **User modifies permissions** → Custom permissions saved
3. **System merges** → Template + Overrides = Final permissions
4. **Permissions checked** → Navigation, pages, and operations filtered
5. **UI updates** → Sidebar, buttons, links show/hide based on permissions

---

## Data Models

### Database Schema

#### PermissionTemplate
Stores reusable permission sets (designation templates).

```prisma
model PermissionTemplate {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?  @db.Text
  permissions Json     // Enhanced or legacy format
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       User[]   @relation("UserDesignationTemplate")
}
```

#### UserPermission
Stores per-user permission overrides. **All permissions are stored here** (not just differences).

```prisma
model UserPermission {
  id         String   @id @default(cuid())
  userId     String
  module     String   // Permission key (e.g., "items", "items.groups", "peoples.users")
  operations Json     // Array of operations: ["create", "view", "edit"] or []
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, module])
}
```

**Important**: 
- `module` field stores the full permission key (e.g., `"peoples.users"`, not just `"peoples"`)
- `operations` can be an empty array `[]` which means the permission is explicitly disabled
- All user permissions are stored here, not just overrides

#### User
References template and caches merged permissions.

```prisma
model User {
  id                   String         @id @default(cuid())
  designationTemplateId String?      // Reference to PermissionTemplate
  permissions          Json?         // Cached merged permissions (for performance)
  userPermissions      UserPermission[]
  designationTemplate  PermissionTemplate? @relation(...)
}
```

---

## Permission Structure

### Permission Key Format

Permission keys follow the pattern: `module.subModule` or just `module`

**Examples:**
- `items` - Full items module access
- `items.items` - Items list page
- `items.groups` - Groups sub-page
- `peoples.users` - Users management page
- `peoples.clients` - Clients page
- `quotations.quotations` - Quotations page

### Permission Formats

The system supports two permission formats for backward compatibility:

#### Legacy Format (Simple)
```typescript
{
  "items": ["create", "read", "update"],
  "items.groups": ["create", "read"],
  "peoples.users": ["view", "edit"]
}
```

#### Enhanced Format (Current)
```typescript
{
  "items.items": {
    navigationVisible: true,  // Show in sidebar
    pageAccess: true,         // Can access the page
    operations: ["create", "view", "edit"]
  },
  "peoples.users": {
    navigationVisible: false, // Hide from sidebar
    pageAccess: false,        // Cannot access page
    operations: []            // No operations allowed
  }
}
```

### PagePermission Interface

```typescript
interface PagePermission {
  navigationVisible: boolean; // Show in sidebar navigation
  pageAccess: boolean;         // Can access the page
  operations: Operation[];     // Available operations on the page
}
```

### Operations

**Standard Operations:**
- `create` - Create new records
- `view` - View records
- `edit` - Edit records
- `move-to-trash` - Soft delete
- `delete-permanently` - Hard delete

**Custom Operations:**
- `approve`, `send`, `duplicate`, `print`, `download`, `archive`, `restore`, `manage`, `export`, `import`

---

## Permission Resolution Flow

### Reading Permissions

When reading user permissions, the system follows this priority:

1. **UserPermission records** (if exist) → Use directly
2. **Template permissions** (if no UserPermission records) → Use template
3. **Convert to enhanced format** → Ensure consistent structure

**Code Location**: `lib/permissions.ts` → `getUserPermissions()`

```typescript
// Priority 1: UserPermission records (contains all permissions)
if (user.userPermissions && user.userPermissions.length > 0) {
  // Use UserPermission records directly
  for (const userPerm of user.userPermissions) {
    mergedPermissions[userPerm.module] = userPerm.operations;
  }
}
// Priority 2: Template permissions (fallback)
else if (user.designationTemplate?.permissions) {
  mergedPermissions = { ...templatePermissions };
}
```

### Permission Checking Priority

When checking if a page should be visible:

1. **Permission exists?** → If not, hide (`false`)
2. **navigationVisible === false?** → If yes, hide immediately (`false`)
3. **Has operations?** → If no operations, hide (`false`)
4. **Check access flags** → `navigationVisible === true` OR `pageAccess === true`

**Code Location**: `components/dashboard/sidebar-wrapper.tsx`

```typescript
// Step 1: Check if permission exists
if (!permissionExists) {
  accessiblePages.set(page.permissionKey, false);
  continue;
}

// Step 2: Check navigationVisible flag (highest priority)
if (pagePerm.navigationVisible === false) {
  accessiblePages.set(page.permissionKey, false);
  continue;
}

// Step 3: Check if operations exist
if (!hasOperations) {
  accessiblePages.set(page.permissionKey, false);
  continue;
}

// Step 4: Check access flags
const hasAccess = pagePerm.navigationVisible === true || 
                  pagePerm.pageAccess === true;
```

---

## Permission Checking Functions

### Core Functions

Located in: `lib/permissions.ts`

#### `getUserPermissions(userId: string)`
Returns user's merged permissions (template + overrides) in enhanced format.

```typescript
const permissions = await getUserPermissions(userId);
// Returns: Partial<EnhancedPermissions>
```

#### `getUserPermissionsEnhanced(userId: string)`
Cached version of `getUserPermissions` with Next.js cache.

#### `hasPermission(userId: string, permissionKey: string, operation: Operation)`
Check if user has a specific operation for a permission key.

```typescript
const canCreate = await hasPermission(userId, "items.items", "create");
```

#### `canAccessPage(userId: string, permissionKey: string)`
Check if user can access a specific page.

```typescript
const canAccess = await canAccessPage(userId, "peoples.users");
```

#### `canSeeNavigation(userId: string, navigationId: string)`
Check if user can see a navigation item in sidebar.

```typescript
const canSee = await canSeeNavigation(userId, "peoples");
```

#### `getPageOperations(userId: string, permissionKey: string)`
Get available operations for a specific page.

```typescript
const operations = await getPageOperations(userId, "items.items");
// Returns: ["create", "view", "edit"]
```

---

## UI Components

### Permission Management Components

#### PermissionMatrix
**Location**: `components/permissions/permission-matrix.tsx`

Visual grid for assigning permissions. Shows:
- Navigation items (expandable)
- Pages under each navigation
- Operations for each page (checkboxes)

**Key Features:**
- Hierarchical display (Navigation → Pages → Operations)
- Select all/deselect all for operations
- Real-time permission updates

#### UserPermissionsForm
**Location**: `components/permissions/user-permissions-form.tsx`

Form for editing user permissions. Includes:
- Template selector
- Reset button (restores template permissions)
- Permission matrix
- Save/Cancel buttons

#### TemplateSelector
**Location**: `components/permissions/template-selector.tsx`

Dropdown for selecting permission templates. Includes:
- "No Template" option (custom permissions)
- Reset button (when template selected)

### Protection Components

#### PageGuard
**Location**: `components/permissions/page-guard.tsx`

Server component that protects pages. Redirects if user doesn't have access.

```typescript
<PageGuard permissionKey="peoples.users" requiredOperation="view">
  <UserManagementPage />
</PageGuard>
```

#### ProtectedLink
**Location**: `components/permissions/protected-link.tsx`

Client component that conditionally shows links.

```typescript
<ProtectedLink 
  module="peoples" 
  operation="view" 
  href="/dashboard/users"
>
  Users
</ProtectedLink>
```

#### ProtectedButton
**Location**: `components/permissions/protected-button.tsx`

Client component that conditionally shows buttons.

```typescript
<ProtectedButton 
  module="items" 
  operation="create"
  onClick={handleCreate}
>
  Create Item
</ProtectedButton>
```

#### ProtectedAction
**Location**: `components/permissions/protected-action.tsx`

Client component for action buttons with permission checks.

```typescript
<ProtectedAction
  permissionKey="items.items"
  action="move-to-trash"
  onClick={handleDelete}
>
  Delete
</ProtectedAction>
```

---

## Navigation Filtering

### How Navigation Filtering Works

1. **Build Accessible Pages Map**
   - Iterate through all pages in `NAVIGATION_STRUCTURE`
   - Check each page's permission
   - Set `accessiblePages[permissionKey] = true/false`

2. **Filter Navigation Items**
   - Check if parent navigation is visible (`canSeeNavigation`)
   - Filter sub-menu items based on `accessiblePages` map
   - Only show parent if it has at least one accessible sub-item

3. **Sub-Page Filtering**
   - Map each sub-menu item's path to permission key
   - Check `accessiblePages.get(permissionKey) === true`
   - Hide if `false` or `undefined`

**Code Location**: 
- `components/dashboard/sidebar-wrapper.tsx` - Builds accessible pages map
- `components/dashboard/sidebar.tsx` - Filters navigation items

### Example: Peoples Navigation

If user has permissions for:
- ✅ `peoples.clients` (navigationVisible: true, operations: ["view", "edit"])
- ✅ `peoples.suppliers` (navigationVisible: true, operations: ["view"])
- ❌ `peoples.users` (navigationVisible: false, operations: [])

**Result:**
- "Peoples" navigation shows (because at least one sub-page has permissions)
- "Clients" shows in sidebar
- "Suppliers" shows in sidebar
- "Users" is hidden (navigationVisible: false)

---

## Saving and Updating Permissions

### Saving Flow

1. **User selects template** (optional)
   - Template permissions loaded into form
   - User can modify individual permissions

2. **User modifies permissions**
   - Changes made in PermissionMatrix
   - Permissions stored in enhanced format

3. **Save action**
   - Convert enhanced format to legacy format
   - Save ALL permissions to `UserPermission` table
   - Delete permissions not in the new list
   - Update cached permissions in User record
   - Revalidate Next.js cache

**Code Location**: `app/actions/permission.action.tsx` → `updateUserPermissionsAction()`

### Reset to Template

When user clicks "Reset" button:
1. Load template permissions
2. Save all template permissions to `UserPermission` table
3. Delete permissions not in template
4. Update UI

**Code Location**: `app/actions/permission.action.tsx` → `resetUserPermissionsToTemplate()`

### Important Notes

- **All permissions are saved**: Not just differences, but all permissions
- **Empty operations = disabled**: If `operations: []`, permission is explicitly disabled
- **Cleanup on save**: Permissions not in the new list are deleted from database
- **Cache invalidation**: Next.js cache is revalidated after save

---

## Best Practices

### 1. Permission Key Naming

Use consistent naming: `module.subModule`

```typescript
// Good
"items.groups"
"peoples.users"
"quotations.invoices"

// Bad
"itemsGroups"
"users"
"invoices"
```

### 2. Setting Permissions

Always set all three flags when creating permissions:

```typescript
{
  navigationVisible: true,  // Show in sidebar
  pageAccess: true,         // Allow page access
  operations: ["view", "edit"] // Available operations
}
```

### 3. Disabling Permissions

To disable a permission, set:

```typescript
{
  navigationVisible: false,
  pageAccess: false,
  operations: []
}
```

### 4. Using Protection Components

Always use protection components instead of manual checks:

```typescript
// Good
<ProtectedLink module="items" operation="view" href="/dashboard/items">
  Items
</ProtectedLink>

// Bad
{hasPermission && <Link href="/dashboard/items">Items</Link>}
```

### 5. Server vs Client Components

- **Server components**: Use `PageGuard` for page-level protection
- **Client components**: Use `ProtectedLink`, `ProtectedButton`, `ProtectedAction`

---

## Troubleshooting

### Issue: Permission not working

**Check:**
1. Is permission saved in database? (Check `UserPermission` table)
2. Is `navigationVisible` set correctly?
3. Are operations array not empty?
4. Is cache cleared? (Try hard refresh: Ctrl+Shift+R)

### Issue: Navigation item showing when it shouldn't

**Check:**
1. `navigationVisible` flag - should be `false` to hide
2. `operations` array - should be empty `[]` to disable
3. Permission key mapping - verify path maps to correct permission key

### Issue: Sub-page showing when unchecked

**Check:**
1. Is permission in `accessiblePages` map? (Should be `false`)
2. Is filtering logic applied? (Check `sidebar.tsx` filtering)
3. Is `navigationVisible === false` being checked? (Check `sidebar-wrapper.tsx`)

### Issue: Template permissions not applying

**Check:**
1. Is template assigned to user? (Check `User.designationTemplateId`)
2. Are UserPermission records empty? (If not, they override template)
3. Is template active? (Check `PermissionTemplate.isActive`)

### Debug Checklist

1. ✅ Check database: `UserPermission` table has correct data
2. ✅ Check permissions object: `getUserPermissions()` returns expected data
3. ✅ Check accessiblePages map: All pages have `true` or `false` values
4. ✅ Check navigation filtering: Sub-items are filtered correctly
5. ✅ Clear cache: Hard refresh browser and Next.js cache

---

## File Reference

### Core Files

- `lib/permissions.ts` - Core permission checking functions
- `types/permissions.ts` - Type definitions and constants
- `app/actions/permission.action.tsx` - Server actions for CRUD operations

### UI Components

- `components/permissions/permission-matrix.tsx` - Permission assignment UI
- `components/permissions/user-permissions-form.tsx` - User permission form
- `components/permissions/template-selector.tsx` - Template selector
- `components/permissions/template-form.tsx` - Template creation/editing
- `components/permissions/page-guard.tsx` - Page protection
- `components/permissions/protected-link.tsx` - Link protection
- `components/permissions/protected-button.tsx` - Button protection
- `components/permissions/protected-action.tsx` - Action protection

### Navigation

- `components/dashboard/sidebar-wrapper.tsx` - Builds accessible pages map
- `components/dashboard/sidebar.tsx` - Renders filtered navigation

### Database

- `prisma/schema.prisma` - Database schema definitions

---

## Version History

- **v2.0** - Enhanced permission format with `navigationVisible` and `pageAccess` flags
- **v1.0** - Legacy format with operations array only

---

## Additional Resources

- See `docs/PERMISSION_SYSTEM_IMPLEMENTATION.md` for implementation details
- See `types/permissions.ts` for complete type definitions
- See `NAVIGATION_STRUCTURE` in `types/permissions.ts` for navigation configuration

