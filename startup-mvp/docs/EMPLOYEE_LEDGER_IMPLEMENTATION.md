# Employee Ledger Implementation

**Purpose**: Documentation for employee ledger views using existing journal entries  
**Last Updated**: 2025-01-XX  
**Status**: Active

---

## Overview

Employee ledger views are read-only queries that calculate balances from journal entries. They follow the same pattern as customer and supplier ledgers, querying `JournalEntryLine` records where `chartOfAccountId` matches the employee's COA IDs.

---

## Query Logic

### 1. Employee Salary Payable Ledger

**Function**: `getEmployeeLedger(employeeId, filters?)`

**Query Pattern**:
```typescript
// Step 1: Get employee and validate
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  select: {
    id: true,
    name: true,
    employeeCode: true,
    salaryPayableAccountId: true,
    status: true,
  },
});

// Step 2: Calculate opening balance (if dateFrom provided)
if (filters?.dateFrom) {
  const openingBalanceLines = await prisma.journalEntryLine.findMany({
    where: {
      chartOfAccountId: employee.salaryPayableAccountId,
      journalEntry: {
        date: { lt: dateFrom },
      },
    },
  });
  
  openingBalance = openingBalanceLines.reduce((sum, line) => {
    return sum + (Number(line.creditAmount) - Number(line.debitAmount)); // LIABILITY
  }, 0);
}

// Step 3: Query ledger lines
const ledgerLines = await prisma.journalEntryLine.findMany({
  where: {
    chartOfAccountId: employee.salaryPayableAccountId,
    journalEntry: {
      ...(dateFilter && { date: dateFilter }),
    },
  },
  include: {
    journalEntry: {
      include: {
        voucher: { /* voucher details */ },
      },
    },
    chartOfAccount: { /* COA details */ },
  },
  orderBy: {
    journalEntry: { date: "asc" },
  },
});
```

**Balance Calculation**:
- **Account Type**: LIABILITY
- **Balance Formula**: `Sum(Credit - Debit)`
- **Running Balance**: Cumulative `(Credit - Debit)` starting from opening balance
- **Positive Balance**: Company owes employee (salary payable)
- **Negative Balance**: Employee owes company (overpayment)

### 2. Employee Advance Ledger

**Function**: `getEmployeeAdvanceLedger(employeeId, filters?)`

**Query Pattern**: Same as salary payable, but:
- Uses `employee.advanceAccountId` instead of `salaryPayableAccountId`
- Returns error if `advanceAccountId` is null

**Balance Calculation**:
- **Account Type**: ASSET
- **Balance Formula**: `Sum(Debit - Credit)`
- **Running Balance**: Cumulative `(Debit - Credit)` starting from opening balance
- **Positive Balance**: Employee owes company (advance given)
- **Negative Balance**: Company owes employee (over-advance)

---

## Date Filtering

### Date Range Filter

**Implementation**:
```typescript
const journalEntryDateFilter: Prisma.DateTimeFilter = {};

if (filters?.dateFrom) {
  const dateFrom = typeof filters.dateFrom === "string" 
    ? new Date(filters.dateFrom) 
    : filters.dateFrom;
  dateFrom.setHours(0, 0, 0, 0); // Start of day
  journalEntryDateFilter.gte = dateFrom;
}

if (filters?.dateTo) {
  const dateTo = typeof filters.dateTo === "string" 
    ? new Date(filters.dateTo) 
    : filters.dateTo;
  dateTo.setHours(23, 59, 59, 999); // End of day
  journalEntryDateFilter.lte = dateTo;
}
```

**Validation**:
- If both dates provided: `dateFrom <= dateTo`
- Returns error if invalid date range

### Opening Balance

**When Calculated**: Only if `dateFrom` is provided

**Calculation**:
```typescript
// Query all entries before dateFrom
const openingBalanceLines = await prisma.journalEntryLine.findMany({
  where: {
    chartOfAccountId: employee.salaryPayableAccountId, // or advanceAccountId
    journalEntry: {
      date: { lt: dateFrom },
    },
  },
});

// Calculate balance
const openingBalance = openingBalanceLines.reduce((sum, line) => {
  // For LIABILITY: Credit - Debit
  // For ASSET: Debit - Credit
  return sum + (credit - debit);
}, 0);
```

**Usage**:
- Starting balance for running balance calculation
- Included in summary if date range is filtered

---

## Running Balance Calculation

### Salary Payable (LIABILITY)

**Formula**: `Credit - Debit` per entry

**Implementation**:
```typescript
let runningBalance = openingBalance || 0;

const ledgerWithBalance = ledgerLines.map((line) => {
  const debit = Number(line.debitAmount);
  const credit = Number(line.creditAmount);
  const entryBalance = credit - debit; // LIABILITY: Credit increases balance
  runningBalance += entryBalance;
  
  return {
    ...formattedLine,
    runningBalance, // Cumulative balance
  };
});
```

