# HR & Payroll Settings Foundation (Phase 1) Implementation Report

This report documents the completion of **Phase 1: Payroll Settings Foundation** in the ERP/HRMS system. 

---

## 1. Summary
Phase 1 implements a backward-compatible, flexible database schema and data-fetching layer to support future policy-driven salary calculations and attendance rules. We added policy templates for salary structure, late deductions, attendance bonuses, overtime, night bills, holiday bills, and global settings. These templates are dynamically mapped to custom `EmployeeType` records. The existing shift timing rules remain strictly shift-bound, and no payroll or attendance processing calculations were altered in this phase.

---

## 2. Files Changed
### Existing Files Modified:
1. **[prisma/schema.prisma](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/schema.prisma)**:
   - Added 8 new models (`SalaryStructurePolicy`, `AttendancePolicy`, `LatePolicy`, `OvertimePolicy`, `TiffinBillPolicy`, `NightBillPolicy`, `HolidayBillPolicy`, and `PayrollSetting`).
   - Extended `EmployeeType` to hold relations to all 7 policy models.
   - Extended `Attendance` with placeholder fields for calculated allowances and deductions.
   - Extended `PayrollItem` with placeholder allowance/deduction columns.
   - Extended `User` with back-relations for policy audit tracking.
2. **[app/(dashboard)/dashboard/settings/_components/PayrollSettings.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/settings/_components/PayrollSettings.tsx)**:
   - Added a client-side layout separating global configurations and HR/Payroll policies.
   - Integrated tab structure using Radix UI `<Tabs>`.
   - Wired up server actions to display all active policy templates and dynamic `EmployeeType` mappings.
3. **[app/(dashboard)/dashboard/employees/_actions/employee.action.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/employees/_actions/employee.action.tsx)**:
   - Updated employee creation and update actions to link with custom `EmployeeType` relations.
4. **[app/(dashboard)/dashboard/employees/_components/employeeForm.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/employees/_components/employeeForm.tsx)**:
   - Enabled dynamic loading of employee types in the employee setup form.
5. **[app/(dashboard)/dashboard/employees/page.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/employees/page.tsx)**:
   - Added an entry button in the header directing admins to the custom Employee Types setup page.
6. **[docs/DOCUMENTATION_INDEX.md](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/docs/DOCUMENTATION_INDEX.md)**:
   - Updated standard indices to register the new payroll policy architecture document.

### New Files Added:
1. **[prisma/seed-payroll-defaults.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/seed-payroll-defaults.ts)**:
   - Idempotent script seeding all default payroll settings and default policies.
2. **[app/(dashboard)/dashboard/settings/_actions/payroll-policies.action.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/settings/_actions/payroll-policies.action.ts)**:
   - Server actions defining policy template data fetchers (`listSalaryStructurePolicies`, `listAttendancePolicies`, etc.).
3. **[docs/EMPLOYEE_TYPES_POLICIES_AND_CALCULATIONS.md](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/docs/EMPLOYEE_TYPES_POLICIES_AND_CALCULATIONS.md)**:
   - Architected payroll settings, policy guidelines, and mapping schemas for developers.

---

## 3. Prisma Models Added
The following models were created to store money, eligibility, allowance, bonus, and deduction policies:

1. **`SalaryStructurePolicy`**:
   - `id`: CUID (Primary Key)
   - `name`: String
   - `description`: String (Optional)
   - `isDefault`: Boolean (Default: false)
   - `basedOn`: String (Default: "GROSS")
   - `basicPercent`: Decimal (Default: 55.00)
   - `houseRentPercent`: Decimal (Default: 26.00)
   - `medicalPercent`: Decimal (Default: 5.00)
   - `transportPercent`: Decimal (Default: 4.00)
   - `foodPercent`: Decimal (Default: 10.00)
   - `status`: String (Default: "active")
   - `isTrash`: Boolean (Default: false)
   - `createdBy`: String (relation to `User.id`)

