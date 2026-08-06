# 01. HR & Payroll System Architecture & Modules

This document provides a comprehensive technical overview of the **ffERP HR Subsystem Architecture**, detailing all 11 submodules, database models, data processing pipelines, and system integration points.

---

## 1. System Sitemap & Submodule Map

The HR and Payroll subsystem is located under [`app/(dashboard)/dashboard/hr`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/hr) and comprises 11 functional submodules:

```
  app/(dashboard)/dashboard/hr/
  ├── employees/           # Submodule 1: Employee Directory & Profiles
  ├── shift/               # Submodule 2: Shift Configurations & Windows
  ├── attendance/          # Submodule 3: Daily Attendance Logs & Manual Corrections
  ├── leave/               # Submodule 4: Leave Types, Entitlements & Applications
  ├── holiday/             # Submodule 5: Public Holiday Calendar
  ├── loan/                # Submodule 6: Employee Loan & Advance Management
  ├── fine/                # Submodule 7: Disciplinary Fines & Deductions
  ├── bonus/               # Submodule 8: Custom Performance Bonuses
  ├── resignation/         # Submodule 9: Resignations & Final Settlements
  ├── payroll/             # Submodule 10: Monthly Payroll Generation & Postings
  └── settings/            # Submodule 11: Global HR Policies & Calculation Rules
```

---

## 2. 11 Submodules Technical Breakdown

### 1. Employee Directory (`/dashboard/hr/employees`)
- **Purpose**: Manages complete employee lifecycle data, contract gross salaries, Bank / MFS details, shift assignments, and employee type categorization.
- **Key Prisma Models**: [`Employee`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/schema.prisma#L1220), `EmployeeType`, `EmployeeSalary`.
- **Primary Actions**: Create/Update Employee, assign shift/policy, link GL Salary Payable Account.

### 2. Shift Management (`/dashboard/hr/shift`)
- **Purpose**: Defines duty windows, grace periods, lateness thresholds, lunch break types, and overtime buffer rules.
- **Key Prisma Model**: [`Shift`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/schema.prisma#L1280).
- **Core Parameters**: `startTime`, `endTime`, `graceMinutes`, `lateAfter`, `halfDayAfter`, `otStartAfter`, `breakType` (`FIXED` / `TRACKED` / `NONE`), `breakDuration`.

### 3. Attendance Management (`/dashboard/hr/attendance`)
- **Purpose**: Ingests raw biometric device punches, pairs check-in/check-out, calculates net work hours, tracks late arrivals, and maintains attendance status (`PRESENT`, `LATE`, `HALF_DAY`, `ABSENT`, `WEEKEND`, `LEAVE`).
- **Key Prisma Models**: `AttendanceLog`, [`Attendance`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/schema.prisma#L1310).

### 4. Leave Management (`/dashboard/hr/leave`)
- **Purpose**: Manages leave categories (Casual, Sick, Annual, Maternity), paid vs. unpaid leave types, balance tracking, and application approvals.
- **Key Prisma Models**: `LeaveType`, `LeaveBalance`, `LeaveApplication`.

### 5. Public Holiday Calendar (`/dashboard/hr/holiday`)
- **Purpose**: Maintains official national public holiday schedules. On-duty work on public holidays triggers holiday allowance policies.
- **Key Prisma Model**: `PublicHoliday`.

### 6. Employee Loan & Advance (`/dashboard/hr/loan`)
- **Purpose**: Handles employee salary advances and multi-month loan repayments. Automatically recovers monthly installments during payroll generation.
- **Key Prisma Model**: [`EmployeeLoan`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/schema.prisma#L1520).

### 7. Disciplinary Fines (`/dashboard/hr/fine`)
- **Purpose**: Records approved monetary penalties for policy violations, damage, or misconduct. Summed and deducted in monthly payroll.
- **Key Prisma Model**: `EmployeeFine`.

### 8. Custom Performance Bonus (`/dashboard/hr/bonus`)
- **Purpose**: Tracks approved performance or project bonuses granted to employees outside standard salary allowances.
- **Key Prisma Model**: `EmployeeBonus`.

### 9. Resignations & Settlement (`/dashboard/hr/resignation`)
- **Purpose**: Manages employee offboarding, resignation notice periods, and final settlement salary proration.
- **Key Prisma Model**: `Resignation`.

### 10. Monthly Payroll Engine (`/dashboard/hr/payroll`)
- **Purpose**: Aggregates attendance logs, allowances, overtime, absenteeism deductions, late penalties, loans, fines, and bonuses into monthly salary sheets. Posts double-entry journal vouchers to General Ledger.
- **Key Prisma Models**: [`Payroll`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/schema.prisma#L1600), [`PayrollItem`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/schema.prisma#L1630).

### 11. Policy & Calculation Settings (`/dashboard/settings?section=payroll`)
- **Purpose**: Configures global calculation rules (Absent Deduction Basis, Month Divisor Mode, Working Hours, Overtime Multipliers).
- **Key Prisma Model**: `Settings` (`code = "payroll.settings"`), `PayrollSetting`.

---

## 3. Data Processing Architecture (Log to Payroll Pipeline)

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         BIOMETRIC TO PAYROLL PIPELINE                       │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │                                                                             │
 │  1. Biometric Hardware Device / ZKTeco Push API                              │
 │      │                                                                      │
 │      ▼                                                                      │
 │  2. Raw Punch Ingestion (`AttendanceLog`)                                   │
 │      │  - Filter rapid punches (< 2 mins)                                   │
 │      │  - Route overnight punches via Shift Buffer                          │
 │      ▼                                                                      │
 │  3. Attendance Processing (`processBiometricAttendance`)                    │
 │      │  - Check-In & Check-Out Pairing                                      │
 │      │  - Net Work Hours Calculation (`calculateWorkHoursWithBreak`)        │
 │      │  - Net 8-Hour Overtime Safeguard (`calculateOTHours`)                 │
 │      │  - Status Resolution (PRESENT / LATE / HALF_DAY / ABSENT)            │
 │      ▼                                                                      │
 │  4. Daily Attendance Table (`Attendance`)                                   │
 │      │                                                                      │
 │      ▼                                                                      │
 │  5. Monthly Payroll Aggregator (`generatePayroll` / `recalculatePayroll`)   │
 │      │  - Contract Base Split (55/26/5/4/10)                                │
 │      │  - Absenteeism Deduction (BASIC vs GROSS Basis)                      │
 │      │  - Loan Installments & Disciplinary Fines                             │
 │      ▼                                                                      │
 │  6. Draft Salary Sheet (`Payroll` & `PayrollItem`)                          │
 │      │                                                                      │
 │      ▼                                                                      │
 │  7. General Ledger Journal Voucher (`postPayroll`)                          │
 │         Debit: Salary & Benefits Expense                                    │
 │         Credit: Net Salary Payable Liability                                │
 │         Credit: Absenteeism & Loan Recovery                                 │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Architectural Boundaries & Data Protection

1. **Payroll Lock (`isLocked = true`)**:
   - Once a payroll run is approved or posted to General Ledger, all associated `Attendance` records for that month are locked (`isLocked = true`).
   - Biometric re-sync commands automatically skip locked attendance rows to preserve audit history.
2. **Draft Reconfigurability**:
   - As long as a payroll run remains in **`DRAFT`** status, clicking **"Recalculate Payroll"** safely re-aggregates live attendance and policy changes without deleting the batch ID.
