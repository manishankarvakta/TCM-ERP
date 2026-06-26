# Employee Details Salary Structure Display Report

## 1. Summary
This upgrade implements a secure, read-only display of the **Salary Structure Breakdown** in the Employee Details page of the ERP/HRMS system. Using the employee's configured Gross Salary, the application dynamically breaks down the total salary into five components: Basic Salary, House Rent, Medical, Transport, and Food Allowance. This calculation mirrors the payroll generation system's logic to maintain consistency.

---

## 2. Files Changed
* **Action Layer**:
  * [employee.action.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/employees/_actions/employee.action.tsx)
* **View Layer**:
  * [details/page.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/employees/details/page.tsx)
* **Verification**:
  * [test-employee-salary-display.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/scratch/test-employee-salary-display.ts)

---

## 3. Data Loading Changes
The server action `getEmployeeById` was updated to fetch:
1. `employee.salary`
2. `employee.employeeType`
3. `employee.employeeType.salaryStructurePolicy`

All fetched Decimal values are serialized to plain javascript `number` values inside the action layer before returning them to client/server components. This prevents Next.js hydration or serialization errors.

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
A new card, **Salary Structure Breakdown**, was added in the details view showing:
* **Policy Name** and source attribution (Mapped Type, Company Default, or Hardcoded Fallback).
* **Gross Salary** formatted in BDT.
* **Component Table** showing the name, percentage, and calculated amount for each component.
* **Warning banner** if the sum of components is not exactly 100% (non-blocking).
* **Help text**: *“This breakdown is generated from the assigned salary structure. Payroll uses the same structure during payroll generation.”*

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
```

### Sample Calculations: Gross = 50,000 BDT
* **Basic Salary**: ৳27,500.00 BDT (55%)
* **House Rent**: ৳13,000.00 BDT (26%)
* **Medical**: ৳2,500.00 BDT (5%)
* **Transport**: ৳2,000.00 BDT (4%)
* **Food**: ৳5,000.00 BDT (10%)
* **Base Gross**: ৳50,000.00 BDT (100%)
* **Result**: **PASS** (Sum matches Gross Salary exactly)

### Live DB Employee Resolution Testing
* `Test Shift Employee` (Gross: 50,000): Resolved using **Active default company policy** ("Default Gross Salary Structure") -> **PASS**
* `Irvin Kirlin` (Gross: 106): Resolved using **Active default company policy** -> **PASS**
* `Manishankar Vakta` (Gross: 50,000): Resolved using **Active default company policy** -> **PASS**

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
* `npx tsx scratch/test-employee-salary-display.ts` - Verified database queries and breakdown calculations.

---

## 11. Typecheck/Build Result
The changed files (`details/page.tsx` and `employee.action.tsx`) compile perfectly with zero typescript warnings/errors. Existing unrelated biometric and test scripts in the workspace have minor typescript warnings/errors that were present before this work and left unmodified to preserve project scope.

---

## 12. Known Issues
None.
