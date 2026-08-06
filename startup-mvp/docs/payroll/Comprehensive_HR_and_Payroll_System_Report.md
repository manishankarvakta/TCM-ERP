# Comprehensive HR & Payroll System Report

**System Name**: ffERP Enterprise Resource Planning — HR & Payroll Subsystem  
**Scope**: Full Module Architecture, Policy Rules, Settings, Calculation Engines, Accounting Integration & Audit Compliance  
**Date of Report**: August 6, 2026  
**Status**: Active Production Standard  

---

##  EXECUTIVE SUMMARY

The **ffERP HR & Payroll Subsystem** provides a unified, end-to-end management framework for workforce operations, attendance processing, salary calculations, regulatory compliance, and General Ledger (GL) double-entry financial posting.

### Key Highlights & Innovations
1. **Configurable Absenteeism Rate Basis**: Supports both **Basic Salary Basis (55%)** (Corporate/Executive standard) and **Total Gross Salary Basis (100%)** (Ready-Made Garment / Industrial standard under Section 126 of the Bangladesh Labour Act 2006).
2. **Fixed 30-Day Month Divisor**: Eliminates monthly daily-rate fluctuations by standardizing daily calculations across 28, 30, and 31-day calendar months (`defaultPayDivisor = 30`).
3. **Net 8-Hour Overtime Safeguard**: Enforces that an employee must complete their required net shift working hours (e.g., 8 net work hours) before any Overtime hours are credited, preventing unearned OT payouts on late-arrival days.
4. **Real-Time Draft Recalculation**: Includes a one-click **Recalculate Payroll** action (`recalculatePayroll`) on draft salary sheets to dynamically re-evaluate attendance logs, overtime, loans, fines, and bonuses without deleting the batch ID.
5. **URL-Embedded State Management**: Deep-linking URL tab synchronization (`?section=payroll&tab=global`) ensures active tabs remain locked during browser refreshes or form submissions.
6. **Automated Double-Entry Accrual**: Generates balanced General Ledger accrual and disbursement journal vouchers (`Debit Expenses = Credit Liabilities + Credit Recoveries`).

---

## 1. SUBMODULE ARCHITECTURE SITEMAP

The HR and Payroll subsystem is structured into 11 specialized submodules:

```
  app/(dashboard)/dashboard/hr/
  ├── employees/           # 1. Employee Directory & Profiles
  ├── shift/               # 2. Shift Windows & Duty Schedules
  ├── attendance/          # 3. Attendance Logs & Manual Corrections
  ├── leave/               # 4. Leave Types, Balances & Applications
  ├── holiday/             # 5. Public Holiday Calendar
  ├── loan/                # 6. Employee Loan & Salary Advance
  ├── fine/                # 7. Disciplinary Fines & Deductions
  ├── bonus/               # 8. Custom Performance Bonuses
  ├── resignation/         # 9. Resignations & Final Settlements
  ├── payroll/             # 10. Monthly Payroll Engine & GL Postings
  └── settings/            # 11. Global HR Policies & Calculation Rules
```

---

## 2. DETAILED SUBMODULE BREAKDOWN

### Submodule 1: Employee Directory (`/dashboard/hr/employees`)
- **Primary Model**: `Employee`, `EmployeeType`, `EmployeeSalary`.
- **Functionality**: Maintains employee profiles, contract gross salaries, bank/MFS account numbers, structural designations, and linked General Ledger Salary Payable Accounts.

### Submodule 2: Shift Management (`/dashboard/hr/shift`)
- **Primary Model**: `Shift`.
- **Parameters**: `startTime` (08:00), `endTime` (17:00), `graceMinutes` (7), `lateAfter` (10), `otStartAfter` (27), `breakType` (`FIXED` / `TRACKED`), `breakDuration` (60m).
- **Cross-Midnight Support**: Built-in 4-hour pre/post buffer resolving overnight shifts to correct operational attendance dates.

### Submodule 3: Daily Attendance Engine (`/dashboard/hr/attendance`)
- **Primary Model**: `AttendanceLog`, `Attendance`.
- **Functionality**: Pairs biometric check-in/check-out punches, deducts lunch breaks, calculates net work hours, tracks lateness, and determines attendance statuses (`PRESENT`, `LATE`, `HALF_DAY`, `ABSENT`, `WEEKEND`, `LEAVE`).

### Submodule 4: Leave Management (`/dashboard/hr/leave`)
- **Primary Model**: `LeaveType`, `LeaveBalance`, `LeaveApplication`.
- **Functionality**: Manages leave entitlements (Casual, Sick, Annual, Maternity), tracks balances, and updates attendance status upon approval.

### Submodule 5: Public Holiday Calendar (`/dashboard/hr/holiday`)
- **Primary Model**: `PublicHoliday`.
- **Functionality**: Manages gazetted public holidays. On-duty work on public holidays triggers holiday allowance policies.

