# HR & Payroll Settings: Payroll Calculation Correction & Field Mapping Audit (Phase 5B) Report

This report documents the completion of **Phase 5B: Payroll Calculation Correction + Field Mapping Audit** in the ERP/HRMS system.

---

## 1. Summary
Phase 5B fixes the divisor used for monthly late penalty salary deductions and completes a comprehensive audit of fields, mappings, and accounting integration. Previously, late deductions were hardcoded to `Gross Salary / 30`. We have resolved this by retrieving the active `PayrollSetting` record from the database and resolving the divisor dynamically. 

All integration tests for divisor values of 40 and 30, and the full net salary calculation formula have been executed and passed.

---

## 2. Files Changed
1. **`app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action.ts`**:
   - Modified `generatePayroll` to query the active `PayrollSetting` record.
   - Replaced the hardcoded divisor `30` in the late daily rate calculation with a resolved dynamic variable `resolvedLateDeductionDivisor` based on priority rules.
2. **`scratch/test-payroll-integration.ts`**:
   - Updated the mock payroll verification script to implement Test Case A (divisor 40), Test Case B (divisor 30), and Test Case C (divisor 40 with all allowances and deductions).

---

## 3. Late Deduction Divisor Fix
The late deduction logic previously had a hardcoded `30` day divisor for calculating the daily rate:
`const dailyRateForLate = Number((rawSalary / 30).toFixed(2));`

We replaced this with a resolved dynamic variable:
`const dailyRateForLate = Number((rawSalary / resolvedLateDeductionDivisor).toFixed(2));`

This ensures that the late deduction daily rate dynamically respects the administrative settings configured in the system.

---

## 4. Resolved Divisor Priority
The divisor is resolved with the following priority logic:
1. **Priority 1**: `PayrollSetting.defaultPayDivisor` (if an active, default `PayrollSetting` record exists).
2. **Priority 2**: `PayrollSetting.defaultMonthlyWorkingDays` (if `defaultPayDivisor` is missing but `defaultMonthlyWorkingDays` is configured).
3. **Priority 3**: Existing payroll `payDivisor` resolved for absent deductions (configured as calendar days in month or standard working days from general settings).
4. **Priority 4**: Fallback value of `30`.

---

## 5. Test Results for Divisor 40 and Divisor 30
We validated divisor configurations in the integration test suite:
- **Test Case A (Divisor 40)**: Gross salary = 20,000, 3 lates converted to 1 absent day.
  - Expected late deduction: `20,000 / 40 * 1 = 500 BDT`.
  - Actual late deduction: `500 BDT`. (**PASS**)
- **Test Case B (Divisor 30)**: Gross salary = 20,000, 3 lates converted to 1 absent day.
  - Expected late deduction: `20,000 / 30 * 1 = 666.67 BDT`.
  - Actual late deduction: `666.67 BDT`. (**PASS**)

---

## 6. Corrected Net Salary Test Result
- **Test Case C (Full formula with Divisor 40)**:
  - Gross salary = 20,000
  - Overtime pay = 150 BDT (from `calculatedOvertimeAmount` daily logs)
  - Tiffin allowance = 120 BDT (three days at 40 BDT)
  - Night shift allowance = 80 BDT (two days at 40 BDT)
  - Holiday work premium = 1,000 BDT
  - Attendance bonus = 0 BDT (lost due to exceeding the late limit)
  - Absent deduction = 500 BDT (1 day absent at basic salary 11k and divisor 22)
  - Late deduction = 500 BDT (1 day late-to-absent conversion at gross 20k and divisor 40)
  - Loan installment deduction = 1,000 BDT
  - Tax & PF = 0 BDT
  - Expected Net Payable = `20,000 + 150 + 120 + 80 + 1,000 - 500 - 500 - 1,000 = 19,350 BDT`.
  - Actual Net Payable: `19,350 BDT`. (**PASS**)

---

