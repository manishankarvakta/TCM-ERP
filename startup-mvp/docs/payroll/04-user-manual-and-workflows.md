# 04. End-User Operational Manual & Workflows

This document is the step-by-step operational manual for **HR Officers**, **Payroll Managers**, and **Chief Accountants** using ffERP.

---

## 1. Monthly Payroll Workflow Overview

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         MONTHLY PAYROLL OPERATIONAL WORKFLOW                │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ Step 1: Configure / Verify Policy Settings & Rules                          │
 │         (Navigate to /dashboard/settings?section=payroll&tab=global)        │
 │                                                                             │
 │ Step 2: Ingest & Process Biometric Device Attendance Logs                   │
 │         (Navigate to /dashboard/hr/attendance)                              │
 │                                                                             │
 │ Step 3: Generate Monthly Draft Payroll Batch                                │
 │         (Navigate to /dashboard/hr/payroll -> "Generate Payroll")           │
 │                                                                             │
 │ Step 4: Audit & Recalculate Draft Salary Sheets                             │
 │         (Navigate to /dashboard/hr/payroll/[id] -> "Recalculate Payroll")   │
 │                                                                             │
 │ Step 5: Approve Payroll Batch                                               │
 │         (Click "Approve Payroll")                                           │
 │                                                                             │
 │ Step 6: Post to General Ledger & Disburse Salaries                          │
 │         (Click "Post to Accounting" -> Generates Accrual Journal Voucher)   │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step User Instructions

### Step 1: Configuring Global Payroll Rules
1. Log in as an Administrator.
2. Go to **Dashboard Settings**: [`/dashboard/settings?section=payroll`](http://localhost:3000/dashboard/settings?section=payroll).
3. Select the **Global Rules** tab ([`tab=global`](http://localhost:3000/dashboard/settings?section=payroll&tab=global)).
4. Set **Absent Deduction Days Basis** to **Fixed Working Days** and enter **30**.
5. Set **Absent Deduction Salary Rate Basis** to **Basic Salary Basis (55%)** (for Corporate) or **Total Gross Salary Basis (100%)** (for RMG Factories).
6. Click **Save Settings**.

---

### Step 2: Processing Attendance Logs
1. Go to **HR Management** $\rightarrow$ **Attendance**: [`/dashboard/hr/attendance`](http://localhost:3000/dashboard/hr/attendance).
2. Ensure all biometric devices are synced or click **Process Attendance**.
3. Review unresolved attendance warnings (missing check-out punches, unapproved absences).

---

### Step 3: Generating Draft Payroll
1. Go to **HR Management** $\rightarrow$ **Payroll**: [`/dashboard/hr/payroll`](http://localhost:3000/dashboard/hr/payroll).
2. Click **Generate Payroll**.
3. Select the target **Month** (e.g. July) and **Year** (e.g. 2026).
4. Click **Create Payroll Batch**. The system creates a new batch in **`DRAFT`** status (e.g. `PR-2026-07`).

---

### Step 4: Using the "Recalculate Payroll" Button
If attendance logs were updated or policy settings were modified after draft creation:
1. Open the draft payroll details page (e.g. [`/dashboard/hr/payroll/[id]`](http://localhost:3000/dashboard/hr/payroll/cmsgp8zqh0007ckmihsosdc7n)).
2. Click the **Recalculate Payroll** button next to "Approve Payroll".
3. The system will re-process all 207 employee items in real time, updating total gross, deductions, and net pay automatically.

---

### Step 5: Approving & Posting to Accounting
1. Verify the 14-column salary ledger table on the UI.
2. Click **Approve Payroll**. The batch status changes to **`APPROVED`**.
3. Click **Post to Accounting**. Select the **Salary Expense Chart of Account**.
4. The system automatically creates a balanced General Ledger Accrual Journal Voucher and locks all attendance records for the month (`isLocked = true`).
5. Click **Disburse Salary** to select Bank/Cash accounts and issue disbursement payments.

---

## 3. Printing Payslips & Exporting CSV

- **Print All Payslips**: Click **Print all Payslip** on any payroll details page to generate printable vertical 3-column salary component payslips for all employees.
- **Export 33-Column CSV**: Click **Export CSV** to stream a complete 33-column bank payroll export for direct bank transfer upload.
