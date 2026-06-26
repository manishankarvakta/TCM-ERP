# Employee Details Salary Structure Display & Bulk Payslip Printing Report

## 1. Summary
This upgrade implements:
1. A secure, read-only display of the **Salary Structure Breakdown** in the Employee Details page of the ERP/HRMS system. Using the employee's configured Gross Salary, the application dynamically breaks down the total salary into five components: Basic Salary, House Rent, Medical, Transport, and Food Allowance. This calculation mirrors the payroll generation system's logic to maintain consistency.
2. An enhancement to the **Payroll Details view** to expose the granular breakdown components (Basic, House Rent, Medical, Transport, and Food Allowance) as individual columns inside the main salary breakdown table (before the Base Gross column). The table has been configured with horizontal scrolling and sticky columns to pin Employee details on the left, and Total Deductions, Net Pay, and action columns on the right.
3. A **Bulk Payslips Printing** feature allowing HR operators to print all payslips in a payroll run at once. The layout is optimized to print exactly **3 payslips per portrait A4 sheet**, split horizontally into an **Office Copy** (left 35%) and an **Employee Copy** (right 65%) with a dashed tear line.

---

## 2. Files Changed
* **Action Layer**:
  * [employee.action.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/employees/_actions/employee.action.tsx)
  * [payroll.action.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action.ts)
* **View/Component Layer**:
  * [details/page.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/employees/details/page.tsx)
  * [payroll-details.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/hr/payroll/%5Bid%5D/_components/payroll-details.tsx)
  * [page.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/hr/payroll/%5Bid%5D/payslips/%5BitemId%5D/page.tsx)
  * [page.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/hr/payroll/%5Bid%5D/payslips/print/page.tsx) [NEW]
  * [print-all-client.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/hr/payroll/%5Bid%5D/payslips/print/_components/print-all-client.tsx) [NEW]
* **API/Export Layer**:
  * [route.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/hr/payroll/%5Bid%5D/export/route.ts)
* **Verification**:
  * [test-employee-salary-display.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/scratch/test-employee-salary-display.ts)
  * [test-payroll-display.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/scratch/test-payroll-display.ts)
  * [test-print-all-route.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/scratch/test-print-all-route.ts) [NEW]

---

## 3. Data Loading & Dynamic Resolution Changes
* **Employee details page**: The server action `getEmployeeById` was updated to fetch:
  1. `employee.salary`
  2. `employee.employeeType`
  3. `employee.employeeType.salaryStructurePolicy`
* **Payroll details page**: `getPayrollById` was updated to load the employee's `employeeType` and its `salaryStructurePolicy`. If a payroll item has flat/un-broken-down records (i.e. house rent, medical, transport, and food allowance are all 0 in the database), it dynamically calculates the component values at display-time using the active settings policy, ensuring accurate display and backward compatibility.
* **Individual Payslip view**: Applied the same dynamic settings-driven fallback resolver to individual payslips loaded via `/dashboard/hr/payroll/[id]/payslips/[itemId]` so that print previews display correct components.
* **Payroll CSV Export**: The Route GET handler in `route.ts` was updated to load the employee's `employeeType` and `salaryStructurePolicy` relations inside its cursor-based chunking query. Flat database records are resolved using the settings fallback policy and split dynamically during chunk streaming, so downloaded CSV spreadsheets show correct breakdowns.
* **Bulk Payslip Printing view**: The print page fetches the payroll, loads the default settings, resolves the flat salary structure fallbacks, and passes the structured dataset to the client component.
* All fetched Decimal values are serialized to plain javascript `number` values inside actions/utilities to prevent React/Next.js hydration or serialization warnings.

---

## 4. Salary Breakdown Logic
Gross Salary is split using percentages determined by the priority policy. The components are calculated as:
* **Basic Salary**: `(Gross * basicPercent) / 100`
* **House Rent**: `(Gross * houseRentPercent) / 100`
* **Medical**: `(Gross * medicalPercent) / 100`
* **Transport**: `(Gross * transportPercent) / 100`
* **Food Allowance**: `(Gross * foodPercent) / 100`

---

## 5. UI Changes

### A. Employee Details Page
A new card, **Salary Structure Breakdown**, was added in the details view showing:
* **Policy Name** and source attribution (Mapped Type, Company Default, or Hardcoded Fallback).
* **Gross Salary** formatted in BDT.
* **Component Table** showing the name, percentage, and calculated amount for each component.
* **Warning banner** if the sum of components is not exactly 100% (non-blocking).
* **Help text**: *“This breakdown is generated from the assigned salary structure. Payroll uses the same structure during payroll generation.”*

