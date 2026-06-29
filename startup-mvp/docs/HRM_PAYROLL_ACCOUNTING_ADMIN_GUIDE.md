# Enterprise HRM & Payroll System: Complete Configuration & Accounting Guide

This document is the definitive guide for **System Administrators**, **HR Managers**, and **Company Accountants** to configure, manage, and audit the HRM & Payroll module. It describes employee setup, policy configurations, biometric mappings, and every accounting posting situation.

---

## 1. Prerequisites: Chart of Accounts (COA) Setup

Before setting up employees or generating payroll, your accountant must verify that the following accounts are created in the **Chart of Accounts (COA)**:

### Required Settings Accounts
These must be configured in **Accounting Settings** -> **Payroll** mapping tab:
1.  **Salary Expense Account**: Debited for the total salary costs of the organization (Gross Base Salary + Allowances + Bonuses).
2.  **Salary Payable Parent Account**: Credited for employee net salaries. The system uses this parent to track individual employee liabilities if individual accounts are not specified.
3.  **Employee Advance Parent Account**: Used to track loan issuances and monthly deductions.
4.  **Tax Payable Account**: Credited for government tax withholdings deducted from employees.
5.  **Provident Fund (PF) Payable Account**: Credited for employee-contributed provident fund deductions.
6.  **Employer PF Expense Account**: Debited for the company's matching provident fund contribution.
7.  **Employer PF Payable Account**: Credited for the matching liability to the provident fund authority.
8.  **Festival Bonus Account**: Used for accruing holiday or festival bonus disbursements.

### Individual Employee Accounts (Best Practice)
For accurate auditing, each employee profile should map to their own unique accounts:
*   **Salary Payable Account**: Created under the "Salary Payable" parent liability group.
*   **Advance Account**: Created under the "Loans & Advances" asset group to track employee loans.

---

## 2. Admin Settings & Policy Configurations

The system uses a hierarchical rules engine. Settings and constraints are configured globally, mapped to **Employee Types**, and applied dynamically to daily logs and monthly runs.

```
+------------------+     maps to     +-------------------+     calculates     +--------------------+
| Admin Policies   | --------------> | Employee Type     | -----------------> | Monthly Payroll    |
| (Salary, Lates,  |                 | (Permanent, Daily,|                    | (Net salary, cuts, |
| OT, Allowances)  |                 | Contract, Intern) |                    | loans, accounting) |
+------------------+                 +-------------------+                    +--------------------+
```

### A. Salary Structure Policies
Located at `/dashboard/settings?section=payroll` -> **Salary Structure** tab.
*   **Split Rules**: Defines how an employee's Gross Base Salary is distributed across specific accounts for financial reporting.
*   **Constraint**: The total split must equal exactly **100%**.
*   *Default Split Example*:
    *   **Basic Salary**: 55%
    *   **House Rent**: 26%
    *   **Medical Allowance**: 5%
    *   **Transport Allowance**: 4%
    *   **Food Allowance**: 10%

### B. Attendance & Lateness Policies
*   **Attendance Policy**: Sets rules for absent day deductions and toggles the eligibility check for perfect attendance bonuses.
*   **Late Policy**:
    *   **Late Days for 1 Absent Cut**: Number of late clock-ins that convert to a single day's absent deduction (e.g., 3 lates = 1 absent deduction).
    *   **Late Deduction Divisor**: The daily pay rate divisor (usually **26** or **30** days) used to calculate the pay cut:
        $$\text{Deduction} = \text{Converted Absent Days} \times \left( \frac{\text{Base Gross Salary}}{\text{Late Deduction Divisor}} \right)$$
    *   **Late Grace Period**: Number of late check-ins allowed before the attendance bonus is forfeited.

### C. Overtime & Allowance Policies
*   **Overtime Policy**: Configures hourly overtime multipliers based on the basic salary rate. Overtime starts after a configurable buffer time (e.g., 30 minutes after shift end).
*   **Tiffin Bill Policy**: Provides a meal allowance if the employee remains clocked in past a threshold hour (e.g., checkout after 7:30 PM).
*   **Night Bill Policy**: Configures a premium payment for night shift hours or overnight checkouts.
*   **Holiday Bill Policy**: Configures premium rates (e.g., flat bonus or double-time) for employees who work on weekends or official holidays.

### D. Employee Types & Mapping
Go to `/dashboard/settings?section=payroll` -> **Mappings** tab.
*   Assign specific policies (Salary Structure, Late Policy, Attendance Policy, Overtime Policy, Allowances) to Employee Types (e.g., *Permanent Staff*, *Daily Workers*, *Interns*).
*   When a new employee is created with an Employee Type, the system applies these rules automatically.

---

## 3. Biometric Device Configuration & Mappings

The biometric module integrates physical security gates directly with HR calculations.

### A. Physical Device Setup
Go to `/dashboard/hr/biometric/devices` to register biometric terminals:
*   **Connection Mode**: Select **ADMS** (Automatic Data Master Server) or **IP**. ADMS is recommended for cloud-deployed ERPs as the devices automatically push logs to the system.
*   **IP Address & Port**: Configure the IP and Port (default 4370) if using IP polling.
*   **Serial Number**: Must exactly match the device's physical serial number to map incoming data packages.

### B. Employee Device Mappings
Go to `/dashboard/hr/biometric/mapping`:
*   Biometric machines identify employees by a numeric ID (e.g., User ID 104).
*   You must link this ID to the local database Employee record:
    $$\text{Local Employee Profile} \longleftrightarrow \text{Biometric Device User ID}$$
*   Without this mapping, clock-in records are sent to the **Unmapped Logs** queue under a `Reason: EMPLOYEE_NOT_FOUND` warning. Admins can resolve and map these manually.

---

## 4. Accounting Situations & Journal Entry Templates

Here is the exact accounting breakdown for every financial transaction triggered by the HRM system.

---

### Situation 1: Employee Loan Issuance (Disbursement)
When an employee applies for a company loan and it is approved and disbursed, a **PAYMENT Voucher** is generated.

*   **Trigger**: Admin approves and disburses a loan under `/dashboard/hr/loans`.
*   **Double-Entry Posting**:
    *   **DEBIT**: `Employee Advance Account` (Asset) — *Loan principal added.*
    *   **CREDIT**: `Cash / Bank Account` (Asset) — *Funds transferred to employee.*
*   **Ledger Template**:
| Line No. | Account Type | Account Name | Debit Amount | Credit Amount | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Asset | Employee Advance (e.g., John Doe Loan) | $\$1,200.00$ | $\$0.00$ | Loan Disbursement - John Doe (Ref: LN-001) |
| 2 | Asset | Cash at Bank (e.g., Operating Account) | $\$0.00$ | $\$1,200.00$ | Loan Disbursement - John Doe (Ref: LN-001) |

---

### Situation 2: Monthly Payroll Accrual (Posting Payroll)
At the end of the month, the payroll is generated as a Draft. Once approved and verified, the accountant posts it to the general ledger, creating a **JOURNAL Voucher**. This registers the monthly salary expense and records liabilities.

*   **Trigger**: Click **Post to Accounting** under `/dashboard/hr/payroll/[id]`.
*   **Double-Entry Posting**:
    *   **DEBIT**: `Salary Expense Account` (Expense) — *Total gross earnings of all employees.*
    *   **CREDIT**: `Employee Salary Payable Account` (Liability) — *Net pay owed to John Doe.*
    *   **CREDIT**: `Employee Advance Account` (Asset) — *Deduction to recover John Doe's loan installment.*
    *   **CREDIT**: `Tax Payable Account` (Liability) — *Withheld tax to be paid to government.*
    *   **CREDIT**: `PF Payable Account` (Liability) — *Withheld employee provident fund contributions.*
    *   **CREDIT**: `Festival Bonus Account` (Liability) — *Any accrued festival bonus.*
*   **Ledger Template (Example for John Doe: Gross $\$5,000$, Loan Cut $\$100$, PF Cut $\$250$, Net Payable $\$4,650$)**:
| Line No. | Account Type | Account Name | Debit Amount | Credit Amount | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Expense | Salary Expense | $\$5,000.00$ | $\$0.00$ | Total Gross Salary Expense (Ref: PR-2026-06) |
| 2 | Liability | John Doe Salary Payable Account | $\$0.00$ | $\$4,650.00$ | Salary Payable for John Doe (Ref: PR-2026-06) |
| 3 | Asset | John Doe Advance Account (Loan) | $\$0.00$ | $\$100.00$ | Loan Repayment Deduction - John Doe |
| 4 | Liability | PF Payable Account | $\$0.00$ | $\$250.00$ | Provident Fund Deduction - John Doe |

---

### Situation 3: Employer Provident Fund Matching Accrual
In jurisdictions where the company must match the employee's provident fund contribution, the system generates a separate matching ledger line on the same **JOURNAL Voucher** if configured in the settings.

*   **Trigger**: Included in payroll posting when `employerPfPct > 0` is defined in policies.
*   **Double-Entry Posting**:
    *   **DEBIT**: `Employer PF Contribution Expense` (Expense) — *Cost to the company.*
    *   **CREDIT**: `Employer PF Payable Account` (Liability) — *Matching liability to the PF authority.*
*   **Ledger Template**:
| Line No. | Account Type | Account Name | Debit Amount | Credit Amount | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Expense | Employer PF Contribution Expense | $\$250.00$ | $\$0.00$ | Employer PF Contribution (Ref: PR-2026-06) |
| 2 | Liability | Employer PF Payable | $\$0.00$ | $\$250.00$ | Employer PF Payable (Ref: PR-2026-06) |

---

