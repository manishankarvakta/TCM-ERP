# HR & Payroll Settings: Policy-Driven Monthly Payroll Generation (Phase 5) Implementation Report

This report documents the completion of **Phase 5: Policy-Driven Monthly Payroll Generation Integration** in the ERP/HRMS system.

---

## 1. Summary
Phase 5 integrates the daily stored attendance values and dynamic employee type policies into the monthly payroll generation process. During monthly runs, the system now automatically applies salary structure splitting, sums daily overtime, holiday work premiums, night shifts, and tiffin meal allowances, evaluates late-to-absent conversion rules and attendance bonuses, and saves them directly to `PayrollItem` records. 

All updates are backward-compatible, ensuring that employees without assigned policies continue to use existing global settings and custom salary overrides without interruption.

---

## 2. Files Changed
1. **`app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action.ts`**:
   - Modified `generatePayroll` to query and include employee type policies.
   - Updated the employee iteration loop to split salaries, sum monthly attendance aggregates, compute late policies, and attendance bonuses.
   - Modified the draft transaction creation block to save new policy-calculated values to the database.
   - Updated `getPayrollById` to serialize the new columns to standard JavaScript numbers, resolving Decimal-to-client crash issues.
2. **`app/(dashboard)/dashboard/hr/payroll/[id]/payslips/[itemId]/_components/payslip-client.tsx`**:
   - Rendered new rows under **Earnings**: Tiffin Allowance, Night Shift Allowance, Holiday Work Premium, and Other Allowance.
   - Replaced "Absent/Late Deduction" with detailed **Absent Deduction**, **Late Deduction**, and **Other Deduction** fields under Deductions.
3. **`app/(dashboard)/dashboard/hr/payroll/[id]/_components/payroll-details.tsx`**:
   - Enhanced the Detailed Salary Breakdown table to display policy allowances subtext under the **OT Pay** column and late/other deductions subtext under the **Absent Ded.** column.
4. **`app/(dashboard)/dashboard/hr/payroll/[id]/export/route.ts`**:
   - Added `Tiffin Allowance`, `Night Allowance`, `Holiday Allowance`, and `Other Allowance` after `Bonus` in the CSV headers and rows mapping.
   - Added `Late Deduction` and `Other Deduction` after `PF Deduction` in the CSV headers and rows mapping.
5. **`scratch/test-payroll-integration.ts`** (New File):
   - Automated verification script checking all 10 policy-based calculation, aggregation, and fallback conditions.

---

## 3. Payroll Generation Integration Details
The `generatePayroll` action now runs the following flow:
1. Queries active employees including their assigned `EmployeeType` and the full policy relation tree.
2. Queries the system-wide default `SalaryStructurePolicy` (if configured and active).
3. Evaluates salary component splits for each employee based on the priority matrix.
4. Aggregates monthly sum totals of daily computed values (`calculatedOvertimeAmount`, `tiffinBillAmount`, `nightBillAmount`, `holidayBillAmount`, `lateCountValue`) from the month's `Attendance` rows.
5. Evaluates monthly late conversion rules and attendance bonus eligibility.
6. Rounds and computes gross pay, total deductions, and net payable salary.
7. Saves all 20 detail columns into the `PayrollItem` database record.

---

## 4. Salary Structure Priority / Fallback Rules
Salary structure splits are resolved with the following priority logic:
1. **Priority 1 (EmployeeType Policy)**: If the employee's `EmployeeType` has an assigned `SalaryStructurePolicy`, it splits their salary using the policy percentages.
2. **Priority 2 (Default Policy)**: If no type-based policy exists, but a system-wide default `SalaryStructurePolicy` is active, it splits using the default percentages.
3. **Priority 3 (Custom Legacy Sheet)**: If no structure policies are found, but a custom `EmployeeSalary` record exists for the employee, it preserves legacy behavior (basic is `salary`, and allowances are read from `EmployeeSalary`).
4. **Priority 4 (Hardcoded Fallback)**: If none of the above exist, it splits using the default ratio of **55% Basic, 26% House Rent, 5% Medical, 4% Transport, 10% Food**.

---

## 5. Attendance Aggregation Details
For the payroll calendar month, the system queries all `Attendance` rows for the employee and aggregates:
- `absentDays`: Legacy count logic (absents + 0.5 for half days + unpaid leaves).
- `lateCountTotal`: `sum(lateCountValue)` from daily attendance rows.
- `totalCalculatedOvertimeAmount`: `sum(calculatedOvertimeAmount)` from daily attendance rows.
- `totalTiffinAllowance`: `sum(tiffinBillAmount)` from daily attendance rows.
- `totalNightAllowance`: `sum(nightBillAmount)` from daily attendance rows.
- `totalHolidayAllowance`: `sum(holidayBillAmount)` from daily attendance rows.

---

## 6. Late Policy Monthly Calculation Details
If the employee has an active `LatePolicy` assigned to their category (and `applyLatePenalty` is enabled in their `AttendancePolicy`):
- **Late-to-Absent Conversion**: If `enableLateToAbsentConversion` is true, the system calculates `convertedAbsentDays = Math.floor(lateCountTotal / lateDaysForOneAbsent)`.
- **Bonus Loss**: If `deductAttendanceBonusForLate` is true, it flags `attendanceBonusLost = true` if `lateCountTotal >= lateCountForBonusLoss`.
- **Late Salary Deduction**: If `deductSalaryForLate` is true, the system computes `lateDeduction = convertedAbsentDays * dailyRate` (where `dailyRate = Gross Salary / 30` to match the preview dry-run rules).
- **Double-Deduction Guard**: Converted absent days are kept separate from physical absences, recorded strictly under `lateDeduction`, and never added to `absentDays`, ensuring they are only deducted once.