**Example**:
```
Opening Balance: 0
Entry 1: Credit 5000, Debit 0 → Balance: 5000
Entry 2: Credit 0, Debit 5000 → Balance: 0
```

### Advance (ASSET)

**Formula**: `Debit - Credit` per entry

**Implementation**:
```typescript
let runningBalance = openingBalance || 0;

const ledgerWithBalance = ledgerLines.map((line) => {
  const debit = Number(line.debitAmount);
  const credit = Number(line.creditAmount);
  const entryBalance = debit - credit; // ASSET: Debit increases balance
  runningBalance += entryBalance;
  
  return {
    ...formattedLine,
    runningBalance, // Cumulative balance
  };
});
```

**Example**:
```
Opening Balance: 0
Entry 1: Debit 2000, Credit 0 → Balance: 2000
Entry 2: Debit 0, Credit 2000 → Balance: 0
```

---

## Response Format

### Success Response

```typescript
{
  success: true,
  ledger: [
    {
      id: string,
      lineNumber: number,
      date: Date,
      entryNumber: string,
      description: string | null,
      debitAmount: number,
      creditAmount: number,
      runningBalance: number, // Cumulative balance
      voucher: {
        id: string,
        voucherNumber: string,
        type: string,
        reference: string | null,
        description: string | null,
        status: string,
      } | null,
      chartOfAccount: {
        id: string,
        code: string,
        name: string,
        type: string,
      },
      createdAt: Date,
    },
    // ... more entries
  ],
  summary: {
    totalDebit: number,
    totalCredit: number,
    balance: number, // Final balance (openingBalance + period balance)
    openingBalance?: number, // Only if dateFrom provided
  },
  employee: {
    id: string,
    name: string,
    employeeCode: string | null,
  },
}
```

### Error Response

```typescript
{
  success: false,
  error: string,
  ledger: [],
  summary: {
    totalDebit: 0,
    totalCredit: 0,
    balance: 0,
  },
}
```

---

## UI Integration Points

### 1. Existing LedgerView Component

**File**: `startup-mvp/app/(dashboard)/dashboard/accounts/ledgers/_components/ledger-view.tsx`

**Reusability**: Can be reused for employee ledgers with minimal changes

**Current Props**:
```typescript
interface LedgerViewProps {
  ledger: LedgerEntry[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    balance: number;
  };
  accounts: Array<{ id: string; code: string; name: string }>;
  selectedAccountId?: string;
  dateFrom?: string;
  dateTo?: string;
}
```

**Extension for Employee Ledgers**:
- Add `runningBalance` to `LedgerEntry` interface
- Add `openingBalance` to summary
- Add `employee` prop for employee-specific display

### 2. Employee Ledger Page (To Be Created)

**Suggested Routes**:
- `/dashboard/employees/[id]/ledger` - Salary payable ledger
- `/dashboard/employees/[id]/advance-ledger` - Advance ledger
- `/dashboard/accounts/ledgers/employee/[id]` - Alternative route

**Page Structure**:
```typescript
// app/(dashboard)/dashboard/employees/[id]/ledger/page.tsx
export default async function EmployeeLedgerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { dateFrom?: string; dateTo?: string };
}) {
  const result = await getEmployeeLedger(params.id, {
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo,
  });

  if (!result.success) {
    return <ErrorDisplay error={result.error} />;
  }

  return (
    <LedgerView
      ledger={result.ledger}
      summary={result.summary}
      employee={result.employee}
      dateFrom={searchParams.dateFrom}
      dateTo={searchParams.dateTo}
    />
  );
}
```

### 3. Employee Selection in Ledger View

**Integration Point**: Add employee dropdown to ledger view

**Implementation**:
```typescript
// In ledger view component
const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>();

// Fetch employees
const employeesResult = await getEmployeesForVoucher();

// When employee selected, fetch ledger
const ledgerResult = await getEmployeeLedger(selectedEmployeeId, {
  dateFrom,
  dateTo,
});
```

### 4. Export Functionality

**CSV Export Format**:
```csv
Date,Entry Number,Description,Debit,Credit,Running Balance,Voucher Number,Voucher Type,Reference
2025-01-31,JE-2025-0001,Salary Accrual,0,5000,5000,VCH-2025-0001,JOURNAL,
2025-02-05,JE-2025-0002,Salary Payment,5000,0,0,VCH-2025-0002,PAYMENT,
```

**Export Fields**:
- Date
- Entry Number
- Description
- Debit Amount
- Credit Amount
- Running Balance (NEW)
- Voucher Number
- Voucher Type
- Reference

**Implementation**:
```typescript
function exportEmployeeLedgerToCSV(ledger: LedgerEntry[], employee: Employee) {
  const headers = [
    "Date",
    "Entry Number",
    "Description",
    "Debit",
    "Credit",
    "Running Balance",
    "Voucher Number",
    "Voucher Type",
    "Reference",
  ];

  const rows = ledger.map((entry) => [
    format(entry.date, "yyyy-MM-dd"),
    entry.entryNumber,
    entry.description || "",
    entry.debitAmount.toFixed(2),
    entry.creditAmount.toFixed(2),
    entry.runningBalance.toFixed(2), // NEW
    entry.voucher?.voucherNumber || "",
    entry.voucher?.type || "",
    entry.voucher?.reference || "",
  ]);

  // Generate CSV and download
}
```

---

## API Usage Examples

### Get Employee Salary Payable Ledger

```typescript
import { getEmployeeLedger } from "@/app/(dashboard)/dashboard/accounts/ledgers/_actions/ledger.action";

// Without date filter
const result = await getEmployeeLedger(employeeId);

// With date filter
const result = await getEmployeeLedger(employeeId, {
  dateFrom: "2025-01-01",
  dateTo: "2025-01-31",
});

if (result.success) {
  console.log("Ledger entries:", result.ledger);
  console.log("Summary:", result.summary);
  console.log("Employee:", result.employee);
  console.log("Opening Balance:", result.summary.openingBalance);
}
```

### Get Employee Advance Ledger

```typescript
import { getEmployeeAdvanceLedger } from "@/app/(dashboard)/dashboard/accounts/ledgers/_actions/ledger.action";

const result = await getEmployeeAdvanceLedger(employeeId, {
  dateFrom: "2025-01-01",
  dateTo: "2025-01-31",
});

if (result.success) {
  console.log("Advance ledger:", result.ledger);
  console.log("Final balance:", result.summary.balance);
}
```

---

## Validation Rules

### Employee Validation

1. ✅ Employee exists
2. ✅ Employee status is not "trash"
3. ✅ Employee has `salaryPayableAccountId` (for salary ledger)
4. ✅ Employee has `advanceAccountId` (for advance ledger, optional)

### Date Range Validation

1. ✅ `dateFrom` and `dateTo` are valid dates
2. ✅ `dateFrom <= dateTo` (if both provided)
3. ✅ Dates are formatted correctly (ISO string or Date object)

### Permission Validation

1. ✅ User is authenticated
2. ✅ User has `accounts.ledgers.read` or `accounts.ledgers.view` permission

---

## Performance Considerations

### Indexes Used

- `JournalEntryLine.chartOfAccountId` (indexed)
- `JournalEntry.date` (indexed)
- `Employee.salaryPayableAccountId` (indexed)
- `Employee.advanceAccountId` (indexed)

### Query Optimization

- Single query for ledger lines (with includes)
- Efficient date filtering on indexed field
- No N+1 queries (all relations included in single query)
- Opening balance calculated separately (only if dateFrom provided)

### Large Dataset Handling

- Consider pagination for very large ledgers (future enhancement)
- Date filtering reduces dataset size
- Running balance calculated in-memory (efficient for typical datasets)

---

## Edge Cases Handled

1. **Employee without COA**: Returns clear error message
2. **Employee without Advance Account**: Returns error for advance ledger
3. **No Transactions**: Returns empty ledger with zero balance
4. **Date Range with No Opening Balance**: Opening balance = 0
5. **Deleted Employee**: Returns error (status = "trash")
6. **Invalid Date Range**: Returns error if dateFrom > dateTo
7. **No Date Filter**: Returns all transactions, opening balance = 0

---

## Comparison with Customer/Supplier Ledgers

| Feature | Customer Ledger | Supplier Ledger | Employee Ledger |
|---------|----------------|-----------------|-----------------|
| **Query Field** | `customer.chartOfAccountId` | `supplier.chartOfAccountId` | `employee.salaryPayableAccountId` |
| **Account Type** | ASSET (AR) | LIABILITY (AP) | LIABILITY (Salary Payable) |
| **Balance Formula** | Debit - Credit | Credit - Debit | Credit - Debit |
| **Running Balance** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Date Filtering** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Opening Balance** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Export Support** | ✅ Yes | ✅ Yes | ✅ Yes (same pattern) |

---

## Function Locations

**File**: `startup-mvp/app/(dashboard)/dashboard/accounts/ledgers/_actions/ledger.action.tsx`

**Functions**:
- `getEmployeeLedger(employeeId, filters?)` - Line ~720
- `getEmployeeAdvanceLedger(employeeId, filters?)` - Line ~991

**Exports**: Both functions are exported and ready to use

---

## Next Steps (Optional UI Implementation)

1. **Create Employee Ledger Page**:
   - Route: `/dashboard/employees/[id]/ledger`
   - Use existing `LedgerView` component
   - Add employee-specific header/info

2. **Add Employee Selection**:
   - Dropdown in ledger view
   - Auto-fetch ledger when employee selected

3. **Export Enhancement**:
   - Add running balance column to CSV export
   - Add employee name to export filename

4. **Balance Display**:
   - Show opening balance if date filtered
   - Highlight final balance
   - Color-code positive/negative balances

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX

