# Codebase Analysis Report
**Date**: January 23, 2026  
**Purpose**: Comprehensive analysis of existing codebase structure, models, modules, permissions, and patterns

---

## 1. Prisma Database Models

### Total Models: 26

#### Authentication & User Management (6 models)
1. **User** - User accounts with role, permissions, and designation templates
   - Fields: id, name, email, password, role, status, designationTemplateId, permissions (JSON), inchargeId
   - Relations: Employee, PermissionTemplate, UserPermission, UserLog, Sessions, Accounts

2. **Account** - OAuth account linking (NextAuth)
   - Fields: id, userId, type, provider, providerAccountId, tokens
   - Relations: User

3. **Session** - User sessions
   - Fields: id, sessionToken, userId, expires
   - Relations: User

4. **VerificationToken** - Email verification tokens
   - Fields: identifier, token, expires

5. **PasswordReset** - Password reset tokens
   - Fields: id, email, code, expires, used

6. **UserLog** - User activity logging
   - Fields: id, userId, action, details, ipAddress, userAgent, createdAt
   - Relations: User

#### Business Entities (8 models)
7. **Employee** - Employee records
   - Fields: id, name, employeeCode, email, phone, userId, status
   - Relations: User, ChartOfAccount (salaryPayableAccount, advanceAccount)

8. **Client** - Customer management
   - Fields: id, name, email, phone, address, city, state, zip, country, company, image, clientCode, chartOfAccountId
   - Relations: User (creator), ChartOfAccount, JournalEntryLine, Voucher, VoucherLine

9. **Supplier** - Supplier management
   - Fields: id, name, email, phone, address, city, state, zip, country, company, image, supplierCode, chartOfAccountId
   - Relations: User (creator), ChartOfAccount, JournalEntryLine, Voucher, VoucherLine, Purchase

10. **Organization** - Organization/company records
    - Fields: id, name, details, address, phone, email, website, logo, status
    - Relations: User (creator), JournalEntryLine, Voucher, VoucherLine

11. **Category** - Categories (master data)
    - Fields: id, name, description, status

12. **Unit** - Units of measurement
    - Fields: id, details, symbol, status, createdBy
    - Relations: User (creator)

13. **Purchase** - Purchase orders
    - Fields: id, purchaseNumber, supplierId, date, status (DRAFT/APPROVED/PARTIALLY_RECEIVED/RECEIVED/CANCELLED), notes, attachmentUrl, subTotal, discount, tax, grandTotal, isTrash
    - Relations: Supplier, User (createdBy, updatedBy), PurchaseItem

14. **PurchaseItem** - Purchase order line items
    - Fields: id, purchaseId, itemId (nullable), description, quantity, unitPrice, amount
    - Relations: Purchase

#### Accounting Models (6 models)
15. **ChartOfAccount** - Chart of accounts hierarchy
    - Fields: id, code, name, type (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE), parentId, description, status
    - Relations: User (creator), CashBankAccount, Client, Supplier, Employee, JournalEntryLine, VoucherLine

16. **JournalEntry** - Journal entries
    - Fields: id, entryNumber, date, voucherId, description, status, createdBy, postedBy, postedAt
    - Relations: Voucher, JournalEntryLine

17. **JournalEntryLine** - Journal entry line items
    - Fields: id, lineNumber, debitAmount, creditAmount, description, journalEntryId, chartOfAccountId, clientId, supplierId, userId, organizationId
    - Relations: JournalEntry, ChartOfAccount, Client, Supplier, User, Organization

18. **Voucher** - Accounting vouchers
    - Fields: id, voucherNumber, date, type (PAYMENT/RECEIPT/JOURNAL/CONTRA/SALES/PURCHASE), reference, description, status, createdBy, postedById, postedAt, clientId, supplierId, userId, organizationId
    - Relations: User (createdBy, postedBy, userId), Client, Supplier, Organization, JournalEntry, VoucherLine

19. **VoucherLine** - Voucher line items
    - Fields: id, lineNumber, debitAmount, creditAmount, description, voucherId, chartOfAccountId, clientId, supplierId, userId, organizationId
    - Relations: Voucher, ChartOfAccount, Client, Supplier, User, Organization

20. **CashBankAccount** - Cash and bank accounts
    - Fields: id, chartOfAccountId, type (CASH/BANK), status, createdBy
    - Relations: ChartOfAccount, User (creator)

#### System Models (6 models)
21. **File** - File storage metadata
    - Fields: id, ownerId, name, path, storageKey, size, mimeType, isFolder, etag, metadata (JSON)
    - Relations: User (owner)

