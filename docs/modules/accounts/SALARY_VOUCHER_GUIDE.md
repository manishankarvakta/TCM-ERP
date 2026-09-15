# Salary-Related Voucher Guide

**Purpose**: Guide for creating salary-related vouchers using the existing voucher system  
**Last Updated**: 2025-01-XX  
**Status**: Active

---

## Overview

Salary-related vouchers use existing voucher types (`JOURNAL` and `PAYMENT`) and follow standard double-entry accounting principles. All accounting is done through Chart of Accounts (COA), not employee IDs. The `voucher.userId` field can optionally link to `employee.userId` for audit purposes only.

---

## Voucher Patterns

### 1. Salary Accrual

**Purpose**: Record salary expense and create salary payable liability  
**Voucher Type**: `JOURNAL`  
**When to Use**: End of pay period (monthly, bi-weekly, etc.) to accrue salaries

**Accounting Entry**:
```
DR Salaries Expense          (EXPENSE)
CR Salary Payable - Employee (LIABILITY)
```

**Voucher Example**:
```typescript
{
  type: "JOURNAL",
  date: "2025-01-31",
  description: "Salary Accrual - January 2025 - John Doe",
  userId: employee.userId || null, // Optional: for audit tracking
  lines: [
    {
      lineNumber: 1,
      chartOfAccountId: "salary-expense-account-id", // "Salary Expense" (code: 6130)
      debitAmount: 5000.00,
      creditAmount: 0,
      description: "Salary expense for January 2025",
    },
    {
      lineNumber: 2,
      chartOfAccountId: employee.salaryPayableAccountId, // "Salary Payable - John Doe"
      debitAmount: 0,
      creditAmount: 5000.00,
      description: "Accrued salary for January 2025",
    },
  ],
}
```

**Validation Rules**:
- ✅ Debit total = Credit total (5000.00)
- ✅ Salary Expense account must be `EXPENSE` type
- ✅ Employee's `salaryPayableAccountId` must exist
- ✅ Salary Payable account must be `LIABILITY` type
- ✅ Both accounts must be active

**Helper Function**:
```typescript
const result = await getEmployeeSalaryPayableCOA(employeeId);
if (result.success) {
  const salaryPayableCOAId = result.coaId;
  // Use in voucher line
}
```

---

### 2. Salary Payment

**Purpose**: Pay accrued salary to employee  
**Voucher Type**: `PAYMENT`  
**When to Use**: When actually paying salary to employee (cash/bank payment)

**Accounting Entry**:
```
DR Salary Payable - Employee (LIABILITY)
CR Cash / Bank Account        (ASSET)
```

**Voucher Example**:
```typescript
{
  type: "PAYMENT",
  date: "2025-02-05",
  description: "Salary Payment - January 2025 - John Doe",
  userId: employee.userId || null, // Optional: for audit tracking
  lines: [
    {
      lineNumber: 1,
      chartOfAccountId: employee.salaryPayableAccountId, // "Salary Payable - John Doe"
      debitAmount: 5000.00,
      creditAmount: 0,
      description: "Payment of accrued salary",
    },
    {
      lineNumber: 2,
      chartOfAccountId: cashBankAccountId, // Cash or Bank account
      debitAmount: 0,
      creditAmount: 5000.00,
      description: "Payment via bank transfer",
    },
  ],
}
```

**Validation Rules**:
- ✅ Debit total = Credit total (5000.00)
- ✅ Employee's `salaryPayableAccountId` must exist
- ✅ Salary Payable account must be `LIABILITY` type
- ✅ Cash/Bank account must be `ASSET` type
- ✅ Both accounts must be active
- ⚠️ **Warning** (not error): Payment amount exceeds payable balance (allows overpayment)

**Helper Function**:
```typescript
const result = await getEmployeeSalaryPayableCOA(employeeId);
if (result.success) {
  const salaryPayableCOAId = result.coaId;
  // Use in voucher line
}
```

---

### 3. Employee Advance

**Purpose**: Give advance payment to employee  
**Voucher Type**: `PAYMENT`  
**When to Use**: When giving advance payment to employee (before salary accrual)

**Accounting Entry**:
```
DR Advance - Employee  (ASSET)
CR Cash / Bank Account  (ASSET)
```

**Voucher Example**:
```typescript
{
  type: "PAYMENT",
  date: "2025-01-15",
  description: "Employee Advance - John Doe",
  userId: employee.userId || null, // Optional: for audit tracking
  lines: [
    {
      lineNumber: 1,
      chartOfAccountId: employee.advanceAccountId, // "Advance - John Doe"
      debitAmount: 2000.00,
      creditAmount: 0,
      description: "Advance payment to employee",
    },
    {
      lineNumber: 2,
      chartOfAccountId: cashBankAccountId, // Cash or Bank account
      debitAmount: 0,
      creditAmount: 2000.00,
      description: "Payment via cash",
    },
  ],
}
```