### Submodule 6: Employee Loan & Salary Advance (`/dashboard/hr/loan`)
- **Primary Model**: `EmployeeLoan`.
- **Functionality**: Tracks long-term loans and salary advances. Automatically recovers monthly installments during payroll calculation.

### Submodule 7: Disciplinary Fines (`/dashboard/hr/fine`)
- **Primary Model**: `EmployeeFine`.
- **Functionality**: Manages approved disciplinary penalties for damage or policy breaches. Summed and deducted on monthly salary sheets.

### Submodule 8: Custom Performance Bonus (`/dashboard/hr/bonus`)
- **Primary Model**: `EmployeeBonus`.
- **Functionality**: Tracks individual performance or project bonuses granted to employees outside standard salary allowances.

### Submodule 9: Resignation & Offboarding (`/dashboard/hr/resignation`)
- **Primary Model**: `Resignation`.
- **Functionality**: Handles resignation notice periods, exit clearances, and final settlement proration.

### Submodule 10: Monthly Payroll Engine (`/dashboard/hr/payroll`)
- **Primary Model**: `Payroll`, `PayrollItem`.
- **Functionality**: Aggregates monthly attendance, overtime, basic/allowance splits, absenteeism deductions, late penalties, loans, fines, and bonuses into draft salary sheets. Posts double-entry journal vouchers to General Ledger.

### Submodule 11: Policy & Calculation Settings (`/dashboard/settings?section=payroll`)
- **Primary Model**: `Settings` (`code = "payroll.settings"`).
- **Functionality**: Configures global calculation rules (Absent Rate Basis, Month Divisor Mode, Working Hours, Overtime Multipliers).

---

## 3. MATHEMATICAL CALCULATION ENGINE FORMULAS

### 1. Base Salary Component Split (55/26/5/4/10)
For any employee contract gross salary ($S_{\text{Gross}}$):
$$\text{Basic Salary } (B) = S_{\text{Gross}} \times 0.55$$
$$\text{House Rent Allowance } (HR) = S_{\text{Gross}} \times 0.26$$
$$\text{Medical Allowance } (M) = S_{\text{Gross}} \times 0.05$$
$$\text{Transport Allowance } (T) = S_{\text{Gross}} \times 0.04$$
$$\text{Food Allowance } (F) = S_{\text{Gross}} \times 0.10$$

### 2. Daily Rate & Absenteeism Deduction
Let $D$ be the monthly divisor ($D = 30$ in Fixed Working Days Mode).  
Let $N$ be the absent rate numerator:
- **`BASIC` Basis**: $N = B$ (55% Basic Salary).
- **`GROSS` Basis**: $N = S_{\text{Gross}}$ (100% Total Gross Salary).

$$\text{Daily Absent Rate } (R_{\text{absent}}) = \frac{N}{D}$$

$$\text{Absenteeism Cut } (D_{\text{absent}}) = \text{Round}_2\Big(\text{Absent Days} \times R_{\text{absent}}\Big)$$

### 3. Net Payable Salary Formula
$$\text{Gross Pay } (G_{\text{total}}) = B + HR + M + T + F + E_{\text{OT}} + A_{\text{allowances}} + B_{\text{bonus}}$$
$$\text{Total Deductions } (D_{\text{total}}) = D_{\text{absent}} + D_{\text{late}} + D_{\text{loan}} + D_{\text{tax}} + D_{\text{pf}} + F_{\text{fine}}$$
$$\text{Net Payable Salary } (S_{\text{Net}}) = G_{\text{total}} - D_{\text{total}}$$

---

## 4. GENERAL LEDGER ACCOUNTING INTEGRATION

Upon posting a payroll batch to General Ledger via `postPayroll`:

```
  JOURNAL VOUCHER ACCRUAL POSTING
  ========================================================================
  DEBIT  : Salary & Benefits Expense Account          [G_total]
  CREDIT : Net Salary Payable Liability Account       [S_Net]
  CREDIT : Employee Loan Recovery Account             [D_loan]
  CREDIT : Income Tax Payable Account                 [D_tax]
  CREDIT : Provident Fund Payable Account             [D_pf]
  CREDIT : Unapproved Absenteeism Recovery Account    [D_absent]
  ========================================================================
  BALANCE PROOF: Total Debits == Total Credits
```

---

## 5. AUDIT COMPLIANCE & GOVERNANCE

1. **Attendance Lock (`isLocked = true`)**: Once a payroll run is approved or posted, associated daily attendance records are locked (`isLocked = true`). Biometric re-sync skips locked rows to prevent historical tampering.
2. **Immutable Audit Trail (`UserLog`)**: All policy changes, draft recalculations, status updates, and GL postings write immutable audit logs containing user IDs, timestamps, and previous state snapshots.