2. **`AttendancePolicy`**:
   - `id`: CUID (Primary Key)
   - `name`: String
   - `description`: String (Optional)
   - `isEnabled`: Boolean (Default: true)
   - `isEligibleForAttendanceBonus`: Boolean (Default: false)
   - `bonusCalculationType`: String (Default: "NONE")
   - `attendanceBonusAmount`: Decimal (Default: 0.00)
   - `applyAbsentPenalty`: Boolean (Default: true)
   - `applyLatePenalty`: Boolean (Default: true)
   - `status`: String (Default: "active")
   - `isTrash`: Boolean (Default: false)
   - `createdBy`: String (relation to `User.id`)

3. **`LatePolicy`**:
   - `id`: CUID (Primary Key)
   - `name`: String
   - `description`: String (Optional)
   - `isEnabled`: Boolean (Default: true)
   - `resetLateEveryMonth`: Boolean (Default: true)
   - `lateCountPeriod`: String (Default: "MONTHLY")
   - `enableLateToAbsentConversion`: Boolean (Default: false)
   - `lateDaysForOneAbsent`: Int (Default: 3)
   - `lateCountForBonusLoss`: Int (Default: 3)
   - `deductSalaryForLate`: Boolean (Default: false)
   - `deductAttendanceBonusForLate`: Boolean (Default: true)
   - `status`: String (Default: "active")
   - `isTrash`: Boolean (Default: false)
   - `createdBy`: String (relation to `User.id`)

4. **`OvertimePolicy`**:
   - `id`: CUID (Primary Key)
   - `name`: String
   - `description`: String (Optional)
   - `isEligible`: Boolean (Default: false)
   - `calculationType`: String (Default: "FORMULA")
   - `basicPercentageFromGross`: Decimal (Default: 60.00)
   - `monthlyWorkingDays`: Int (Default: 30)
   - `hourBasis`: String (Default: "ASSIGNED_SHIFT_HOUR")
   - `fixedHourValue`: Decimal (Optional)
   - `multiplier`: Decimal (Default: 2.00)
   - `fixedOTRate`: Decimal (Optional)
   - `minimumOTMinutes`: Int (Default: 0)
   - `status`: String (Default: "active")
   - `isTrash`: Boolean (Default: false)
   - `createdBy`: String (relation to `User.id`)

5. **`TiffinBillPolicy`**:
   - `id`: CUID (Primary Key)
   - `name`: String
   - `description`: String (Optional)
   - `isEligible`: Boolean (Default: false)
   - `allowAfterTime`: String (Optional, e.g., "20:00")
   - `amount`: Decimal (Default: 0.00)
   - `countType`: String (Default: "DAILY")
   - `maxCountPerDay`: Int (Default: 1)
   - `status`: String (Default: "active")
   - `isTrash`: Boolean (Default: false)
   - `createdBy`: String (relation to `User.id`)

6. **`NightBillPolicy`**:
   - `id`: CUID (Primary Key)
   - `name`: String
   - `description`: String (Optional)
   - `isEligible`: Boolean (Default: false)
   - `allowAfterTime`: String (Optional, e.g., "23:55")
   - `amount`: Decimal (Default: 0.00)
   - `countType`: String (Default: "DAILY")
   - `supportsOvernightCheckout`: Boolean (Default: true)
   - `maxCountPerDay`: Int (Default: 1)
   - `status`: String (Default: "active")
   - `isTrash`: Boolean (Default: false)
   - `createdBy`: String (relation to `User.id`)

7. **`HolidayBillPolicy`**:
   - `id`: CUID (Primary Key)
   - `name`: String
   - `description`: String (Optional)
   - `isEligible`: Boolean (Default: false)
   - `calculationType`: String (Default: "ONE_DAY_GROSS")
   - `fixedAmount`: Decimal (Optional)
   - `allowWithOT`: Boolean (Default: false)
   - `includeWeekend`: Boolean (Default: true)
   - `includePublicHoliday`: Boolean (Default: true)
   - `status`: String (Default: "active")
   - `isTrash`: Boolean (Default: false)
   - `createdBy`: String (relation to `User.id`)