22. **Notification** - System notifications
    - Fields: id, title, message, type (SYSTEM/ADMIN/INFO/WARNING/ERROR/SUCCESS), userId, isRead, readAt, createdBy
    - Relations: User (creator, recipient)

23. **Settings** - Application settings (JSON-based)
    - Fields: id, userId, title, code, category, settings (JSON), isActive, isDefault, isGlobal, displayOrder, createdBy
    - Relations: User (creator, user)

24. **PermissionTemplate** - Permission templates (designation templates)
    - Fields: id, name, description, permissions (JSON), isActive
    - Relations: User[]

25. **UserPermission** - User permission overrides
    - Fields: id, userId, module, operations (JSON)
    - Relations: User
    - Unique: [userId, module]

26. **ModuleOperation** - Module operation definitions (for extensibility)
    - Fields: id, module, operation, label, description, isActive
    - Unique: [module, operation]

### Enums
- **AccountType**: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
- **VoucherType**: PAYMENT, RECEIPT, JOURNAL, CONTRA, SALES, PURCHASE
- **CashBankAccountType**: CASH, BANK
- **PurchaseStatus**: DRAFT, APPROVED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
- **NotificationType**: SYSTEM, ADMIN, INFO, WARNING, ERROR, SUCCESS

### Removed Models (Historical Reference)
The following models were removed in a previous cleanup:
- Quotation, WorkOrder, Section, ItemGroup, QuotationItem, Item, ItemCategory, CategoryGroup, ModuleGroup, ModuleGroupItem, CoverLetter

---

## 2. Existing Modules

### Module Structure
The application uses a **single routing architecture**:
- **`/dashboard/*`**: User routes (all authenticated users)

### Implemented Modules

#### 1. Dashboard Module ✅
- **Routes**: `/dashboard`
- **Status**: Fully Implemented
- **Features**: Admin dashboard with statistics, user dashboard with personalized view, recent activity tracking

#### 2. Master Data Module ✅
- **Routes**: 
  - `/dashboard/master/categories` - Categories management
  - `/dashboard/master/units` - Units management
- **Status**: Fully Implemented
- **Database Models**: Category, Unit
- **Features**: Full CRUD, soft delete (trash), search, filtering, pagination

#### 3. Purchases Module ✅
- **Routes**: 
  - `/dashboard/purchases` - User purchases view
- **Status**: Fully Implemented
- **Database Models**: Purchase, PurchaseItem
- **Features**: Purchase order creation, status tracking (DRAFT → APPROVED → PARTIALLY_RECEIVED → RECEIVED → CANCELLED), supplier integration, soft delete

#### 4. Accounts Module ✅
- **Routes**: 
  - `/dashboard/accounts/*` - Accounts routes
- **Status**: Fully Implemented
- **Sub-modules**:
  1. Chart of Accounts (`/accounts/chart-of-accounts`)
  2. Ledgers (`/accounts/ledgers`)
  3. Vouchers (`/accounts/vouchers`)
  4. Trial Balance (`/accounts/trial-balance`)
  5. Balance Sheet (`/accounts/balance-sheet`)
  6. Profit & Loss (`/accounts/profit-loss`)
  7. Cash & Bank (`/accounts/cash-bank`)
  8. Accounts Receivable (`/accounts/accounts-receivable`)
  9. Accounts Payable (`/accounts/accounts-payable`)
- **Database Models**: ChartOfAccount, JournalEntry, JournalEntryLine, Voucher, VoucherLine, CashBankAccount
- **Features**: Double-entry bookkeeping, account hierarchy, multiple voucher types, financial reports, auto-creation of AR/AP accounts for Clients/Suppliers

#### 5. Peoples Module ✅
- **Routes**: 
  - `/dashboard/users`, `/dashboard/clients`, `/dashboard/suppliers`, `/dashboard/employees`
- **Status**: Fully Implemented
- **Sub-modules**:
  1. Users (`/users`)
  2. Clients (`/clients`)
  3. Suppliers (`/suppliers`)
  4. Employees (`/employees`)
- **Database Models**: User, Client, Supplier, Employee
- **Features**: Full CRUD, code generation (clientCode, supplierCode, employeeCode), auto-creation of Chart of Accounts entries, Employee-User linking, permission management

#### 6. Files Module ✅
- **Routes**: `/dashboard/files`
- **Status**: Fully Implemented
- **Database Models**: File
- **Features**: File upload and management, folder support, storage key tracking, metadata support (MinIO integration)

#### 7. Notifications Module ✅
- **Routes**: 
  - `/dashboard/notifications`
