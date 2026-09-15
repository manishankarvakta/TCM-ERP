# Accounts & Employee System Developer Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema & Architecture](#database-schema--architecture)
3. [Accounts Module Deep Dive](#accounts-module-deep-dive)
4. [Employee Module Deep Dive](#employee-module-deep-dive)
5. [Integration: Payroll & Accounting](#integration-payroll--accounting)

---

## System Overview

The application features a deeply integrated **Accounts** and **Employee** system. 
- The **Accounts Module** implements a standard double-entry accounting ledger system utilizing Chart of Accounts, Vouchers, and Journal Entries to track all financial movements.
- The **Employee Module** handles employee lifecycle data, HR information, and crucially, automatically integrates with the accounting system to manage payroll and employee advances.

---

## Database Schema & Architecture

### Core Entities

#### Accounts Models
- **`ChartOfAccount`**: Represents the structured ledger accounts (Assets, Liabilities, Equity, Revenue, Expense). Supports hierarchical grouping (`parentId`) and can be flagged as `isControl` accounts.
- **`Voucher`**: The source document for any financial transaction (e.g., PAYMENT, RECEIPT, JOURNAL, CONTRA, SALES, PURCHASE).
- **`VoucherLine`**: Individual debit or credit line items attached to a Voucher.
- **`JournalEntry`**: The finalized, immutable accounting record. Created only when a `Voucher` is "posted".
- **`JournalEntryLine`**: The immutable debit/credit lines affecting specific `ChartOfAccount` records.

#### Employee Models
- **`Employee`**: Contains all personal and professional details of an employee (designation, salary, warehouse assignment).
- **`User`**: (Optional) The login mapping for the employee if they have system access.

---

## Accounts Module Deep Dive

### Chart of Accounts (COA)
The COA is the backbone of the system. All transactions must balance across these accounts.
- Accounts are categorized by `AccountType` (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
- Nested accounts allow for detailed financial reporting (Trial Balance, Balance Sheet, Profit & Loss).

### Voucher Lifecycle
1. **Draft**: Vouchers are created in a `draft` state (`Voucher` and `VoucherLine` records are created). At this stage, they do not affect the official ledger balances.
2. **Post**: When a voucher is posted:
   - The system verifies that `Total Debits == Total Credits`.
   - A `JournalEntry` and corresponding `JournalEntryLine` records are generated.
   - The voucher's `status` becomes `posted` and `isLocked` is set to `true`.
   - The ledger balances are updated.

> [!IMPORTANT]
> Once a Voucher is posted and a Journal Entry is generated, it becomes an immutable financial record. To correct mistakes, a reversing or adjusting Journal Voucher must be issued.

---

## Employee Module Deep Dive

### Employee Creation & Management
The Employee system is managed via `app/(dashboard)/dashboard/employees/_actions/employee.action.tsx`. 
When creating an employee, the system captures:
- Personal Details (Name, Phone, Email, National ID)
- Professional Details (Designation, Department, Salary)
- System Mapping (Optional `userId` to grant ERP access)
- Warehouse Assignment (`warehouseId`)

### Automatic Accounting Mapping
To seamlessly integrate HR with accounting, the system automatically provisions dedicated ledger accounts for each employee upon creation.

When an Employee is created:
1. **Salary Payable Account**: A new `ChartOfAccount` (Liability) is created under the master "Salary Payable" control account. This account's ID is stored in the employee's `salaryPayableAccountId` field.
2. **Advance Account**: A new `ChartOfAccount` (Asset) is created under the master "Employee Advances" control account. This account's ID is stored in the employee's `advanceAccountId` field.

> [!TIP]
> This one-to-one mapping allows the company to track salary arrears and advance balances for every single employee independently in the general ledger.

---

## Integration: Payroll & Accounting

The core integration between the two modules is the **Payroll & Advance Management Workflow**.

### Salary Processing Workflow
1. **Accrual (End of Month)**: 
   - A `JOURNAL` voucher is created. 
   - **Debit**: Salary Expense Account (Total Salary)
   - **Credit**: The specific Employee's `salaryPayableAccountId` (Total Salary)
2. **Payment**:
   - A `PAYMENT` voucher is created when the employee is actually paid.
   - **Debit**: The specific Employee's `salaryPayableAccountId` (Amount Paid)
   - **Credit**: Cash/Bank Account (Amount Paid)

### Employee Advance Workflow
1. **Issuing Advance**:
   - A `PAYMENT` voucher is issued.
   - **Debit**: The specific Employee's `advanceAccountId`
   - **Credit**: Cash/Bank Account
2. **Deducting from Salary**:
   - During the Salary Processing Journal Entry, an additional line is added.
   - **Credit**: The specific Employee's `advanceAccountId` (Amount Deducted)

By leveraging the auto-generated Chart of Account mappings (`salaryPayableAccountId` and `advanceAccountId`), the ERP system natively handles complex payroll accounting without manual ledger creation.