### B. Payroll Details View Table Upgrades
* Added five new columns: **Basic (55%)**, **House Rent (26%)**, **Medical (5%)**, **Transport (4%)**, and **Food (10%)** before the **Base Gross** column.
* Configured the table with a min-width of `2200px` inside a scrollable viewport wrapper to accommodate the 20 columns without cluttering or squishing.
* Made the table layout interactive and responsive via **sticky columns** and shadow delimiters:
  * **Sticky Left**: The **Employee** column is pinned to the left (`left-0`, `z-10/z-20`).
  * **Sticky Right**: **Total Ded.** (`right-[180px]`), **Net Pay** (`right-[80px]`), and **Actions/Payslip** (`right-0`) are pinned to the right.
  * Solid backgrounds and group-hover states (`group-hover:bg-muted`) were integrated into the sticky cells to maintain high visual alignment with light/dark theme modes during scrolling and row hovering.

### C. Bulk Printing Payslips Layout
* Added a new **Print all Payslip** button after the **Export CSV** button.
* Designed a print-only layout:
  * portrait A4 print layout margin rules are configured via CSS `@media print`.
  * Grouped in chunks of 3 items, with page-breaks forced after each group (`print:break-after-page` container of `h-[280mm]`).
  * Each payslip has a height of exactly `91mm` to guarantee exactly 3 slips fit per page.
  * Dashed vertical border separates the 35% Office Copy and 65% Employee Copy.
  * Floating "Print Now" button (hidden during print) allows users to easily trigger the browser print dialog.

---

## 6. Fallback Behavior
The policy resolution adheres to the following strict priority sequence:
1. **EmployeeType Mapped Policy**: `EmployeeType.salaryStructurePolicy` if assigned.
2. **Active Default Policy**: The active `SalaryStructurePolicy` flagged with `isDefault: true`, `status: "active"`, and `isTrash: false`.
3. **Hardcoded Fallback**: Defaults to the standard structure:
   * Basic Salary: **55%**
   * House Rent: **26%**
   * Medical: **5%**
   * Transport: **4%**
   * Food Allowance: **10%**

No crash occurs if the employee has no assigned type, or if no default policy exists in the database.

---

## 7. Test Results
The resolution and mathematical breakdown logic were validated using a custom test script running against actual database entries:
```bash
npx tsx scratch/test-employee-salary-display.ts
npx tsx scratch/test-payroll-display.ts
npx tsx scratch/test-print-all-route.ts
```

### Sample Calculations: Gross = 50,000 BDT
* **Basic Salary**: ৳27,500.00 BDT (55%)
* **House Rent**: ৳13,000.00 BDT (26%)
* **Medical**: ৳2,500.00 BDT (5%)
* **Transport**: ৳2,000.00 BDT (4%)
* **Food**: ৳5,000.00 BDT (10%)
* **Base Gross**: ৳50,000.00 BDT (100%)
* **Result**: **PASS** (Sum matches Gross Salary exactly)

### Live DB Payroll & Print Resolution Testing
We verified that already generated flat payroll runs in the database are split dynamically on the fly:
* **Final Shift Test** (Saved DB Basic: 50,000): Resolved using **Dynamic active default policy** to Basic(27,500), HouseRent(13,000), Medical(2,500), Transport(2,000), Food(5,000) -> **PASS**
* **Irvin Kirlin** (Saved DB Basic: 106): Resolved using **Dynamic active default policy** to Basic(58.3), HouseRent(27.56), Medical(5.3), Transport(4.24), Food(10.6) -> **PASS**
* **Manishankar Vakta** (Saved DB Basic: 5,000): Resolved using **Dynamic active default policy** to Basic(2,750), HouseRent(1,300), Medical(250), Transport(200), Food(500) -> **PASS**

---

## 8. Backward Compatibility Notes
* No database migrations were created.
* Handles employees without an assigned employee type or salary configuration gracefully without crashing.
* Uses safe fallback parameters in memory.

---

## 9. What Was Intentionally Not Changed
* **Payroll calculation logic** (untouched).
* **Attendance and leave logic** (untouched).
* **Payslip generation** (untouched).
* **Form Edit Display**: Live client-side previews inside the Employee edit/create form were skipped to avoid unnecessary database queries and component complexity, and documented as a future improvement.
* **Employee Salary / EmployeeSalary records** (never modified).

---

## 10. Commands Run
* `npm run typecheck` - Verified build structure and confirmed no typescript errors in the changed files.
* `npm run build` - Ran a full Next.js production build to ensure compiling safety of all routes (including the print route).
* `npx tsx scratch/test-print-all-route.ts` - Verified bulk print route data loader.

---

## 11. Typecheck/Build Result
All changed and new files compile perfectly with zero typescript warnings/errors. The Next.js production build succeeded completely. Existing unrelated biometric and test scripts in the workspace have minor typescript warnings/errors that were present before this work and left unmodified to preserve project scope.

---

## 12. Known Issues
None.
