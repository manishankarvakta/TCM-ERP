# Employee Directory Dashboard: Codebase & UI Architecture Report

This report provides a detailed analysis of the **Employee Directory Dashboard** (accessible at `/dashboard/employees`) in the ERP system. It covers the database models, server actions, client-side listing parameters, and status indicators.

---

## 1. Directory Structure

The employee dashboard implementation is organized under the following files in Next.js:
* **Route Entrypoint**: `app/(dashboard)/dashboard/employees/page.tsx`
* **Server Actions**: `app/(dashboard)/dashboard/employees/_actions/employee.action.tsx`
* **Components**:
  - `employees.tsx`: Client-side search filters, list grid, batch actions, and Duty Status calculators.
  - `employeeForm.tsx`: Creation and edit form covering personal, official, financial, and sync settings.
  - `print-id-card-dialog.tsx`: Bulk card printing layout.
  - `sync-biometric-button.tsx`: Triggers manual biometric synchronization checks.
* **Child Modules**:
  - `types/`: Layout for employee type categories.

---

## 2. Database Schema (`Employee`)

The employee model is configured in `prisma/schema.prisma` with relationships linking it across modules (Users, Attendance, Payroll, and Accounting):
* **Credentials Link**: `userId` (FK to `User` table for employee login credentials).
* **Location Mapping**: `warehouseId` (FK to `Warehouse` to identify default work site).
* **Shift Settings**: `shiftId` (FK to `Shift` mapping allowed start/end bounds).
* **Financial Accounts**:
  - `salaryPayableAccountId` (Chart of Accounts node mapping default accrued liabilities).
  - `advanceAccountId` (Chart of Accounts node mapping employee loans/advances).
* **Status Flags**: `status` (`active`, `inactive`, `trash`).

---

## 3. Real-Time Duty Status Indicator (`getEmployeeDutyStatus`)

In `employees.tsx`, the UI calculates whether an employee is currently "On Duty" (clocked in) or "Off Duty" (clocked out) dynamically on the client:

```typescript
export function getEmployeeDutyStatus(attendanceLogs?: { timestamp: Date | string }[]): boolean {
  if (!attendanceLogs || attendanceLogs.length === 0) return false;

  const latestPunch = new Date(attendanceLogs[0].timestamp);
  const now = new Date();

  // 1. If the latest punch occurred more than 14 hours ago, they are automatically Off Duty
  const hoursSinceLatest = (now.getTime() - latestPunch.getTime()) / (1000 * 60 * 60);
  if (hoursSinceLatest > 14) return false;

  // 2. If they have exactly 1 punch within 14 hours, they are On Duty (Check-In)
  if (attendanceLogs.length === 1) return true;

  const prevPunch = new Date(attendanceLogs[1].timestamp);
  const latestDateString = latestPunch.getFullYear() + "-" + latestPunch.getMonth() + "-" + latestPunch.getDate();
  const prevDateString = prevPunch.getFullYear() + "-" + prevPunch.getMonth() + "-" + prevPunch.getDate();

  // 3. If both logs are on the same calendar date, they checked out (Even punch count)
  if (latestDateString === prevDateString) return false;

  // 4. If punches are on different days, latest punch represents a new Check-in (On Duty)
  return true;
}
```

---

## 4. Query Engine & Filters (`getEmployees`)

The server-side query handler (`getEmployees`) processes search keywords and pagination parameters:
* **Deep Biometric Search**: The search predicate checks Name, Code, Email, Phone, and also matches biometric device pins via:
  ```typescript
  deviceMappings: {
    some: {
      deviceUserId: { contains: search, mode: "insensitive" }
    }
  }
  ```
* **Trash Isolation**: Keeps deleted records isolated by applying a default filter `status: { not: "trash" }`. Soft-deleted employees are only queried when explicitly requesting `status === "trash"`.
* **Prefetch Relations**: Fetches `warehouse`, `user`, `deviceMappings`, and gets the 2 most recent `attendanceLogs` sorted by timestamp descending to compute active duty states.

---

## 5. Employee Form Wizard (`employeeForm.tsx`)

The employee wizard form is a 34KB component utilizing `react-hook-form` and `zod` for validation. It partitions inputs into four tabs:

1. **Personal Information**: Blood group, NID, Date of Birth, Gender, Photo, and Address.
2. **Official Details**: Joins Designation, Department, Warehouse location, and Shift policies.
3. **Financial Accounts**:
   - Manages pay methods (`CASH`, `BANK`, `MOBILE_BANKING`).
   - Links specific Chart of Account (COA) liability nodes (`salaryPayableAccountId`, `advanceAccountId`) which prevents accounting posting failures during monthly payroll vouchers creation.
4. **Login Credentials**: Allows binding the employee record to a portal User account.

---

## 6. Batch Actions & ID Printing

The client component supports selecting multiple rows to trigger batch operations:
* **Status Updates**: Bulk activates, deactivates, or moves selected employees to the trash.
* **Bulk ID Card Printing**: Opens the `<PrintIdCardDialog />` component. It renders printable ID cards containing the organization logo, employee photo, joining date, blood group, designation, barcode, and emergency contact details formatted inside print-friendly media styles.
