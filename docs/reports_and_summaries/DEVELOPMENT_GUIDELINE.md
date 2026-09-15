# Development Guideline
**Project**: Ferrari Fashion  ERP System  
**Version**: 1.0.1  
**Last Updated**: January 2025  
**Purpose**: Comprehensive guide for developers working on this project

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Coding Patterns & Conventions](#coding-patterns--conventions)
5. [Server Actions Pattern](#server-actions-pattern)
6. [Form Implementation Pattern](#form-implementation-pattern)
7. [Component Patterns](#component-patterns)
8. [Permission System](#permission-system)
9. [Routing & Navigation](#routing--navigation)
10. [Database Patterns](#database-patterns)
11. [Error Handling](#error-handling)
12. [Best Practices](#best-practices)
13. [Testing Guidelines](#testing-guidelines)
14. [Deployment Guidelines](#deployment-guidelines)

---

## 🎯 Project Overview

### Application Type
Full-featured ERP (Enterprise Resource Planning) system for business management.

### Key Features
- Multi-module business management (Items, Quotations, Accounts, Purchases, Manufacturing, Inventory)
- Role-based access control with granular permissions
- Dual routing system (Admin and Dashboard)
- Master data management
- File management with MinIO
- Real-time notifications
- Backup and restore functionality

---

## 🛠️ Technology Stack

### Core Framework
- **Next.js**: 16.0.0 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.x (strict mode enabled)
- **Node.js**: 18+

### Database & ORM
- **PostgreSQL**: Database
- **Prisma**: 6.18.0 (ORM)
- **Prisma Client**: Auto-generated from schema

### Authentication & Security
- **NextAuth.js**: 5.0.0-beta.29
- **bcryptjs**: Password hashing
- **Session Management**: Database-backed

### UI & Styling
- **Tailwind CSS**: 4.x
- **shadcn/ui**: Component library (Radix UI primitives)
- **Framer Motion**: Animations
- **Lucide React**: Icons
- **React Icons**: Additional icons

### Form Management
- **React Hook Form**: 7.65.0
- **Zod**: 4.1.12 (Schema validation)
- **@hookform/resolvers**: Zod resolver integration

### State Management
- **Redux Toolkit**: 2.9.2 (for quotations module)
- **React Hooks**: useState, useTransition (for other modules)
- **Redux Persist**: 6.0.0 (for quotations state persistence)

### Storage & Caching
- **MinIO**: S3-compatible object storage
- **Redis (ioredis)**: 5.8.2 (Caching and sessions)

### Additional Libraries
- **date-fns**: Date manipulation
- **jsPDF + jsPDF-autotable**: PDF generation
- **@dnd-kit**: Drag and drop
- **nodemailer**: Email sending

---

## 📁 Project Structure

### Directory Layout

```
startup-mvp/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication routes
│   │   ├── login/
│   │   ├── registration/
│   │   └── auth/
│   ├── (dashboard)/             # Protected routes
│   │   ├── admin/               # Admin-only routes
│   │   │   ├── [module]/
│   │   │   │   ├── _actions/    # Server actions
│   │   │   │   ├── _components/ # Module components
│   │   │   │   ├── [id]/        # Detail/edit pages
│   │   │   │   ├── add/         # Create pages
│   │   │   │   └── page.tsx     # List page
│   │   └── dashboard/            # User routes (admin can access)
│   │       └── [same structure]
│   ├── (pages)/                 # Public pages
│   ├── actions/                 # Global server actions
│   └── api/                     # API routes
├── components/                   # React components
│   ├── admin/                   # Admin-specific components
│   ├── dashboard/               # Dashboard components
│   ├── forms/                   # Form components
│   ├── permissions/             # Permission components
│   ├── ui/                      # shadcn/ui components
│   └── [feature]/               # Feature-specific components
├── lib/                         # Utility libraries
│   ├── auth.ts                  # NextAuth configuration
│   ├── prisma.ts                # Prisma client
│   ├── permissions.ts           # Permission utilities
│   ├── route-utils-server.ts    # Server-side routing
│   ├── route-utils-client.ts    # Client-side routing
│   └── utils/                   # Helper functions
├── prisma/                      # Database
│   ├── schema.prisma            # Database schema
│   ├── migrations/              # Migration files
│   └── seed.ts                  # Seed script
├── types/                       # TypeScript types
│   └── permissions.ts           # Permission types
├── hooks/                       # Custom React hooks
├── public/                      # Static assets
└── tests/                       # Test files
```

### Key Conventions

1. **Route Groups**: `(auth)`, `(dashboard)`, `(pages)` - organize routes without affecting URLs
2. **Co-located Actions**: `_actions/` folder in module directories
3. **Co-located Components**: `_components/` folder in module directories
4. **Private Folders**: Folders starting with `_` are not routes

---

## 💻 Coding Patterns & Conventions

### TypeScript Standards

#### Strict TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

#### Type Definitions
- Always define types for function parameters and return values
- Use Prisma types where possible: `import { User } from "@prisma/client"`
- Create custom types in `types/` directory
- Use `z.infer<typeof schema>` for form data types

#### Example:
```typescript
// ✅ Good
interface UserFormData {
  name: string;
  email: string;
  role: "user" | "admin";
}

// ❌ Bad
function createUser(data: any) { }
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `UserForm.tsx`, `ItemsList.tsx`)
- **Server Actions**: camelCase with `.action.tsx` suffix (e.g., `user.action.tsx`)
- **Utilities**: camelCase (e.g., `formatters.ts`, `calculations.ts`)
- **Types**: camelCase (e.g., `permissions.ts`, `quotation.ts`)
- **Pages**: `page.tsx` (Next.js convention)
- **Layouts**: `layout.tsx` (Next.js convention)

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

// 4. Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 5. Types
import type { User } from "@prisma/client";
```

---

## 🔧 Server Actions Pattern

### Standard Server Action Structure

All server actions follow this pattern:

```typescript
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { hasPermission } from "@/lib/permissions";
import { createUserLog, LogAction } from "@/lib/user-log";
import { Prisma } from "@prisma/client";

/**
 * Get paginated list of entities with search
 */
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
      return {
        success: false,
        error: "Unauthorized",
        entities: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }

    // 2. Permission check (if needed)
    const canView = await hasPermission(
      session.user.id,
      "module.submodule",
      "read"
    ) || await hasPermission(
      session.user.id,
      "module.submodule",
      "view"
    );

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view entities",
        entities: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }

    // 3. Build query
    const skip = (page - 1) * limit;
    const where: Prisma.EntityWhereInput = {};

    // Search
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Status filter
    if (status === "trash") {
      where.status = "trash";
    } else if (status === "active") {
      where.status = "active";
    } else if (status === "inactive") {
      where.status = "inactive";
    } else if (status === "all") {
      where.status = { not: "trash" };
    }

    // 4. Execute query
    const total = await prisma.entity.count({ where });
    const entities = await prisma.entity.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    // 5. Return result
    return {
      success: true,
      entities,
      pagination: { page, limit, total, totalPages },
    };
  } catch (error) {
    console.error("getEntities error:", error);
    return {
      success: false,
      error: "Failed to fetch entities",
      entities: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}
```

### Create Action Pattern

```typescript
export async function createEntity(input: {
  code: string;
  name: string;
  // ... other fields
}) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", entity: null };
    }

    // 2. Permission check
    const canCreate = await hasPermission(
      session.user.id,
      "module.submodule",
      "create"
    );
    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create entities",
        entity: null,
      };
    }

    // 3. Validation (if needed beyond Zod)
    // Check for duplicates, etc.

    // 4. Create entity
    const entity = await prisma.entity.create({
      data: {
        ...input,
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

### Update Action Pattern

```typescript
export async function updateEntity(
  entityId: string,
  input: Partial<EntityData>
) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Permission check
    const canEdit = await hasPermission(
      session.user.id,
      "module.submodule",
      "edit"
    ) || await hasPermission(
      session.user.id,
      "module.submodule",
      "update"
    );
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to edit entities",
      };
    }

    // 3. Check if entity exists
    const existing = await prisma.entity.findUnique({
      where: { id: entityId },
    });
    if (!existing) {
      return { success: false, error: "Entity not found" };
    }

    // 4. Update entity
    const entity = await prisma.entity.update({
      where: { id: entityId },
      data: input,
    });

    // 5. User activity logging
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Updated entity: ${entity.name}`,
    });

    // 6. Revalidate paths
    revalidateBothPaths("module/submodule");

    return { success: true, entity };
  } catch (error) {
    console.error("updateEntity error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update entity",
    };
  }
}
```

### Delete Action Pattern

```typescript
export async function deleteEntityPermanently(entityIds: string[]) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Permission check
    const canDelete = await hasPermission(
      session.user.id,
      "module.submodule",
      "delete-permanently"
    );
    if (!canDelete) {
      return {
        success: false,
        error: "You do not have permission to delete entities",
      };
    }

    // 3. Check usage (prevent deletion if used)
    for (const id of entityIds) {
      const isUsed = await checkEntityIsUsed(id);
      if (isUsed) {
        return {
          success: false,
          error: "Cannot delete entity that is in use",
        };
      }
    }

    // 4. Delete entities
    await prisma.entity.deleteMany({
      where: { id: { in: entityIds } },
    });

    // 5. User activity logging
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
      details: `Deleted ${entityIds.length} entity/entities`,
    });

    // 6. Revalidate paths
    revalidateBothPaths("module/submodule");

    return { success: true };
  } catch (error) {
    console.error("deleteEntityPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete entities",
    };
  }
}
```

### Server Action Response Type

```typescript
type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// For list actions
type ListActionResult<T> = {
  success: boolean;
  entities: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
};
```

---

## 📝 Form Implementation Pattern

### Standard Form Structure

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiAlertCircle } from "react-icons/fi";
import { createEntity, updateEntity } from "../_actions/entity.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";

// 1. Define Zod schema
const entityFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  status: z.enum(["active", "inactive"]),
  description: z.string().optional().or(z.literal("")),
});

type EntityFormData = z.infer<typeof entityFormSchema>;

interface EntityFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    name: string;
    status: string;
    description: string | null;
  };
}

export default function EntityForm({ mode, initialData }: EntityFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const basePath = getBasePathFromPathname(pathname);

  // 2. Initialize form
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
  } = useForm<EntityFormData>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: initialData
      ? {
          code: initialData.code,
          name: initialData.name,
          status: initialData.status as "active" | "inactive",
          description: initialData.description || "",
        }
      : {
          code: "",
          name: "",
          status: "active",
          description: "",
        },
  });

  // 3. Handle form submission
  const onSubmit = async (data: EntityFormData) => {
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "create") {
        result = await createEntity(data);
      } else {
        result = await updateEntity(initialData!.id, data);
      }

      if (result.success) {
        router.push(`${basePath}/module/submodule`);
        router.refresh();
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  // 4. Render form
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Create Entity" : "Edit Entity"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <FiAlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              {...register("code")}
              disabled={loading}
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name")}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Select with Controller */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          {/* Submit button */}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : mode === "create" ? "Create" : "Update"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

### Form Best Practices

1. **Always use Zod for validation**
2. **Use React Hook Form for form state**
3. **Use Controller for complex inputs** (Select, Checkbox, etc.)
4. **Show loading states** during submission
5. **Display error messages** clearly
6. **Handle both create and edit modes** in the same component
7. **Use `getBasePathFromPathname`** for navigation
8. **Call `router.refresh()`** after successful mutations

---

## 🧩 Component Patterns

### Server Component (Page)

```typescript
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import EntityListClient from "./_components/entity-list-client";
import { getEntities } from "./_actions/entity.action";

interface EntitiesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function EntitiesPage({ searchParams }: EntitiesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = (params.status || "all") as "active" | "inactive" | "all";

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions
  const [result, canView, canCreate, canEdit] = await Promise.all([
    getEntities(page, 10, search, status),
    userId ? hasPermission(userId, "module.submodule", "view") : false,
    userId ? hasPermission(userId, "module.submodule", "create") : false,
    userId ? hasPermission(userId, "module.submodule", "edit") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load entities"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="module.submodule">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Entities</h1>
            <p className="text-sm text-muted-foreground">
              Manage your entities
            </p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href={`${basePath}/module/submodule/add`}>
                Add Entity
              </Link>
            </Button>
          )}
        </div>

        <EntityListClient
          initialEntities={result.entities}
          initialPagination={result.pagination}
          initialSearch={search}
          permissions={{ view: canView, create: canCreate, edit: canEdit }}
        />
      </div>
    </PageGuard>
  );
}
```

### Client Component (List View)

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import ProtectedAction from "@/components/permissions/protected-action";

interface EntityListClientProps {
  initialEntities: Entity[];
  initialPagination: Pagination;
  initialSearch: string;
  permissions?: {
    view: boolean;
    create: boolean;
    edit: boolean;
  };
}

export default function EntityListClient({
  initialEntities = [],
  initialPagination,
  initialSearch,
  permissions,
}: EntityListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/dashboard/module/submodule?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      const result = await deleteEntity(id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Entity deleted successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete entity",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search entities..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialEntities.map((entity) => (
            <TableRow key={entity.id}>
              <TableCell>{entity.code}</TableCell>
              <TableCell>{entity.name}</TableCell>
              <TableCell>
                <Badge variant={entity.status === "active" ? "default" : "secondary"}>
                  {entity.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <ProtectedAction
                    permissionKey="module.submodule"
                    action="edit"
                    href={`/dashboard/module/submodule/${entity.id}/edit`}
                  >
                    Edit
                  </ProtectedAction>
                  <ProtectedAction
                    permissionKey="module.submodule"
                    action="delete-permanently"
                    onClick={() => handleDelete(entity.id)}
                  >
                    Delete
                  </ProtectedAction>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {initialPagination.page} of {initialPagination.totalPages} pages
        </p>
        {/* Pagination controls */}
      </div>
    </div>
  );
}
```

---

## 🔐 Permission System

### Permission Structure

Permissions follow the pattern: `module.submodule` (e.g., `items.groups`, `accounts.vouchers`)

### Operations

- **Standard Operations**: `create`, `view`, `edit`, `move-to-trash`, `delete-permanently`
- **Custom Operations**: `approve`, `export`, `import`, etc.

### Permission Checks

#### In Server Actions

```typescript
// Check permission before operation
const canView = await hasPermission(
  userId,
  "module.submodule",
  "read"
) || await hasPermission(
  userId,
  "module.submodule",
  "view"
);

if (!canView) {
  return {
    success: false,
    error: "You do not have permission to view entities",
  };
}
```

#### In Components

```typescript
// PageGuard (Server Component)
<PageGuard permissionKey="module.submodule">
  {children}
</PageGuard>

// ProtectedAction (Client Component)
<ProtectedAction
  permissionKey="module.submodule"
  action="edit"
  href="/dashboard/module/submodule/123/edit"
>
  Edit
</ProtectedAction>

// ProtectedLink (Client Component)
<ProtectedLink
  module="module"
  operation="view"
  href="/dashboard/module/submodule"
>
  View Entities
</ProtectedLink>
```

### Admin Bypass

Admin users automatically bypass all permission checks:

```typescript
const isAdmin = session.user.role?.toLowerCase() === "admin";
if (isAdmin) {
  // Skip permission checks
  return <>{children}</>;
}
```

---

## 🛣️ Routing & Navigation

### Dual Routing System

The application uses two route prefixes:
- `/admin/*` - Admin-only routes
- `/dashboard/*` - User routes (admin can also access)

### Route Utilities

#### Server-Side

```typescript
import { revalidateBothPaths } from "@/lib/route-utils-server";

// Revalidate both admin and dashboard paths
revalidateBothPaths("module/submodule");
```

#### Client-Side

```typescript
import { getBasePathFromPathname } from "@/lib/route-utils-client";

const pathname = usePathname();
const basePath = getBasePathFromPathname(pathname);
// Returns "/admin" or "/dashboard"
```

### Navigation Pattern

```typescript
// Always use basePath for navigation
const basePath = getBasePathFromPathname(pathname);
router.push(`${basePath}/module/submodule/add`);
```

---

## 🗄️ Database Patterns

### Prisma Client Usage

```typescript
import { prisma } from "@/lib/prisma";

// Always use the singleton instance from lib/prisma.ts
// Never create new PrismaClient instances
```

### Query Patterns

#### Pagination

```typescript
const skip = (page - 1) * limit;
const entities = await prisma.entity.findMany({
  skip,
  take: limit,
  orderBy: { createdAt: "desc" },
});
```

#### Search

```typescript
const where: Prisma.EntityWhereInput = {};
if (search) {
  where.OR = [
    { code: { contains: search, mode: "insensitive" } },
    { name: { contains: search, mode: "insensitive" } },
  ];
}
```

#### Status Filtering

```typescript
if (status === "trash") {
  where.status = "trash";
} else if (status === "active") {
  where.status = "active";
} else if (status === "all") {
  where.status = { not: "trash" };
}
```

#### Relations

```typescript
const entity = await prisma.entity.findUnique({
  where: { id },
  include: {
    relation1: true,
    relation2: {
      select: {
        id: true,
        name: true,
      },
    },
  },
});
```

### Transactions

```typescript
await prisma.$transaction(async (tx) => {
  // Multiple operations
  const entity1 = await tx.entity1.create({ data: {...} });
  const entity2 = await tx.entity2.create({
    data: { ...data, entity1Id: entity1.id },
  });
  return { entity1, entity2 };
});
```

### Soft Delete Pattern

```typescript
// Move to trash
await prisma.entity.update({
  where: { id },
  data: { status: "trash" },
});

// Restore
await prisma.entity.update({
  where: { id },
  data: { status: "active" },
});

// Delete permanently
await prisma.entity.delete({
  where: { id },
});
```

---

## ⚠️ Error Handling

### Server Action Error Handling

```typescript
export async function someAction() {
  try {
    // Operation
    return { success: true, data };
  } catch (error) {
    console.error("someAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Operation failed",
    };
  }
}
```

### Client-Side Error Handling

```typescript
const [error, setError] = useState<string>("");

try {
  const result = await someAction();
  if (!result.success) {
    setError(result.error || "Operation failed");
  }
} catch (err) {
  setError(err instanceof Error ? err.message : "Operation failed");
}
```

### Error Display

```typescript
{error && (
  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
    <div className="flex items-center gap-2 text-destructive">
      <FiAlertCircle className="h-4 w-4" />
      <p className="text-sm">{error}</p>
    </div>
  </div>
)}
```

### Toast Notifications

```typescript
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

// Success
toast({
  title: "Success",
  description: "Operation completed successfully",
});

// Error
toast({
  title: "Error",
  description: "Operation failed",
  variant: "destructive",
});
```

---

## ✅ Best Practices

### 1. Code Organization

- ✅ Keep server actions in `_actions/` folders
- ✅ Keep components in `_components/` folders
- ✅ Use co-location (keep related files together)
- ✅ Separate admin and dashboard actions if needed
- ✅ Share components between admin and dashboard when possible

### 2. Type Safety

- ✅ Always define types for function parameters
- ✅ Use Prisma types where possible
- ✅ Avoid `any` types
- ✅ Use `z.infer<typeof schema>` for form types

### 3. Performance

- ✅ Use Server Components by default
- ✅ Use Client Components only when needed (interactivity, hooks)
- ✅ Implement pagination for large lists
- ✅ Use `useTransition` for non-urgent updates
- ✅ Cache permissions with `unstable_cache`

### 4. Security

- ✅ Always check authentication in server actions
- ✅ Always check permissions before operations
- ✅ Validate input with Zod schemas
- ✅ Use parameterized queries (Prisma handles this)
- ✅ Never expose sensitive data in client components

### 5. User Experience

- ✅ Show loading states during operations
- ✅ Provide clear error messages
- ✅ Use toast notifications for feedback
- ✅ Implement optimistic updates where appropriate
- ✅ Handle edge cases gracefully

### 6. Code Reusability

- ✅ Create reusable components
- ✅ Extract common logic to utilities
- ✅ Use shared server actions when possible
- ✅ Follow DRY (Don't Repeat Yourself) principle

### 7. Testing

- ✅ Test server actions
- ✅ Test form validation
- ✅ Test permission checks
- ✅ Test error handling

---

## 🧪 Testing Guidelines

### Unit Tests

```typescript
// tests/unit/entity.test.ts
import { describe, it, expect } from "vitest";
import { createEntity } from "@/app/actions/entity.action";

describe("createEntity", () => {
  it("should create entity with valid data", async () => {
    const result = await createEntity({
      code: "TEST001",
      name: "Test Entity",
    });
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

Test complete workflows:
- Create → Read → Update → Delete
- Permission checks
- Error scenarios

---

## 🚀 Deployment Guidelines

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXTAUTH_URL` - Application URL
- `MINIO_ENDPOINT` - MinIO endpoint
- `MINIO_ACCESS_KEY` - MinIO access key
- `MINIO_SECRET_KEY` - MinIO secret key
- `REDIS_URL` - Redis connection string (optional)

### Build Process

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Run migrations
npx prisma migrate deploy

# 4. Build application
npm run build

# 5. Start production server
npm start
```

### Database Migrations

- ✅ Always create migration files for schema changes
- ✅ Never use `prisma db push` in production
- ✅ Use `prisma migrate deploy` in production
- ✅ Test migrations in development first

---

## 📚 Additional Resources

### Key Files Reference

- **Schema**: `prisma/schema.prisma`
- **Auth Config**: `lib/auth.ts`
- **Permissions**: `lib/permissions.ts`
- **Route Utils**: `lib/route-utils-server.ts`, `lib/route-utils-client.ts`
- **User Logging**: `lib/user-log.ts`
- **Permission Types**: `types/permissions.ts`

### Documentation Files

- **ERP Plan**: `docs/ERP_DEVELOPMENT_PLAN.md`
- **Application Structure**: `docs/APPLICATION_STRUCTURE.md`
- **Master Data Tracker**: `docs/MASTER_DATA_IMPLEMENTATION_TRACKER.md`
- **Permission System**: `docs/PERMISSION_SYSTEM_IMPLEMENTATION.md`

---

## 🎯 Quick Reference Checklist

When creating a new module:

- [ ] Create Prisma model in `schema.prisma`
- [ ] Create migration file
- [ ] Create server actions in `_actions/` folder
- [ ] Add permission checks to server actions
- [ ] Create form component with Zod validation
- [ ] Create list component with search/pagination
- [ ] Create pages (list, add, edit, detail)
- [ ] Add permission keys to `types/permissions.ts`
- [ ] Update navigation menu
- [ ] Add user activity logging
- [ ] Test all CRUD operations
- [ ] Test permission checks
- [ ] Test error handling

---

**Last Updated**: January 2025  
**Version**: 1.0.1