8. **`PayrollSetting`**:
   - `id`: CUID (Primary Key)
   - `name`: String
   - `defaultMonthlyWorkingDays`: Int (Default: 30)
   - `defaultPayDivisor`: Int (Default: 30)
   - `defaultCurrency`: String (Default: "BDT")
   - `roundingMethod`: String (Default: "NONE")
   - `allowNegativeNetSalary`: Boolean (Default: false)
   - `payrollLockAfterApproval`: Boolean (Default: true)
   - `recalculateLockedPayroll`: Boolean (Default: false)
   - `status`: String (Default: "active")
   - `isDefault`: Boolean (Default: true)

---

## 4. Existing Models Extended
### `EmployeeType`
Extended with nullable relation IDs and reference relations to bind to policies dynamically:
- `attendancePolicyId` -> `AttendancePolicy`
- `latePolicyId` -> `LatePolicy`
- `overtimePolicyId` -> `OvertimePolicy`
- `tiffinBillPolicyId` -> `TiffinBillPolicy`
- `nightBillPolicyId` -> `NightBillPolicy`
- `holidayBillPolicyId` -> `HolidayBillPolicy`
- `salaryStructurePolicyId` -> `SalaryStructurePolicy`

### `Attendance`
Added the following calculation placeholders (defaults set to safe zero values):
- `lateMinutes`: Int (Default: 0)
- `lateCountValue`: Decimal (Default: 0.00)
- `lateDeductionAmount`: Decimal (Default: 0.00)
- `tiffinBillAmount`: Decimal (Default: 0.00)
- `nightBillAmount`: Decimal (Default: 0.00)
- `holidayBillAmount`: Decimal (Default: 0.00)
- `calculatedOvertimeAmount`: Decimal (Default: 0.00)
- `policyCalculationNote`: String (Nullable, Optional)

### `PayrollItem`
Added new specific allowance/deduction fields to separate payroll metrics:
- `tiffinAllowance`: Decimal (Default: 0.00)
- `nightAllowance`: Decimal (Default: 0.00)
- `holidayAllowance`: Decimal (Default: 0.00)
- `otherAllowance`: Decimal (Default: 0.00)
- `lateDeduction`: Decimal (Default: 0.00)
- `otherDeduction`: Decimal (Default: 0.00)

*Reused Existing Fields Mapping:*
- Gross Salary / Total Salary -> `grossPay`
- Basic Salary -> `basic`
- House Rent -> `houseRent`
- Medical -> `medical`
- Transport -> `transport`
- Food -> `foodAllowance`
- Net Payable -> `netPay`

---

## 5. New Default Seed Records Added
A seed script `seed-payroll-defaults.ts` has been created. Running the script creates the following default records:
1. **Salary Structure**: *"Default Gross Salary Structure"* (Basic: 55%, House Rent: 26%, Medical: 5%, Transport: 4%, Food: 10%, `isDefault: true`).
2. **Attendance Policy**: *"Default Attendance Policy"* (Enabled: true, Bonus Eligible: false, Bonus Type: NONE, Absent Penalty: true, Late Penalty: true).
3. **Late Policy**: *"Default Late Policy"* (Reset Monthly: true, Late count: MONTHLY, Convert to absent: false, 3 lates = 1 absent, Deduct salary: false, Deduct attendance bonus: true).
4. **Overtime Policy**: *"Default No OT Policy"* (Eligible: false, Hour Basis: ASSIGNED_SHIFT_HOUR, Multiplier: 2.0x, Monthly Days: 30).
5. **Tiffin Policy**: *"Default No Tiffin Policy"* (Eligible: false, Amount: 0).
6. **Night Bill Policy**: *"Default No Night Bill Policy"* (Eligible: false, Amount: 0, Supports Overnight: true).
7. **Holiday Bill Policy**: *"Default No Holiday Bill Policy"* (Eligible: false, Calculation Type: ONE_DAY_GROSS).
8. **Payroll Setting**: *"Default Payroll Setting"* (Working Days: 30, Divisor: 30, Currency: BDT, Rounding: NONE, Lock payroll: true).

---

## 6. Settings Route Changes
The settings interface under `/dashboard/settings?section=payroll` is fully integrated:
- The route captures the section parameter and displays the `<PayrollSettings />` client component.
- The UI contains a dual-tab architecture:
  1. **Global Settings**: Renders the core settings forms, schedule details, and accounting ledger mappings.
  2. **HR & Payroll Policies**: Renders cards summarizing all active default policies (Basic percents, Late deduction values, OT rates, etc.) and lists all active `EmployeeType` items with their assigned policies.

---

## 7. Server Actions/Utilities Added
The file `payroll-policies.action.ts` defines safe, authorized endpoints:
- `listSalaryStructurePolicies()`
- `listAttendancePolicies()`
- `listLatePolicies()`
- `listOvertimePolicies()`
- `listTiffinBillPolicies()`
- `listNightBillPolicies()`
- `listHolidayBillPolicies()`
- `listPayrollSettings()`
- `listEmployeeTypesWithPayrollPolicies()`

---

## 8. Backward Compatibility Notes
- **Employee Type Policies**: All policy relationships on `EmployeeType` are defined as nullable. Existing types without an assigned policy function as-is.
- **Salary Calculations**: The old `employee.salary` value is treated as Gross Salary. The current salary breakdown uses the default Gross Salary structure template, but actual generation logic is unchanged to protect active payroll calculations.
- **PayrollItem Re-use**: Existing columns in `PayrollItem` (`basic`, `houseRent`, `medical`, `transport`, `foodAllowance`, `grossPay`, `netPay`) are retained and re-mapped, ensuring compatibility with previous payroll logs.

---

## 9. What Was Intentionally Not Changed
- **Shift Logic**: Shift timings and fields (`startTime`, `endTime`, `graceMinutes`, etc.) remain shift-based and were not copied to Employee Type policies.
- **Payroll generation calculation code**: No changes were made to active calculation runs.
- **Attendance calculations**: No adjustments were made to the attendance processing scripts.
- **Payslip UI**: The payslip printout and screens were left in their exact initial state.

---

## 10. Commands Run
```bash
# Apply new policy models and extend existing tables in the database
npx prisma db push

# Generate updated Prisma Client types
npx prisma generate

# Execute default payroll settings seed script (Idempotent)
npx tsx prisma/seed-payroll-defaults.ts

# Execute TypeScript typecheck compiler check
npm run typecheck
```

---

## 11. Typecheck/Build Result
Running `npm run typecheck` validates that:
- The newly created `payroll-policies.action.ts` compiles with zero errors.
- The modified `PayrollSettings.tsx` tab-view client layout compiles successfully.
- No TypeScript warnings or compilation issues were introduced in modified files.

---

## 12. Migration Result
`npx prisma db push` successfully ran, creating the 8 new policy tables, updating constraints, and adding nullable foreign keys to `EmployeeType`, `Attendance`, and `PayrollItem` tables without data loss.

---

## 13. Known Issues
- Existing legacy typescript warnings within the unrelated `biometric` device controller page and experimental test runner scripts remain intact (these are outside the scope of Phase 1 modifications).

---

## 14. Next Recommended Phase
- **Phase 2: Policy Management Forms (CRUD UI)**: Implement forms to allow creating and editing custom policies, and an assignment interface to map custom policies to Employee Types.
- **Phase 3: Calculation Migration**: Update the attendance and payroll processing engines to consume these database policy policies.