- **Status**: Fully Implemented
- **Database Models**: Notification
- **Features**: Notification creation and management, read/unread status, notification types (SYSTEM, ADMIN, INFO, WARNING, ERROR, SUCCESS), user-specific notifications

#### 8. Settings Module ✅
- **Routes**: 
  - `/dashboard/settings` - Settings (admin-only)
- **Status**: Fully Implemented
- **Settings Sections** (16 total):
  1. Profile - User profile management
  2. Organization - Organization details
  3. Experience - Experience settings
  4. Accounts - Email, Calendar, WhatsApp, Telegram, SMS
  5. Backup - Database backup management
  6. Permissions - Permission templates and user permissions
  7. Tex - Tax settings
  8. Payment Methods - Payment method configuration
  9. Preferences - User preferences
  11. General - General notifications
  12. Members - Member management
  13. Security - Security settings
  14. APIs - API configuration
  15. Webhooks - Webhook management
- **Database Models**: Settings, Organization
- **Features**: JSON-based flexible settings storage, permission-based access control, organization management, integration settings

#### 9. Analytics Module 🟡
- **Routes**: `/dashboard/analytics`
- **Status**: Partially Implemented (routes defined, implementation status unknown)

#### 10. Reports Module 🟡
- **Routes**: `/dashboard/reports`
- **Status**: Partially Implemented (routes defined, implementation status unknown)

---

## 3. Roles & Permission System

### Role System
- **Admin Role**: 
  - Full access to all modules
  - Settings module is admin-only
  - **Note**: Even admins are subject to permission checks per requirements (no automatic bypass)

- **User Role**: 
  - Permission-based access
  - Can access `/dashboard` routes (except settings)
  - Permissions controlled via templates and user overrides

### Permission System Architecture

#### Database Models
1. **PermissionTemplate** - Stores designation templates (Manager, Sales Executive, Accounts, etc.)
   - Fields: id, name, description, permissions (JSON), isActive
   - Used for role-based permission assignment

2. **UserPermission** - Stores per-user permission overrides
   - Fields: id, userId, module, operations (JSON)
   - Unique constraint: [userId, module]
   - Stores ALL permissions for a user (not just overrides)

3. **User.permissions** - Cached merged permissions (JSON field)
   - Updated when template or user permissions change

#### Permission Structure

**Permission Key Format**: `{module}.{submodule}`
- Examples: `"master.categories"`, `"purchases.purchases"`, `"accounts.chart-of-accounts"`, `"peoples.users"`

**Permission Format** (Enhanced):
```typescript
{
  "master.categories": {
    navigationVisible: boolean,
    pageAccess: boolean,
    operations: Operation[]
  }
}
```

**Legacy Format** (still supported):
```typescript
{
  "master.categories": ["create", "view", "edit", "move-to-trash"]
}
```

#### Standard Operations
- `create` - Create new records
- `view` - View records
- `edit` - Edit records
- `move-to-trash` - Soft delete
- `delete-permanently` - Hard delete
- `export` - Export data
- `import` - Import data
- Custom operations per module (approve, send, duplicate, print, etc.)

#### Permission Utilities (`lib/permissions.ts`)
- `getUserPermissions(userId)` - Fetch and merge template + user permissions
- `hasPermission(userId, permissionKey, operation)` - Check specific permission
- `canAccessModule(userId, module)` - Check module access
- `canAccessPage(userId, permissionKey)` - Check page access
- `canSeeNavigation(userId, navigationId)` - Check navigation visibility
- `getPageOperations(userId, permissionKey)` - Get available operations
- `updateUserPermissions(userId, permissionKey, operations)` - Update user permissions
- `updateUserTemplate(userId, templateId)` - Update user's designation template
- `bulkUpdateUserPermissions(userId, permissions)` - Bulk update permissions

#### Permission Types (`types/permissions.ts`)
- **Modules**: dashboard, master, purchases, accounts, peoples, files, notifications, analytics, reports
- **Operations**: create, read, update, delete, export, import, approve, send, duplicate, print, view, edit, manage, move-to-trash, delete-permanently
- **Navigation Structure**: Maps sidebar items to pages and operations

#### Permission Flow
1. User is assigned a **PermissionTemplate** (designation template)
2. Template provides base permissions
3. **UserPermission** records can override template permissions per module
4. Merged permissions are cached in `User.permissions` JSON field
5. Permission checks use merged permissions

#### Navigation Visibility
- **Always Visible**: Dashboard, Profile, Settings (if user has permissions)
- **Permission-Based**: All other modules require explicit permissions
- If user has no permissions, only Dashboard and Profile are visible

