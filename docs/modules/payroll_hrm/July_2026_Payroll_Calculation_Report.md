# Employee Payroll Generation & Calculation Report: July 2026

**Payroll Period**: July 1, 2026 – July 31, 2026  
**Target Batch ID**: `PR-2026-07` (`cmsgqmnsv0007ckh1u3myxrhj`)  
**Target Employee**: Abdullah AL Mamun Molla (`EMP1000171`)  
**Designation**: Cutting Manager (Employee Type: Manager)  
**Contract Monthly Gross**: ৳45,000.00  
**Date of Report**: August 6, 2026  

---

## 1. EXECUTIVE SUMMARY & INVESTIGATION BACKGROUND

This report details the audit, root-cause diagnostics, code fixes, and final calculation results for **July 2026 Payroll** generation for employee **Abdullah AL Mamun Molla (`EMP1000171`)**.

### Initial Anomalies Reported by User
1. **Base Gross Inflation**: Initial draft generation showed Base Gross as **৳46,451.61** instead of contract gross **৳45,000.00**.
2. **Absenteeism Deduction Confusion**: Absenteeism cut was logged as **৳16,366.94** (which appeared to represent ~10.9 days if divided by Gross rate ৳1,498.44/day, whereas the employee had 20.5 absent days).
3. **Month Divisor Discrepancy**: Default calculation engine used 31 calendar days for July instead of the UI setting of 30 fixed working days.

---

## 2. ROOT CAUSE DIAGNOSTICS & CODE FIXES

### Bug 1: Millisecond Date Proration Inflation (`1.032258` Proration Factor)
- **Root Cause**: In [`payroll.action.ts`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action.ts), `activeDays` was calculated using date timestamp subtraction `(endDate - startDate) / 86400000`. Subtracting July 31 23:59:59 from July 1 00:00:00 yielded **31.99 days (32 days)**.
- **Impact**: For a 31-day month, `prorationFactor` evaluated to $\frac{32}{31} = \mathbf{1.032258}$. This multiplied contract gross $\text{৳45,000.00} \times 1.032258 = \mathbf{\text{৳46,451.61}}$.
- **Fix Applied**: Updated `generatePayroll` and `recalculatePayroll` to explicitly check `isFullMonth` status (`joiningDate <= startDate` & active). Full-month employees are explicitly assigned `prorationFactor = 1.0`, locking Base Gross to contract **৳45,000.00**.

### Bug 2: Missing Setting Fallback in `getPayrollSettings()`
- **Root Cause**: In [`lib/payroll-settings.ts`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/lib/payroll-settings.ts), `getPayrollSettings()` looked for user-specific settings rows. When unpopulated, it fell back to hardcoded defaults (`absentDeductionMode: "calendar"`) without checking the latest active database setting row.
- **Fix Applied**: Added cross-user fallback resolution in `getPayrollSettings()` to fetch the latest active `payroll.settings` row from PostgreSQL, ensuring UI settings (`absentDeductionMode: "working"`, `standardWorkingDays: 30`) take immediate effect across all payroll functions.

---

## 3. JULY 2026 ATTENDANCE SUMMARY (`EMP1000171`)

- **Total Calendar Days**: 31 Days
- **Worked Days (Present / Late)**: 10.5 Days
- **Evaluated Absent Days**: **20.5 Days** (20 full absent days + 1 half day)
- **Approved Paid Leave**: 0.0 Days

---

## 4. MATHEMATICAL COMPARISON: BASIC BASIS VS. GROSS BASIS

Following the implementation of the configurable **Absent Deduction Salary Rate Basis** (`absentDeductionBasis: "BASIC" | "GROSS"`), here is the side-by-side comparison for July 2026:

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │               JULY 2026 PAYROLL COMPARISON FOR EMP1000171                   │
 ├──────────────────────────────────────┬──────────────────┬───────────────────┤
 │ Calculation Parameter                │ Basic Basis (55%)│ Gross Basis (100%)│
 ├──────────────────────────────────────┼──────────────────┼───────────────────┤
 │ Contract Monthly Gross               │       ৳45,000.00 │        ৳45,000.00 │
 │ Basic Salary (55%)                   │       ৳24,750.00 │        ৳24,750.00 │
 │ House Rent Allowance (26%)           │       ৳11,700.00 │        ৳11,700.00 │
 │ Medical Allowance (5%)               │        ৳2,250.00 │         ৳2,250.00 │
 │ Transport Allowance (4%)             │        ৳1,800.00 │         ৳1,800.00 │
 │ Food Allowance (10%)                 │        ৳4,500.00 │         ৳4,500.00 │
 ├──────────────────────────────────────┼──────────────────┼───────────────────┤
 │ Pay Divisor (Fixed Working Days)     │          30 Days │           30 Days │
 │ Daily Deduction Rate                 │     ৳825.00 / day│   ৳1,500.00 / day │
 │ Evaluated Absent Days                │        20.5 Days │         20.5 Days │
 ├──────────────────────────────────────┼──────────────────┼───────────────────┤
 │ ABSENTEEISM DEDUCTION AMOUNT         │      -৳16,912.50 │       -৳30,750.00 │
 ├──────────────────────────────────────┼──────────────────┼───────────────────┤
 │ TOTAL GROSS PAY                      │       ৳45,000.00 │        ৳45,000.00 │
 │ TOTAL DEDUCTIONS                     │       ৳16,912.50 │        ৳30,750.00 │
 ├──────────────────────────────────────┼──────────────────┼───────────────────┤
 │ FINAL NET PAYABLE SALARY             │       ৳28,087.50 │        ৳14,250.00 │
 └──────────────────────────────────────┴──────────────────┴───────────────────┘
```

---

## 5. DATABASE VERIFICATION & AUDIT PROOF

PostgreSQL table `PayrollItem` record for `EMP1000171` in batch `PR-2026-07`:

```json
{
  "id": "cmsgrcej80002ckwvugxs3c0q",
  "payrollId": "cmsgqmnsv0007ckh1u3myxrhj",
  "employeeCode": "EMP1000171",
  "employeeName": "Abdullah AL Mamun Molla",
  "basic": "24750.00",
  "houseRent": "11700.00",
  "medical": "2250.00",
  "transport": "1800.00",
  "foodAllowance": "4500.00",
  "grossPay": "45000.00",
  "absentDeduction": "16912.50",
  "totalDeduction": "16912.50",
  "netPay": "28087.50",
  "status": "unpaid"
}
```

---

## 6. CONCLUSION & RECOMMENDATIONS

1. **Calculations Corrected**: Both Base Gross (৳45,000.00) and Absenteeism Cut (৳16,912.50 on Basic basis / ৳30,750.00 on Gross basis) are verified 100% mathematically accurate.
2. **Flexible Setting Available**: HR Administrators can toggle between Basic and Gross deduction basis at any time under Settings ([`/dashboard/settings?section=payroll&tab=global`](http://localhost:3000/dashboard/settings?section=payroll&tab=global)) and click **Recalculate Payroll** on draft salary sheets.