### Situation 4: Monthly Payroll Disbursement (Salary Payout)
When bank transfer files are finalized or cheques are issued, the accountant records the actual payment, generating a **PAYMENT Voucher**.

*   **Trigger**: Click **Disburse** under `/dashboard/hr/payroll/[id]` and select the bank account.
*   **Double-Entry Posting**:
    *   **DEBIT**: `Employee Salary Payable Account` (Liability) — *Settles John Doe's salary liability.*
    *   **CREDIT**: `Cash / Bank Account` (Asset) — *Funds leave the bank.*
*   **Ledger Template**:
| Line No. | Account Type | Account Name | Debit Amount | Credit Amount | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Liability | John Doe Salary Payable Account | $\$4,650.00$ | $\$0.00$ | Salary Payout for John Doe (Ref: PR-2026-06) |
| 2 | Asset | Cash at Bank (Operating Account) | $\$0.00$ | $\$4,650.00$ | Total Salary Disbursement (Ref: PR-2026-06) |

---

### Situation 5: Voiding / Reversing Payroll
If an error is discovered after posting but before disbursement, the payroll can be voided, creating a **JOURNAL Voucher** reversal or cancelling the posted accrual voucher.

*   **Trigger**: Click **Void / Revert** under `/dashboard/hr/payroll/[id]`.
*   **Double-Entry Posting**: Reverse the accrual entries exactly.
    *   **DEBIT**: `Employee Salary Payable Account` (Liability) — *Removes salary liability.*
    *   **DEBIT**: `Employee Advance Account` (Asset) — *Restores the loan outstanding balance.*
    *   **DEBIT**: `PF / Tax Payable Accounts` (Liability) — *Removes withheld tax liabilities.*
    *   **CREDIT**: `Salary Expense Account` (Expense) — *Removes gross salary expense.*
*   **Ledger Template**:
| Line No. | Account Type | Account Name | Debit Amount | Credit Amount | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Liability | John Doe Salary Payable Account | $\$4,650.00$ | $\$0.00$ | Void Reversal - John Doe (Ref: PR-2026-06) |
| 2 | Asset | John Doe Advance Account (Loan) | $\$100.00$ | $\$0.00$ | Void Reversal - Restore Loan Balance John Doe |
| 3 | Liability | PF Payable Account | $\$250.00$ | $\$0.00$ | Void Reversal - PF John Doe |
| 4 | Expense | Salary Expense | $\$0.00$ | $\$5,000.00$ | Void Reversal - Salary Expense John Doe |

---

## 5. Month-End Payroll Operator Walkthrough

To process a month's payroll smoothly, complete the following steps in order:

### Step 1: Collect Biometric Logs
Ensure all biometric devices are online and synced.
*   Go to `/dashboard/hr/biometric/sync` to check sync statuses.
*   Review `/dashboard/hr/biometric/unmapped-logs` to map any unregistered biometric punch logs to employees.

### Step 2: Reprocess Daily Logs (Optional)
If any attendance policies, shifts, or grace periods were modified mid-month:
*   Go to the settings reprocess panel: `/dashboard/settings?section=payroll`.
*   Select the target date range and employee name/type.
*   Click **Reprocess**. This recalculates `lateMinutes`, `overtimeHours`, `tiffinBillAmount`, etc., for all un-locked days.

### Step 3: Verify Outstanding Loans
*   Check `/dashboard/hr/loans` to verify active loans.
*   Ensure that employees with loans show a status of `APPROVED` with a positive `remainingBalance`. This ensures the payroll engine will pick up the installment deductions correctly.

### Step 4: Generate Draft Payroll
*   Navigate to `/dashboard/hr/payroll`.
*   Click **Generate This Month** (or choose your month/year).
*   The system sums all daily attendance registers, counts late penalties, adds bonuses, calculates tax/PF cuts, deducts loan payments, and saves the payroll as a **DRAFT**.

### Step 5: Review & Audit
*   Click into the generated month to open the spreadsheet view.
*   Verify the 14 columns:
    *   *Earnings*: `Basic`, `House Rent`, `Medical`, `Transport`, `Food`, `Overtime`, `Bonus`, `Gross Pay`.
    *   *Deductions*: `Absent Cuts`, `Late Cuts`, `Loan Cuts`, `Tax`, `PF`, `Total Deductions`.
    *   *Net*: `Net Pay`.
*   Verify that no warning banner is showing (missing individual bank account setups).

### Step 6: Post and Lock
*   Click **Post to Accounting**.
*   Select the matching Expense account if override is necessary.
*   This triggers the system guard validation, locks the attendance registers for that month to prevent retrospective changes, and posts the journal entry voucher to the accounting module.

### Step 7: Disburse Payments
*   Click **Disburse**.
*   Select the cash/bank ledger account.
*   This locks the payroll status as `PAID`, marks all employee slips as paid, and deducts outstanding balances from active employee loans.
*   You can now export bank transfer files or download and print individual employee payslips.
