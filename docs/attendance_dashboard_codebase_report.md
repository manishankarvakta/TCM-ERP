# Daily Attendance Dashboard: Codebase & UI Architecture Report

This report provides a detailed overview of the codebase and user interface architecture for the **Daily Attendance Dashboard** (accessible at `/dashboard/hr/attendance`) in the ERP system.

---

## 1. Directory Structure

The attendance dashboard implementation is organized under the following files in Next.js:
* **Route Entrypoint**: `app/(dashboard)/dashboard/hr/attendance/page.tsx`
* **Server Actions**: `app/(dashboard)/dashboard/hr/attendance/_actions/attendance.action.ts`
* **Components**:
  - `attendance-list.tsx`: The primary client interface showing processed rows, filters, and bulk triggers.
  - `manual-punch-form.tsx`: Handles HR manual corrections and entries.
  - `biometric-sync-button.tsx`: Triggers manual biometric synchronization checks.
* **Manual Punch Page**: `app/(dashboard)/dashboard/hr/attendance/manual-punch/page.tsx`

---

## 2. Page entry point (`page.tsx`)

The main entry point is a Server Component that handles routing parameters, performs server-side queries, and checks permissions.

### Key Logic & Flow:
1. **URL Parameter Extraction**:
   - Parses paginated controls (`page`, `limit`), search query, and filters (`warehouseId`, `employeeId`, `status`).
   - Defaults `fromDate` and `toDate` to today's date (local Dhaka time) if omitted.
2. **Server-Side Parallel Execution**:
   - Executes three parallel asynchronous queries using `Promise.all` to reduce rendering lag:
     - `getAttendanceRecordsPaginated(...)` to load target rows.
     - `hasPermission(userId, "hr.attendance", "view")` to verify view access.
     - `hasPermission(userId, "hr.attendance", "edit")` to verify management access.
3. **Permission Guards**:
   - Checks operations flags (`canView` and `canEdit`). If authorized, it passes permissions down to the client components.
   - Restricts UI actions (such as triggers and edit buttons) for unauthorized users.

---

## 3. Data Loading & Query engine (`getAttendanceRecordsPaginated`)

The server-side query handler constructs highly targeted database queries using Prisma.

### Query Construction:
* **Date Bounds**: Dates are parsed to strict ISO timestamps (`T00:00:00.000Z` and `T23:59:59.999Z`) to align cleanly with database bounds.
* **Relational Filtering**:
  - If a specific `warehouseId` is selected, it performs a relational query on `employee.warehouseId`.
  - Supports searching by employee name or code using an `insensitive` `contains` `OR` structure.
* **Atomic Transaction**:
  - Executes queries inside a `prisma.$transaction` block:
    1. A `.count()` query to fetch total records matching active filters (used for pagination numbers).
    2. A `.findMany()` query to fetch records, fetching employee fields (`name`, `employeeCode`, `designation`) and shift parameters (`startTime`, `endTime`) to limit data payload.

---

## 4. UI Listing Component (`AttendanceListClient`)

The client-side list component (`attendance-list.tsx`) handles state mutations, table grids, and navigation.

### Key Visual & Functional Features:
1. **Searchable Selection Dropdowns**:
   - Integrates the `<SearchableSelect />` component to quickly select employees and warehouses out of large collections (pre-loaded inside `useEffect`).
2. **Filter State Synchronization**:
   - Manages state changes inside `useTransition`. Filter updates are pushed to the URL parameters via `router.push`, forcing Next.js to fetch new data from the server while keeping UI interactions smooth.
3. **Table Grid & Allowances Panel**:
   - Displays check-in/out times, calculated work hours, and overtime hours.
   - **Tiffin, Night, & Holiday Bills**: Renders calculated allowance amounts in small badges under the status pill if they are greater than zero, providing clear auditing info to HR.
4. **Un-Punched Absent Processor**:
   - Exposes a button: **"Process Un-Punched as Absent"**.
   - Invokes `processBulkAttendance()` to automatically set employees who have no punches for the date to `ABSENT` in bulk.

---

## 5. Manual Punch Form (`ManualPunchForm`)

The manual punch component (`manual-punch-form.tsx`) provides manual correction tools for HR managers.

### Correction Workflow:
1. **Auto-Load Existing Data**:
   - A `useEffect` watches selection changes in `employeeId` and `date`.
   - If a record is found in the database, it automatically retrieves existing times using `getAttendanceRecord()` and populates the inputs.
2. **Timezone Zoned Formatting**:
   - Leverages `formatInTimeZone` from `date-fns-tz` to render retrieved dates inside the `"Asia/Dhaka"` timezone (e.g., `"17:00"`).
3. **Time-String Assembly**:
   - Combines the input date and `HH:MM` time strings into ISO strings (e.g., `2026-07-15T09:00:00`) before calling `processManualAttendance()`.
4. **Manual Flag**:
   - Saves the updated record with `isManual: true`, which blocks the biometric sync pipeline from overriding this record during automatic device synchronizations.
