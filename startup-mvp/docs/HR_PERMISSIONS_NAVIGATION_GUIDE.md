# HR & Payroll Module Permissions & Navigation Guide

## Overview

This document provides developer guidelines and architectural references for the **HR & Payroll** module integration into the ERP's dynamic permission matrix and sidebar navigation system.

---

## 1. Directory Structure & Routes

All HR operations routes are grouped under `/app/(dashboard)/dashboard/hr` and mapped to specific permission keys:

| URL Route Path | Submodule Name | Permission Key | Supported Operations |
| :--- | :--- | :--- | :--- |
| `/dashboard/hr/attendance` | Attendance Punch Logs | `hr.attendance` | `view`, `create`, `edit`, `sync` |
| `/dashboard/hr/shifts` | Shift Scheduling | `hr.shifts` | `view`, `create`, `edit`, `move-to-trash`, `delete-permanently` |
| `/dashboard/hr/holidays` | Holiday Calendar | `hr.holidays` | `view`, `create`, `edit`, `move-to-trash`, `delete-permanently` |
| `/dashboard/hr/leave` | Leave Applications | `hr.leave` | `view`, `create`, `edit`, `approve` |
| `/dashboard/hr/loans` | Loan Management | `hr.loans` | `view`, `create`, `edit`, `approve` |
| `/dashboard/hr/payroll` | Automated Payroll | `hr.payroll` | `view`, `create`, `edit`, `post` |
| `/dashboard/hr/calendar` | HR Master Calendar | `hr.calendar` | `view` |
| `/dashboard/hr/attendance/devices` | Biometric Devices | `hr.devices` | `view`, `create`, `edit`, `delete-permanently` |

---

## 2. Dynamic Permission Matrix Setup

The HR submodules are registered within the `NAVIGATION_STRUCTURE` array in [types/permissions.ts](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/types/permissions.ts):

```typescript
export const NAVIGATION_STRUCTURE: NavigationItem[] = [
  // ... Dashboard & CRM
  {
    id: "hr",
    label: "HR & Payroll",
    pages: [
      {
        permissionKey: "hr.attendance",
        path: "/dashboard/hr/attendance",
        label: "Attendance",
        operations: ["view", "create", "edit", "sync"],
      },
      // ... other submodules
    ],
  },
  // ... Projects & other modules
];
```

### Layout Placement
To match user requirements, the **HR & Payroll** permission category is placed **exactly below the CRM permission category** inside `NAVIGATION_STRUCTURE`. This guarantees that the Settings > Permissions template page displays them in the correct visual sequence.

---

## 3. Sidebar Navigation Menu Registration

The dynamic sidebar matches the hierarchy by declaring menu items in `MENU_TEMPLATE` within [lib/navigation-builder.ts](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/lib/navigation-builder.ts). The menu item is placed **exactly below the CRM item**:

```typescript
export const MENU_TEMPLATE: MenuItemData[] = [
  { href: "/dashboard", label: "Dashboard", icon: "FiHome", module: "dashboard" },
  { label: "Service Catalog", ... },
  { label: "CRM", ... },
  {
    label: "HR & Payroll",
    icon: "FiBriefcase",
    module: "hr",
    subMenu: [
      { href: "/dashboard/hr/attendance", label: "Attendance", icon: "FiClock", module: "hr" },
      { href: "/dashboard/hr/shifts", label: "Shifts", icon: "FiLayers", module: "hr" },
      // ...
    ],
  },
  { label: "Projects", ... },
];
```

### Icon Registry (`components/dashboard/sidebar.tsx`)
React Icons used by the navigation builder must be explicitly registered in `ICON_MAP` inside the sidebar component to prevent compilation or client-side runtime errors:
```typescript
import { FiClock, FiCalendar, FiServer, ... } from "react-icons/fi";

const ICON_MAP: Record<string, IconType> = {
  FiClock,
  FiCalendar,
  FiServer,
  // ... other mappings
};
```

---

## 4. Access Guarding & Route Protection

### Route Protection Middleware (`app/(dashboard)/dashboard/hr/layout.tsx`)
All paths prefixed with `/dashboard/hr/...` are guarded by a parent layout component check. If a user attempts to navigate to any HR page without active `"hr"` view permission, they are shown a styled "Access Denied" page:

```typescript
import { checkPermission } from "@/lib/permissions";
import AccessDenied from "@/components/dashboard/access-denied";

export default async function HRLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const allowed = await checkPermission(session?.user?.id, "hr", "view");

  if (!allowed) {
    return <AccessDenied module="HR & Payroll" />;
  }

  return <>{children}</>;
}
```

### Page Guard Component (`components/permissions/page-guard.tsx`)
Individual page routers use the `PageGuard` component to perform fine-grained submodule checks matching the permission keys in Section 1:
```typescript
import PageGuard from "@/components/permissions/page-guard";

export default async function BiometricDevicesPage() {
  return (
    <PageGuard permissionKey="hr.devices">
      <DeviceSettings />
    </PageGuard>
  );
}
```

---

## 5. Seeding Role Templates

Static permission templates defined in [prisma/seed-permissions.ts](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/prisma/seed-permissions.ts) have been updated to seed operational templates with appropriate HR permissions:

| Template Role | Granted HR Submodules | Operations |
| :--- | :--- | :--- |
| **Super Admin** / **Admin** | All HR Submodules | All operations (including custom actions) |
| **Directors** | All HR Submodules | `view`, `approve` |
| **Accountant** | `hr.payroll`, `hr.loans` | `view`, `create`, `edit`, `post`, `approve` |

Rerunning the seed script (`npx tsx prisma/seed-permissions.ts`) safely performs **upserts**, modifying roles dynamically without database duplication or conflicts.
