# HR & Payroll Policy System: Operator & Developer Reference Guide

This guide describes the concepts, setup, calculations, and safety rules of the policy-driven HR & Payroll system.

---

## 1. Architectural Concepts

The system separates attendance timing constraints, dynamic monetary calculations, daily data persistence, and monthly aggregations into isolated, well-defined layers:

```
+--------------------------------------------------------------+
| 1. SHIFT (Time Rules Only)                                   |
|    - startTime, endTime, graceMinutes, otStartAfter          |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 2. PAYROLL SETTINGS & POLICIES (Money & Eligibility Rules)   |
|    - SalaryStructure, Attendance, Late, Overtime, Bills      |
|    - Configured in Settings mapped to Employee Types         |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 3. DAILY ATTENDANCE RECORD (Daily Calculated Values)         |
|    - otHours, calculatedOvertimeAmount                       |
|    - tiffinBillAmount, nightBillAmount, holidayBillAmount    |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 4. PAYROLL ENGINE (Monthly Aggregations)                     |
|    - Monthly sum of daily attendance values                  |
|    - Late converted absent day pay cuts & attendance bonuses  |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 5. PAYSLIP / EXPORT (Presentation & Audits)                  |
|    - Displays Base Gross Salary separately from components  |
|    - Splits Total Earnings (grossPay) and Net Payable        |
+--------------------------------------------------------------+
```

---

## 2. Setup Guide

To configure policy-driven monthly payroll for your organization, follow these steps:

### Step 1: Configure Salary Structure Policies
- Go to `/dashboard/settings?section=payroll` -> **Salary Structure** tab.
- Create a new structure policy (e.g. 55% Basic, 26% House Rent, 5% Medical, 4% Transport, 10% Food).
- *Rule*: The split percentages must sum to exactly **100%**.

### Step 2: Configure Policies
- Configure **Attendance Policies** (e.g. absent deductions enabled, attendance bonus eligibility).
- Configure **Late Policies** (e.g. late count threshold for bonus loss, late-to-absent conversion day divisors).
- Configure **Overtime, Tiffin, Night Shift, and Holiday Policies** to define monetary allowance rates.

### Step 3: Map Policies to Employee Types
- Go to the **Mappings** tab.
- For each Employee Type (e.g. Permanent, Intern, Contractual), select their active salary structure and policy templates.
- Save the mapping (action is fully logged).

### Step 4: Reprocess Attendance (Optional)
- If you change a policy retrospectively for a month, go to the **Reprocess** panel.
- Recalculate daily attendance logs for the target date range. Reprocessing skips locked days unless **Force** is checked.

### Step 5: Generate Monthly Payroll
- Go to `/dashboard/hr/payroll` and click **Generate This Month** (or select a target month).
- The engine aggregates daily logs, computes late penalties, applies attendance bonuses, and saves a locked **Draft** payroll.

### Step 6: Review, Post, and Disburse
- Open the detailed payroll page.
- Audit the 14 columns detailing every component.
- Click **Approve**, then **Post to Accounting** (creates accrual vouchers), and finally **Disburse** (creates payment vouchers and updates employee loan balances).

---

## 3. Calculation Matrix

### A. Salary Component Split
The employee's Gross Base Salary is split into component values:
- `basic = Base Gross * (basicPercent / 100)`
- `houseRent = Base Gross * (houseRentPercent / 100)`
- `medical = Base Gross * (medicalPercent / 100)`
- `transport = Base Gross * (transportPercent / 100)`
- `foodAllowance = Base Gross * (foodPercent / 100)`

### B. Daily Attendance Allowances
Daily amounts computed on each attendance check-out:
- **Overtime Pay**: Calculated daily based on Shift hours and Overtime Policy parameters, then saved to `calculatedOvertimeAmount`.
- **Tiffin Meal**: Awarded daily if checked out after the threshold time, then saved to `tiffinBillAmount`.
- **Night Shift**: Awarded daily for late/overnight checkouts, then saved to `nightBillAmount`.
- **Holiday Premium**: Awarded for checking in on weekends or public holidays, then saved to `holidayBillAmount`.

### C. Monthly Aggregations (Payroll Generation)
At the end of the month, the payroll generator sums the daily values:
- `otAmount = sum(calculatedOvertimeAmount)`
- `tiffinAllowance = sum(tiffinBillAmount)`
- `nightAllowance = sum(nightBillAmount)`
- `holidayAllowance = sum(holidayBillAmount)`

### D. Late Penalties & Attendance Bonuses
- **Late Deduction**: Converted absent days = `floor(totalLates / lateDaysForOneAbsent)`.
  `lateDeduction = Converted Days * (Gross Base Salary / resolvedLateDeductionDivisor)`.
- **Attendance Bonus**: If perfect attendance is kept (0 absences and lates under the threshold), `attendanceBonusAmount` is added to `otherAllowance`. If forfeited, it is set to `0`.

### E. Net Payable Salary Formula
$$\text{Net Payable} = \text{Total Earnings} - \text{Total Deductions}$$

- **Total Earnings (`grossPay`)**:
  $$\text{Base Gross} + \text{OT Pay} + \text{Tiffin} + \text{Night} + \text{Holiday} + \text{Festival Bonus} + \text{Other Allowance (Att. Bonus)}$$
- **Total Deductions (`totalDeduction`)**:
  $$\text{Absent Ded.} + \text{Late Ded.} + \text{Loan Ded.} + \text{Tax Ded.} + \text{PF Ded.} + \text{Other Ded.}$$

---

## 4. System Safeguards & Rules

### 1. Locked Attendance Safeguard
- Reprocessing attendance logs skips any day where `isLocked = true` to protect historical audited attendance from retrospective changes.
- Checking **Force** in the reprocessor panel bypasses this lock for emergency corrections.

### 2. Locked Payroll Safeguard
- Approved, Posted, or Paid payroll runs can **never** be recalculated or generated. Once locked, the data remains immutable.
- Posting a payroll locks all attendance records for that calendar month automatically.

### 3. Double-Deduction Prevention
- Converted absent days from late penalties are saved strictly under the `lateDeduction` column. They are **never** added to the physical `absentDays` counter, ensuring that employees are only deducted once for conversions.

### 4. Accounting Voucher Balance
- Posted payrolls create accounting vouchers where total debits (debit Salary Expense) equal the sum of credit liability accounts (Salary Payable, Loan Advances, Tax, PF, Festival Bonus).
- Cash/Bank disbursement debit matches net salary liability precisely.

### 5. Activity Audit Trail
- All administrative configurations—such as policy creation, parameter updates, soft deletions, and mappings to Employee Types—are tracked with user activity logs.
- Key payroll transitions (generating draft, status updates/approvals, postings to ledger, cash disbursements, and void reversals) write explicit traces to the general database activity logs for absolute auditing.