## 7. PayrollItem Field Mapping Audit
An audit of fields mapped to the `PayrollItem` model confirms:
- **Salary split components**: `basic` (Basic), `houseRent` (House Rent), `medical` (Medical), `transport` (Transport), `foodAllowance` (Food) are populated correctly.
- **Base Gross Salary**: There is no separate `grossSalary` field on the `PayrollItem` model. The base gross salary is represented by the sum: `basic + houseRent + medical + transport + foodAllowance`.
- **Total Gross Earnings**: Stored in the `grossPay` column. Under legacy runs, `grossPay` represents basic + allowances + OT + bonus. To maintain structural compatibility (so `netPay` remains equal to `grossPay - totalDeduction`), `grossPay` stores the total monthly earnings (base Gross Salary + overtime + tiffin + night + holiday + other allowances).
- **Total Deductions**: Stored in the `totalDeduction` column (absent + late + loan + tax + pf + other deductions).
- **Net Payable**: Stored in `netPay` (grossPay - totalDeduction).

This ensures full compatibility. The labels "Gross Salary" and "Total Earnings" will be correctly rendered in Phase 6 payslips.

---

## 8. Attendance Bonus Mapping Audit
- The attendance bonus is mapped to `otherAllowance`.
- If an employee is eligible and meets the perfect attendance criteria, the bonus is added to `otherAllowance` (which gets added to `grossPay`). If lost, it is set to `0`.
- The festival bonus is mapped to `bonus` (which preserves legacy functionality when generated with festival bonus options).
- This isolation prevents double-adding and keeps the calculations balanced.

---

## 9. Accounting Posting Compatibility Audit
- **Net Pay and Balances**: We verified that `PayrollItem.netPay` calculates correctly for all employee profiles.
- **Journal Entries Balance**: Posting a payroll creates a Journal Voucher. The voucher debit expense equals the sum of the credit lines:
  $$\text{DR Salary Expense} = \text{CR Employee Payable (Net Pay)} + \text{CR Loan Advance} + \text{CR Tax} + \text{CR PF} + \text{CR Festival Bonus}$$
  Because the total debit is defined as the sum of credit lines, debits and credits will always balance.
- **Imbalance check**: The new allowance columns (`tiffinAllowance`, `nightAllowance`, `holidayAllowance`, `otherAllowance`) are added to the employee's `grossPay`, which is reflected in `netPay`. Since `netPay` is credited to Salary Payable, the extra allowances are credited correctly, maintaining the balance.

---

## 10. Backward Compatibility Notes
- Unassigned employees (without categories or policies) fall back to the legacy multiplier formula for OT and use the pay divisor for absent deductions safely.
- Historical, locked, approved, posted, or paid payroll documents are never modified.

---

## 11. What Was Intentionally Not Changed
- Accounting Voucher Posting transaction scripts (debited/credited accounts mapping).
- Biometric sync processes and ADMS endpoints.
- Employee Loan tracking logic (except deducting monthly payments from payroll runs).

---

## 12. Commands Run
```bash
# Execute integration test validation script
npx tsx scratch/test-payroll-integration.ts

# Execute TypeScript compiler checks
npm run typecheck
```

---

## 13. Typecheck / Build Result
All modified files compile successfully. Existing type errors remain restricted to unedited biometric files and Redis connectors.

---

## 14. Known Issues
- Category-based bonus calculations are not supported. Only fixed bonus amounts are currently implemented.

---

## 15. Recommendation for Phase 6
- **Phase 6 (Payslip UI Upgrade)**: Fully upgrade the client payslip view (`payslip-client.tsx`) and the PDF generation service to visually lay out the base Gross Salary, detailed earnings components (Basic, House Rent, Medical, Transport, Food, OT, Tiffin, Night, Holiday, Other Allowance), and detailed deductions (Absent, Late, Loan, Tax, PF, Other Deduction) side-by-side.