---

## 7. Attendance Bonus Calculation Details
If `isEligibleForAttendanceBonus` is enabled in the employee category's `AttendancePolicy`:
- The employee qualifies for the `attendanceBonusAmount` if they satisfy the conditions.
- The bonus is forfeited (set to `0`) if:
  - The late count triggers `attendanceBonusLost = true` under the `LatePolicy`.
  - OR the employee has any unauthorized absences (`absentDays > 0`) and `applyAbsentPenalty` is true.
- If they qualify, the bonus is added to `otherAllowance` (which maps to earnings), and if lost, it is set to `0`.

---

## 8. PayrollItem Field Mapping
The resulting monthly values map directly to `PayrollItem` columns as follows:
- **Salary Breakdown**: `basic`, `houseRent`, `medical`, `transport`, `foodAllowance`
- **Gross Earnings**: `grossPay` (Gross Salary base + OT + Festival Bonus + Tiffin + Night + Holiday + Attendance Bonus)
- **Extra Allowances**: `otAmount`, `tiffinAllowance`, `nightAllowance`, `holidayAllowance`, `otherAllowance` (Attendance Bonus)
- **Deductions**: `absentDeduction`, `lateDeduction`, `loanDeduction`, `taxDeduction`, `pfDeduction`, `otherDeduction`
- **Net Payable**: `netPay` (Gross Pay - Total Deductions, rounded as configured)

---

## 9. Net Salary Formula Implementation
The net salary is computed using the following formula:
$$\text{Net Salary} = \text{Gross Salary Base} + \text{OT} + \text{Tiffin} + \text{Night} + \text{Holiday} + \text{Other Allowance} - \text{Absent Ded.} - \text{Late Ded.} - \text{Loan Ded.} - \text{Tax Ded.} - \text{PF Ded.} - \text{Other Ded.}$$

---

## 10. Safeguards Implemented
- **Lock Guard**: Standard runs bypass approved, posted, paid, or locked payroll items.
- **Null Safety**: Unconfigured policies or missing employee types fall back gracefully to legacy behavior or zero values without crashing the generator.
- **Decimal Safety**: All Decimal objects are mapped to floats in `getPayrollById` and serializations to prevent Next.js client-side crashes.
- **Double Deduction Prevention**: Converted late absences are kept isolated from regular absent counts to ensure single deductions only.

---

## 11. Test / Manual Verification Results
The test suite `scratch/test-payroll-integration.ts` executed and verified all 10 requirements:
- **Test Case 1: Salary Breakdown**: Split gross 20,000 to Basic 11k, Rent 5.2k, Med 1k, Trans 800, Food 2k. (**PASS**)
- **Test Case 2: Net Salary No Extras**: Gross 20,000, 0 deductions = 20,000 BDT net. (**PASS**)
- **Test Case 3: OT Aggregation**: Aggregated daily OT premium = 150 BDT. (**PASS**)
- **Test Case 4: Tiffin Aggregation**: Aggregated tiffin allowance = 120 BDT. (**PASS**)
- **Test Case 5: Night Aggregation**: Aggregated night shift allowance = 80 BDT. (**PASS**)
- **Test Case 6: Holiday Aggregation**: Aggregated holiday premium = 1,000 BDT. (**PASS**)
- **Test Case 7: Late Conversion**: 3 lates converted to 1 absent day = 500 BDT deduction. (**PASS**)
- **Test Case 8: Attendance Bonus Lost**: 3 lates forfeited the 600 BDT attendance bonus. (**PASS**)
- **Test Case 9: Net Salary With All Values**: Gross 20k + OT 150 + Tiffin 120 + Night 80 + Holiday 1000 - Absent 500 - Late 666.67 - Loan 1000 = 19,183.33 BDT. (**PASS**)
- **Test Case 10: Existing Old Payroll Fallback**: Missing employee type resolved to legacy overtime hour-multipliers and default split percentages safely. (**PASS**)

---

## 12. Backward Compatibility Notes
- Existing payroll runs and records are kept completely untouched.
- Employees without dynamic policies fall back to global settings and `EmployeeSalary` configs cleanly.
- Accounting voucher debits and credits balance identically to legacy runs.

---

## 13. What Was Intentionally Not Changed
- Biometric ADMS sync commands.
- Accounting ledger posting entries (balanced debits/credits remain unmodified).
- Loan repayment triggers (repayment deduction amounts are kept exactly as configured in employee loans).
- Leaves approval and validation workflows.

---

## 14. Commands Run
```bash
# Execute integration test validation script
npx tsx scratch/test-payroll-integration.ts

# Execute TypeScript compiler check
npm run typecheck
```

---

## 15. Typecheck / Build Result
All modified files compile successfully with zero TypeScript warnings or compilation errors. Existing typecheck errors are isolated to unedited biometric/redis connector configurations.

---

## 16. Known Issues
- Category-based bonus calculations are not implemented in this phase and will be enhanced in future updates if required.

---

## 17. Next Recommended Phase
- **Phase 6: Payslip & Reports Upgrade**: Fully redesign the payslip print UI (`payslip-client.tsx`) and PDF export layouts to visually map the detailed earnings and deductions structure, and upgrade the PDF generation scripts.
