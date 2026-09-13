# Duty Roster & Shift Scheduling System - Development Guide

## 📌 Executive Summary

The **Duty Roster & Shift Scheduling System** in `ffERP` provides flexible daily shift planning for employees across departments while preserving 100% backward compatibility with static assigned default shifts. 

It uses an **Overlay Architecture**: static default shifts (`Employee.shiftId`) apply by default, but can be overridden on a per-day, per-employee basis via `EmployeeRoster` entries.

---

## 🗄️ Database Architecture & Data Schema

### 1. `EmployeeRoster` Model
Located in [`prisma/schema.prisma`](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/prisma/schema.prisma):

```prisma
model EmployeeRoster {
  id          String   @id @default(cuid())
  employeeId  String
  date        DateTime @db.Date
  shiftId     String?
  isOffDay    Boolean  @default(false)
  notes       String?
  createdById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  employee  Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  shift     Shift?    @relation(fields: [shiftId], references: [id], onDelete: SetNull)
  createdBy User?     @relation(fields: [createdById], references: [id], onDelete: SetNull)

  @@unique([employeeId, date])
}
```

### 2. Shift Resolution Logic (Overlay Strategy)

When evaluating an employee's schedule for a specific date:

$$\text{Effective Shift} = \begin{cases} 
\text{Off Day} & \text{if } \text{Roster.isOffDay} = \text{true} \\
\text{Roster.shift} & \text{if } \text{Roster entry exists and } \text{Roster.shiftId} \neq \text{null} \\
\text{Employee.shift} & \text{if no Roster entry exists and } \text{Employee.shiftId} \neq \text{null} \\
\text{Morning Shift (Default)} & \text{if no Roster entry and no Employee shift assigned}
\end{cases}$$

---

## 🚀 Server Actions API Reference

Located in [`app/(dashboard)/dashboard/hr/roster/_actions/roster.action.ts`](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/app/(dashboard)/dashboard/hr/roster/_actions/roster.action.ts):

### 1. `getRosterMatrix`
Fetches employees and their assigned daily roster entries for a target month (`YYYY-MM`).
```ts
export async function getRosterMatrix(
  monthStr: string,           // e.g. "2026-09"
  departmentFilter: string = "all",
  search: string = ""
)
```

### 2. `upsertRosterCell`
Updates or creates a daily roster assignment. If `shiftId === null` and `isOffDay === false`, the custom override is deleted so the employee reverts to their default shift.
```ts
export async function upsertRosterCell(input: {
  employeeId: string;
  dateStr: string;           // "YYYY-MM-DD"
  shiftId: string | null;
  isOffDay?: boolean;
  notes?: string;
})
```

### 3. `bulkGenerateRoster`
Generates shift entries across a date range for a department with automated weekly off-day selection.
```ts
export async function bulkGenerateRoster(input: {
  departmentFilter?: string;
  employeeIds?: string[];
  startDateStr: string;      // "YYYY-MM-DD"
  endDateStr: string;        // "YYYY-MM-DD"
  shiftId: string | null;
  offDaysOfWeek?: number[];  // Array of day indices e.g. [5] for Friday
})
```

### 4. `clearRosterRange`
Clears roster overrides for a date range, returning target employees to default shifts.
```ts
export async function clearRosterRange(input: {
  startDateStr: string;
  endDateStr: string;
  departmentFilter?: string;
})
```

---

## 💻 Frontend UI Architecture

### 1. Page Route
- **Path**: `/dashboard/hr/roster`
- **File**: [`app/(dashboard)/dashboard/hr/roster/page.tsx`](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/app/(dashboard)/dashboard/hr/roster/page.tsx)
- Server component that validates permissions and passes active `shifts` and `departments` to the client matrix board.

### 2. Matrix Board Component
- **File**: [`roster-matrix-client.tsx`](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/app/(dashboard)/dashboard/hr/roster/_components/roster-matrix-client.tsx)
- **Features**:
  - Sticky employee header column with designation and employee code.
  - Days of the month columns (`1` to `31`).
  - Color-coded cell badges (`Emerald` for custom shift, `Rose` for Off Day, `Dashed` for default shift).
  - **1-Click Shift Selector Popover**: Direct buttons to select shifts, set Off-Day, or revert to default shift.

### 3. Bulk Generator Dialog
- **File**: [`roster-generator-dialog.tsx`](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/app/(dashboard)/dashboard/hr/roster/_components/roster-generator-dialog.tsx)
- Modal dialog triggered from the header to bulk-assign shifts with recurring weekly off-days.

---

## 🔐 Permission System & Access Control

### 1. Unique Permission Key
- **Key**: `"hr.roster"`
- **Module**: `hr` (People & HR)

### 2. Available Operations
| Operation | Description |
| :--- | :--- |
| `view` | View the duty roster board and employee shift matrix |
| `create` | Bulk generate roster schedules for date ranges |
| `edit` | Update or clear single cell daily shift assignments |

### 3. Sidebar Navigation Registration
Registered in [`lib/navigation-builder.ts`](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/lib/navigation-builder.ts):
```ts
{ href: "/dashboard/employees", label: "Employees", icon: "FiUser", module: "peoples" },
{ href: "/dashboard/hr/attendance", label: "Attendance", icon: "FiClock", module: "hr" },
{ href: "/dashboard/hr/roster", label: "Duty Roster", icon: "FiCalendar", module: "hr" },
{ href: "/dashboard/hr/shifts", label: "Shifts", icon: "FiLayers", module: "hr" },
```

### 4. Permission Mapping Definitions
Registered in [`types/permissions.ts`](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/types/permissions.ts):

- **SubModules**:
```ts
{ id: "roster", label: "Duty Roster", path: "/dashboard/hr/roster", module: "hr", permissionKey: "hr.roster" }
```

- **Navigation Structure**:
```ts
{ permissionKey: "hr.roster", path: "/dashboard/hr/roster", label: "Duty Roster", operations: ["view", "create", "edit"] }
```

- **Route Utils**: [`lib/permission-utils.ts`](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/lib/permission-utils.ts):
```ts
"/dashboard/hr/roster": "hr.roster"
```

### 5. Backward Compatibility & Fallback
To ensure smooth operation for existing HR roles, server checks evaluate:
```ts
const canView = userId
  ? (await hasPermission(userId, "hr.roster", "view")) || (await hasPermission(userId, "hr.attendance", "view"))
  : false;
```

---

## ⚡ Attendance Evaluation Integration

When processing check-ins or biometric logs in [`attendance.action.ts`](file:///Users/manishankarvakta/Desktop/APPS/ts-crm/startup-mvp/app/(dashboard)/dashboard/hr/attendance/_actions/attendance.action.ts):

1. Queries `prisma.employeeRoster.findUnique` for `(employeeId, targetDate)`.
2. If `roster` exists:
   - If `roster.isOffDay === true`, attendance status evaluates to `OFF_DAY` (if no check-in exists).
   - If `roster.shift` exists, late arrival, overtime, and work hours are calculated using `roster.shift` timing rules.
3. If no `roster` exists:
   - Falls back to `employee.shift` policies.

---

## 🧪 Seeding & Utilities

To seed test data or update default shifts:
- `prisma/seed-employees.ts`: Seeds sample departments, shifts, and employees.
- `prisma/update-default-shift.ts`: Assigns Morning Shift to all employees without a shift.

Execute via terminal:
```bash
npx tsx prisma/seed-employees.ts
npx tsx prisma/update-default-shift.ts
```
