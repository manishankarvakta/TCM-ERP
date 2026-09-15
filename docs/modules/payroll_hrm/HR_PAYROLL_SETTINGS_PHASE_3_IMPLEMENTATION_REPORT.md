# HR & Payroll Policy Calculation Engine Foundation & Safe Preview Tools (Phase 3) Implementation Report

This report documents the completion of **Phase 3: Policy Calculation Engine Foundation + Safe Preview/Dry-Run Tools** in the ERP/HRMS system.

---

## 1. Summary
Phase 3 establishes a robust, type-safe calculation utility layer (`policy-calculation.ts`), registers a read-only server action (`previewEmployeePayrollPolicyCalculation`), and adds a complete, high-fidelity **Calculation Preview** dashboard under `/dashboard/settings?section=payroll`. This tool enables administrators to dry-run salary components, overtime rates, night shift allowances, tiffin allowances, public holiday premiums, and late penalization rules for any employee. All inputs are mockable, and no database writes or mutations occur.

---

## 2. Files Changed
### Existing Files Modified:
1. **[app/(dashboard)/dashboard/settings/_actions/payroll-policies.action.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/settings/_actions/payroll-policies.action.ts)**:
   - Added the `previewEmployeePayrollPolicyCalculation` server action to query an employee, their dynamic type, active policies, shift boundaries, and run dry-run calculations.
   - Added the `listEmployeesForPreview` server action to retrieve active employees with code, current salary, employee type, and shift.
2. **[app/(dashboard)/dashboard/settings/_components/PayrollSettings.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/settings/_components/PayrollSettings.tsx)**:
   - Imported the new actions `previewEmployeePayrollPolicyCalculation` and `listEmployeesForPreview`.
   - Restructured the dashboard tab navigation to append the "Calculation Preview" tab.
   - Wired up dropdown selectors and forms for mock parameters (Gross, Check-in, Check-out, OT hours, Late count, Weekend/Holiday flags, other allowances/deductions).
   - Added side-by-side read-only result cards and warning alerts for unassigned shifts/policies.

### New Files Added:
1. **[lib/hr-payroll/policy-calculation.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/lib/hr-payroll/policy-calculation.ts)**:
   - Creates a reusable, pure service layer implementing all 7 policy equations using standard numbers (no Prisma Decimals returned).
2. **[scratch/test-policy-calculation.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/scratch/test-policy-calculation.ts)**:
   - Scratch test suite verifying all 8 required calculation and fallback rules.

---

## 3. Calculation Utility Functions Added
The file `lib/hr-payroll/policy-calculation.ts` exports the following pure functions:
1. **`calculateSalaryBreakdown(input)`**:
   - Spreads Gross Salary into Basic (55%), Rent (26%), Medical (5%), Transport (4%), and Food (10%) defaults.
   - Validates that the percentages sum to exactly 100%.
2. **`calculateOvertimePreview(input)`**:
   - Computes OT rates and totals.
   - Supports `hourBasis` (assigned shift duration vs fixed hours) and `minimumOTMinutes` thresholds.
   - Supports formula-based (Gross-to-Basic ratios) and fixed-rate OT calculation types.
3. **`calculateTiffinPreview(input)`**:
   - Evaluates daily meal allowance if checkout time is past `allowAfterTime` (e.g. 20:00).
4. **`calculateNightBillPreview(input)`**:
   - Evaluates daily night shift allowance.
   - Supports overnight checkout dates (crosses midnight) using business calendars and timezone checks if `supportsOvernightCheckout` is true.
5. **`calculateHolidayBillPreview(input)`**:
   - Computes weekend or public holiday premium rates (`ONE_DAY_GROSS`, `FIXED_AMOUNT`, `OT_BASED`).
   - Checks policy eligibility filters (weekend inclusion, public holiday inclusion).
6. **`calculateLatePolicyPreview(input)`**:
   - Computes converted absent days (e.g., 3 lates = 1 absent).
   - Deducts basic pay for conversion days and forfeits perfect attendance bonuses.
7. **`calculatePayrollPolicyPreview(input)`**:
   - Merges all of the above utilities.
   - Outputs `earningsSummary`, `deductionSummary`, and `netSalaryPreview` based on the formula:
     `Net Salary = Gross Salary + OT Amount + Holiday Bills + Night Bills + Tiffin Bills + Other Allowance - Deductions - Late Deduction - Attendance Bonus Deduction if applicable`

---

## 4. Preview Server Action Added
The following action is added to `payroll-policies.action.ts`:
- **`previewEmployeePayrollPolicyCalculation(input)`**:
  - Validates authentication.
  - Queries `Employee` (salary), `EmployeeType` (retrieving the 7 active policy templates), and `Shift` (starting/ending hour boundaries).
  - Feeds the properties to the pure calculator.
  - Converts all Prisma Decimals to JavaScript standard float numbers, preventing serialization and typecheck warnings.