**Validation Rules**:
- ✅ Debit total = Credit total (2000.00)
- ✅ Employee's `advanceAccountId` must exist (if advance account is used)
- ✅ Advance account must be `ASSET` type
- ✅ Cash/Bank account must be `ASSET` type
- ✅ Both accounts must be active
- ⚠️ **Note**: Employee may not have advance account (optional field)

**Helper Function**:
```typescript
const result = await getEmployeeAdvanceCOA(employeeId);
if (result.success) {
  const advanceCOAId = result.coaId;
  // Use in voucher line
} else {
  // Employee doesn't have advance account - cannot create advance voucher
}
```

---

### 4. Advance Adjustment

**Purpose**: Adjust advance against salary payable  
**Voucher Type**: `JOURNAL`  
**When to Use**: When adjusting advance amount against salary (non-cash transaction)

**Accounting Entry**:
```
DR Salary Payable - Employee (LIABILITY)
CR Advance - Employee         (ASSET)
```

**Voucher Example**:
```typescript
{
  type: "JOURNAL",
  date: "2025-02-05",
  description: "Advance Adjustment - John Doe - January 2025",
  userId: employee.userId || null, // Optional: for audit tracking
  lines: [
    {
      lineNumber: 1,
      chartOfAccountId: employee.salaryPayableAccountId, // "Salary Payable - John Doe"
      debitAmount: 2000.00,
      creditAmount: 0,
      description: "Adjustment of advance against salary",
    },
    {
      lineNumber: 2,
      chartOfAccountId: employee.advanceAccountId, // "Advance - John Doe"
      debitAmount: 0,
      creditAmount: 2000.00,
      description: "Reduction of advance balance",
    },
  ],
}
```

**Validation Rules**:
- ✅ Debit total = Credit total (2000.00)
- ✅ Both employee COAs must exist:
  - `salaryPayableAccountId` must exist
  - `advanceAccountId` must exist
- ✅ Salary Payable account must be `LIABILITY` type
- ✅ Advance account must be `ASSET` type
- ✅ Both accounts must be active
- ⚠️ **Warning** (not error): Adjustment amount exceeds advance balance

**Helper Function**:
```typescript
const result = await getEmployeeCOAs(employeeId);
if (result.success && result.employee.salaryPayableAccountId && result.employee.advanceAccountId) {
  const salaryPayableCOAId = result.employee.salaryPayableAccountId;
  const advanceCOAId = result.employee.advanceAccountId;
  // Use both in voucher lines
}
```

---

## Validation Rules Summary

### General Voucher Validation (Always Applied)

1. **Double-Entry Balance**: Debit total must equal Credit total (within 0.01 tolerance)
2. **Minimum Lines**: Voucher must have at least 2 lines
3. **Line Validation**: Each line must have either debit OR credit (not both, not neither)
4. **Account Existence**: All COAs must exist in database
5. **Account Status**: All COAs must be active

### Salary-Specific Validation

| Voucher Pattern | Type | Required COAs | Account Types | Balance Checks |
|----------------|------|---------------|---------------|----------------|
| **Salary Accrual** | JOURNAL | Salary Expense, Salary Payable | EXPENSE, LIABILITY | None |
| **Salary Payment** | PAYMENT | Salary Payable, Cash/Bank | LIABILITY, ASSET | ⚠️ Warn if exceeds payable |
| **Employee Advance** | PAYMENT | Advance, Cash/Bank | ASSET, ASSET | None |
| **Advance Adjustment** | JOURNAL | Salary Payable, Advance | LIABILITY, ASSET | ⚠️ Warn if exceeds advance |

### Account Type Validation