---

## 4. UI Layout & Sidebar Structure

### Layout Architecture

#### Route Groups
- **`(auth)/`** - Authentication routes (login, registration)
- **`(dashboard)/`** - Protected routes
  - **`dashboard/`** - User routes
- **`(pages)/`** - Public pages
- **`actions/`** - Server actions (shared)
- **`api/`** - API routes

#### Layout Files
- `app/layout.tsx` - Root layout
- `app/(dashboard)/layout.tsx` - Dashboard layout wrapper
- `app/(dashboard)/dashboard/layout.tsx` - Dashboard layout
- `app/(auth)/layout.tsx` - Auth layout

### Sidebar Structure

#### Dashboard Sidebar (`components/dashboard/sidebar.tsx`)
- **Location**: `/dashboard/*` routes
- **Structure**: Dynamic menu built from `navigation-builder.ts` with permission filtering
- **Menu Items** (from `MENU_TEMPLATE`):
  1. Dashboard
  2. Master Data (with sub-menu: Categories, Units)
  3. Purchases (with sub-menu: Purchases)
  4. Accounts (with sub-menu groups: Setup, Transactions, Ledgers, Reports, Receivables, Payables)
  5. Peoples (with sub-menu: Users, Clients, Suppliers, Employees)
  6. Files
  7. Notifications
  8. Analytics
  9. Reports
- **Bottom Menu**: Profile, Settings

#### Navigation Builder (`lib/navigation-builder.ts`)
- **Purpose**: Builds filtered menu structure based on user permissions
- **Functions**:
  - `buildFilteredMenu(accessiblePages, visibleNavigations)` - Main function that filters menu
  - `getPermissionKeyFromPath(path)` - Maps path to permission key
- **Menu Template**: `MENU_TEMPLATE` - Single source of truth for menu items
- **Icon Mapping**: Icons stored as strings (e.g., "FiHome"), mapped to React components on client

#### Sidebar Features
- **Permission-Based Filtering**: Only shows menu items user has access to
- **Auto-Expand**: Automatically expands menus if current path matches sub-menu
- **Mobile Support**: Responsive sidebar with mobile drawer
- **Active State**: Highlights active menu items based on pathname
- **Sub-Menu Groups**: Supports grouped sub-menus (e.g., Accounts module)

### Component Structure

#### Dashboard Components (`components/dashboard/`)
- `sidebar.tsx` - Dashboard sidebar (dynamic)
- `sidebar-wrapper.tsx` - Dashboard sidebar wrapper
- `header.tsx` - Dashboard header
- `BreadcrumbNav.tsx` - Breadcrumb navigation

#### Settings Components (`components/settings/`)
- `settings-layout-wrapper.tsx` - Settings layout with navigation

#### Permission Components (`components/permissions/`)
- `permission-matrix.tsx` - Permission matrix UI
- `template-form.tsx` - Permission template form
- `templates-list.tsx` - Templates list
- `user-permissions-form.tsx` - User permissions form
- `page-guard.tsx` - Page-level permission guard

---

## 5. Naming Conventions & Patterns

### File Naming Conventions

#### Components
- **Format**: PascalCase
- **Examples**: `UserForm.tsx`, `ItemsList.tsx`, `BreadcrumbNav.tsx`
- **Location**: `_components/` folders (co-located with pages)

#### Server Actions
- **Format**: camelCase with `.action.tsx` suffix
- **Examples**: `user.action.tsx`, `purchase.action.tsx`, `category.action.tsx`
- **Location**: `_actions/` folders (co-located with pages)

#### Utilities
- **Format**: camelCase
- **Examples**: `formatters.ts`, `calculations.ts`, `permissions.ts`, `route-utils-server.ts`
- **Location**: `lib/` directory

#### Types
- **Format**: camelCase
- **Examples**: `permissions.ts`, `enums.ts`
- **Location**: `types/` directory

#### Pages
- **Format**: `page.tsx` (Next.js convention)
- **Location**: Route folders

#### Layouts
- **Format**: `layout.tsx` (Next.js convention)
- **Location**: Route folders

### Folder Structure Patterns

#### Route Structure
```
app/(dashboard)/
└── dashboard/                # User routes
    ├── [module]/
    │   ├── _actions/         # Server actions
    │   ├── _components/      # Components
    │   ├── [id]/             # Dynamic routes
    │   ├── add/              # Add pages
    │   └── page.tsx          # List page
    └── layout.tsx
```

#### Co-location Pattern
- **Server Actions**: `[module]/_actions/[module].action.tsx`
- **Components**: `[module]/_components/[component-name].tsx`
- **Pages**: `[module]/page.tsx`, `[module]/[id]/page.tsx`, `[module]/add/page.tsx`

### Code Patterns

#### Server Action Pattern
```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { hasPermission } from "@/lib/permissions";
import { createUserLog, LogAction } from "@/lib/user-log";
import { Prisma } from "@prisma/client";

export async function getEntities(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    // 1. Authentication check
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", entities: [], pagination: null };
    }

    // 2. Permission check (if needed)
    const canView = await hasPermission(session.user.id, "module.submodule", "view");
    if (!canView) {
      return { success: false, error: "Permission denied", entities: [], pagination: null };
    }

    // 3. Database query with pagination
    const skip = (page - 1) * limit;
    const where = {
      // ... filters
    };

    const [entities, total] = await Promise.all([
      prisma.entity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.entity.count({ where }),
    ]);

    // 4. Return result
    return {
      success: true,
      entities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("getEntities error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch entities",
      entities: [],
      pagination: null,
    };
  }
}
```

#### Create Action Pattern
```typescript
export async function createEntity(input: EntityInput) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", entity: null };
    }

    // 2. Permission check
    const canCreate = await hasPermission(session.user.id, "module.submodule", "create");
    if (!canCreate) {
      return { success: false, error: "Permission denied", entity: null };
    }

    // 3. Validation (Zod schema)
    const validated = schema.parse(input);

    // 4. Create entity
    const entity = await prisma.entity.create({
      data: {
        ...validated,
        createdBy: session.user.id,
        status: "active",
      },
    });

    // 5. User activity logging
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_CREATED,
      details: `Created entity: ${entity.name}`,
    });

    // 6. Revalidate paths
    revalidateBothPaths("module/submodule");

    // 7. Return result
    return { success: true, entity };
  } catch (error) {
    console.error("createEntity error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create entity",
      entity: null,
    };
  }
}
```

#### Transaction Pattern (for multi-step operations)
```typescript
const result = await prisma.$transaction(async (tx) => {
  // All operations use tx client
  const entity1 = await tx.entity1.create({ ... });
  const entity2 = await tx.entity2.create({ ... });
  return { entity1, entity2 };
});
```

#### Form Pattern (React Hook Form + Zod)
```typescript
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});

<form onSubmit={form.handleSubmit(onSubmit)}>
  <Input {...form.register('field')} />
  {form.formState.errors.field && <Error />}
</form>
```

### Import Organization
```typescript
// 1. React and Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// 3. Internal utilities
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

// 4. Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 5. Types
import type { User } from "@prisma/client";
```

### Route Utilities

#### Server-Side (`lib/route-utils-server.ts`)
- `getBasePath()` - Returns `/dashboard` for all users
- `getFullPath(path)` - Returns full path with dashboard base
- `revalidateBothPaths(path, type?)` - Revalidates dashboard paths

#### Client-Side (`lib/route-utils-client.ts`)
- `getBasePathFromRole(userRole)` - Returns `/dashboard` for all users
- `getBasePathFromPathname(pathname)` - Returns `/dashboard` from URL
- `getFullPathFromRole(path, userRole)` - Returns full path with dashboard base

### Error Handling Pattern
```typescript
try {
  // Operation
  return { success: true, data };
} catch (error) {
  console.error("operation error:", error);
  return {
    success: false,
    error: error instanceof Error ? error.message : "Operation failed",
  };
}
```

### Status Management
- **Standard Status Values**: `"active"`, `"inactive"`, `"trash"`
- **Soft Delete**: `isTrash` boolean field (default: false)
- **Status Filtering**: Most list queries support status filtering

### Code Generation Patterns
- **Client Code**: Auto-generated (e.g., `CLI-2026-0001`)
- **Supplier Code**: Auto-generated (e.g., `SUP-2026-0001`)
- **Employee Code**: Auto-generated (e.g., `EMP-2026-0001`)
- **Purchase Number**: Auto-generated (e.g., `PO-2026-0001`)
- **Voucher Number**: Auto-generated
- **Entry Number**: Auto-generated

---

## Summary Statistics

- **Total Prisma Models**: 26
- **Total Modules**: 10 (7 fully implemented, 2 partially)
- **Total Sub-modules**: 20+
- **Settings Sections**: 16
- **Permission Operations**: 15+ standard operations
- **Route Groups**: 1 (`/dashboard`)
- **Server Action Files**: 28+
- **Layout Files**: 4

---

**Last Updated**: January 23, 2026  
**Document Version**: 1.0.0