- **`listEmployeesForPreview()`**:
  - Retrieves active employees list with mapped types and shifts to populate selectors in the preview dashboard.

---

## 5. Calculation Preview UI Details
- **Tab Layout**: Integrated a new "Calculation Preview" tab alongside the CRUD views under `/dashboard/settings?section=payroll`.
- **Form Controls**:
  - Select Employee dropdown.
  - Gross salary input (automatically populated when an employee is selected, but fully customizable).
  - Datetime picker inputs for Check-in and Check-out. (Automatically calculates and sets checkout date to the next calendar day if the employee's shift crosses midnight).
  - Overtime hours input and monthly late count input.
  - Weekend, Public Holiday, and Worked on Holiday switches.
  - Custom fields for other allowance and other deductions.
- **Summary Cards**:
  - **Mappings Summary**: Visualizes the selected employee's metadata, active shift details, and currently assigned policy templates.
  - **Salary Structure**: Lists individual components alongside their amounts and total components check.
  - **Net Payable Breakdown**: Details all earnings, deductions, and the resulting net payable salary.
  - **Rules Verification Details**: Expanded logs detailing calculations, overtime rates, and exact reasons for night/tiffin bill allowances or late penalties.

---

## 6. Validation and Fallback Behavior
- **Missing Employee Type**: Does not crash; defaults to default Gross salary splits (55/26/5/4/10) and zeroes for OT/allowances/penalties.
- **Missing Policy**: Ignores calculations and sets allowance/deduction values to 0 BDT.
- **Missing Shift**: Triggers a yellow warning box advising that the employee lacks an assigned shift. Falls back to a standard 8-hour shift length (09:00 - 17:00) to prevent page crashes.
- **Decimal Conversions**: Replaces Prisma Decimal types with `Number(val)` on retrieval, ensuring that client components do not crash during JSON hydration.

---

## 7. Test/Manual Verification Results
The test script `scratch/test-policy-calculation.ts` was created and run successfully. Results match all required test vectors:
- **Salary breakdown**: Gross 20,000 splits correctly to Basic 11,000, House Rent 5,200, Medical 1,000, Transport 800, Food 2,000. (**PASS**)
- **OT formula**: Gross 15,000, 60% Basic, 30 working days, 8-hour shift, 2.0x multiplier, 2 OT hours = OT rate 75 BDT, OT Amount 150 BDT. (**PASS**)
- **Tiffin allowed**: Checkout at 20:10 with threshold 20:00 = Allowed. (**PASS**)
- **Tiffin disallowed**: Checkout at 19:59 with threshold 20:00 = Disallowed. (**PASS**)
- **Night bill (Overnight)**: Checkout next day 00:10 with threshold 23:55 and overnight checkout enabled = Allowed. (**PASS**)
- **Holiday bill**: Gross 30,000, ONE_DAY_GROSS calculation basis, worked on holiday = 1,000 BDT. (**PASS**)
- **Late policy**: 3 lates with bonus loss count 3 and conversion ratio 3:1 = Converted absent day 1, attendance bonus lost = true. (**PASS**)
- **Missing policies**: Does not crash. Falls back to default splits and zero allowances/deductions. (**PASS**)

---

## 8. Backward Compatibility Notes
- No database tables or columns were removed or modified.
- Nullable fields are handled gracefully by checking for values before applying rules.
- Existing payroll settings and accounting mappings are completely unaffected.

---

## 9. What Was Intentionally Not Changed
- **Payroll generation calculation code**: No changes were made to active monthly payroll generation processes.
- **Attendance processor code**: Attendance log parsing and ZKTeco device communications were left untouched.
- **Shift calculations**: Existing shift timing rules remain strictly shift-bound.
- **Payslip output UI**: The payslip printout and screens were left in their exact initial state.

---

## 10. Commands Run
```bash
# Execute unit tests & validation scripts
npx tsx scratch/test-policy-calculation.ts

# Execute TypeScript compiler type safety check
npm run typecheck
```

---

## 11. Typecheck/Build Result
- `lib/hr-payroll/policy-calculation.ts` compiles with zero errors.
- `payroll-policies.action.ts` compiles with zero errors.
- `PayrollSettings.tsx` compiles with zero errors.
- Untouched legacy biometric device controller warning files remain outside the scope of Phase 3.

---

## 12. Known Issues
- Untouched legacy biometric pages and experimental tests have typecheck warnings, which are pre-existing issues and do not affect our new features.

---

## 13. Next Recommended Phase
- **Phase 4: Attendance Processor Policy Integration**: Integrate the policy calculation utility layer into the live attendance processor (`attendance.action.ts` or biometric queues) to save calculated allowances (Tiffin, Night, Holiday bills) and late deduction parameters directly in `Attendance` records.