**Salary Accrual**:
- Line 1 (Debit): Must be `EXPENSE` type (Salary Expense account)
- Line 2 (Credit): Must be `LIABILITY` type (Employee's Salary Payable account)

**Salary Payment**:
- Line 1 (Debit): Must be `LIABILITY` type (Employee's Salary Payable account)
- Line 2 (Credit): Must be `ASSET` type (Cash or Bank account)

**Employee Advance**:
- Line 1 (Debit): Must be `ASSET` type (Employee's Advance account)
- Line 2 (Credit): Must be `ASSET` type (Cash or Bank account)

**Advance Adjustment**:
- Line 1 (Debit): Must be `LIABILITY` type (Employee's Salary Payable account)
- Line 2 (Credit): Must be `ASSET` type (Employee's Advance account)

---

## Helper Functions

### getEmployeeCOAs(employeeId: string)

Returns both salary payable and advance COAs for an employee.

**Usage**:
```typescript
const result = await getEmployeeCOAs(employeeId);
if (result.success) {
  const salaryPayableCOA = result.employee.salaryPayableAccount;
  const advanceCOA = result.employee.advanceAccount;
}
```

**Returns**:
- `success`: boolean
- `employee`: Employee object with COA details
- `error`: string (if failed)

### getEmployeeSalaryPayableCOA(employeeId: string)

Returns only the salary payable COA for an employee.

**Usage**:
```typescript
const result = await getEmployeeSalaryPayableCOA(employeeId);
if (result.success) {
  const coaId = result.coaId;
  const coa = result.coa; // Full COA details
}
```

**Returns**:
- `success`: boolean
- `coaId`: string (COA ID)
- `coa`: ChartOfAccount object
- `employee`: Employee basic info
- `error`: string (if failed)

### getEmployeeAdvanceCOA(employeeId: string)

Returns only the advance COA for an employee (if exists).

**Usage**:
```typescript
const result = await getEmployeeAdvanceCOA(employeeId);
if (result.success) {
  const coaId = result.coaId;
  const coa = result.coa; // Full COA details
} else {
  // Employee doesn't have advance account
}
```

**Returns**:
- `success`: boolean
- `coaId`: string (COA ID) or null
- `coa`: ChartOfAccount object or null
- `employee`: Employee basic info
- `error`: string (if failed)

### getEmployeesForVoucher()

Returns list of all active employees with their COAs for dropdown/autocomplete.

**Usage**:
```typescript
const result = await getEmployeesForVoucher();
if (result.success) {
  result.employees.forEach(employee => {
    // Use employee.salaryPayableAccount or employee.advanceAccount
  });
}
```

**Returns**:
- `success`: boolean
- `employees`: Array of Employee objects with COA details
- `error`: string (if failed)

---

## Common Workflows

### Monthly Salary Processing

1. **End of Month - Salary Accrual**:
   - Create JOURNAL voucher
   - DR Salary Expense
   - CR Salary Payable - Employee
   - Amount: Monthly salary

2. **Payment Date - Salary Payment**:
   - Create PAYMENT voucher
   - DR Salary Payable - Employee
   - CR Cash/Bank
   - Amount: Salary amount (may include advance adjustment)

3. **If Advance Given**:
   - Create PAYMENT voucher (Employee Advance)
   - DR Advance - Employee
   - CR Cash/Bank
   - Amount: Advance amount

4. **If Advance Adjusted**:
   - Create JOURNAL voucher (Advance Adjustment)
   - DR Salary Payable - Employee
   - CR Advance - Employee
   - Amount: Advance amount to adjust

### Example: Complete Salary Cycle

**January 15**: Employee receives advance
- Employee Advance voucher: DR Advance $2000, CR Cash $2000

**January 31**: Salary accrual
- Salary Accrual voucher: DR Salary Expense $5000, CR Salary Payable $5000

**February 5**: Salary payment with advance adjustment
- Advance Adjustment voucher: DR Salary Payable $2000, CR Advance $2000
- Salary Payment voucher: DR Salary Payable $3000, CR Bank $3000
- Net payment: $3000 (salary $5000 - advance $2000)

---

## Balance Calculations

### Salary Payable Balance

**Formula**: `Sum(Debit - Credit) from JournalEntryLine where chartOfAccountId = salaryPayableAccountId`

**Calculation**:
- Increases with: Salary Accrual (Credit), Advance Adjustment (Debit)
- Decreases with: Salary Payment (Debit)

**Example**:
- Accrual: +$5000 (Credit)
- Payment: -$5000 (Debit)
- Balance: $0

### Advance Balance

**Formula**: `Sum(Debit - Credit) from JournalEntryLine where chartOfAccountId = advanceAccountId`

**Calculation**:
- Increases with: Employee Advance (Debit)
- Decreases with: Advance Adjustment (Credit)

**Example**:
- Advance: +$2000 (Debit)
- Adjustment: -$2000 (Credit)
- Balance: $0

---

## Important Notes

1. **COA-Based Accounting**: All accounting uses `chartOfAccountId`, never `employeeId`
2. **userId for Audit**: `voucher.userId` can link to `employee.userId` for tracking (optional)
3. **No Balance Storage**: Balances are calculated from journal entries, not stored
4. **Existing Voucher Types**: Use `JOURNAL` and `PAYMENT` types only (no new types)
5. **Validation Warnings**: Balance checks are warnings, not errors (allows overpayment/adjustment)
6. **Employee COAs**: Employees must have COAs created before vouchers can be created
7. **Account Types**: Must match expected types (EXPENSE, LIABILITY, ASSET)

---

## Troubleshooting

### "Employee does not have a salary payable account"
- **Solution**: Create employee first (COAs are auto-created)
- **Check**: Verify employee has `salaryPayableAccountId` set

### "Employee does not have an advance account"
- **Solution**: Employee may not have advance account (optional)
- **Check**: Verify employee has `advanceAccountId` set, or skip advance vouchers

### "Account is not active"
- **Solution**: Activate the COA or use a different account
- **Check**: Verify COA status is "active"

### "Double-entry balance mismatch"
- **Solution**: Ensure debit total equals credit total
- **Check**: Review all voucher line amounts

---

## API Reference

All helper functions are exported from:
`app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action.tsx`

**Functions**:
- `getEmployeeCOAs(employeeId: string)`
- `getEmployeeSalaryPayableCOA(employeeId: string)`
- `getEmployeeAdvanceCOA(employeeId: string)`
- `getEmployeesForVoucher()`

**Voucher Creation**:
- `createVoucher(input: CreateVoucherInput)` - Existing function, works with salary vouchers

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX

