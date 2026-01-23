# Employee/User Model Analysis

**Date**: 2025-01-XX  
**Purpose**: Analyze how internal users/employees are currently modeled in the codebase  
**Status**: Analysis Only - No Code Changes

---

## Executive Summary

The system uses a **unified User model** for both system users and employees. There is **no distinction** between "User" (system access) and "Employee" (payroll/HR). Users can be linked to vouchers for tracking purposes, but there is **no payroll accounting structure** similar to customers/suppliers.

---

## 1. Employee vs User Distinction

### Answer: **NO DISTINCTION EXISTS**

### Current Model:

**Single `User` Model** (`prisma/schema.prisma` lines 47-95):
- **Purpose**: Handles both system authentication AND employee data
- **No separate Employee model**: All users are employees and vice versa
- **Fields**:
  - `id`, `name`, `email`, `password`: Basic authentication
  - `role`: `"user"` or `"admin"` (system role, not job title)
  - `status`: `"active"`, `"inactive"`, `"trash"` (system status, not employment status)
  - `designationTemplateId`: Links to permission template (not job title)
  - `inchargeId`: Self-referential relation for reporting hierarchy
  - `permissions`: JSON field for cached permissions

**Key Observations**:
- No `employeeId`, `employeeNumber`, or `staffId` field
- No `jobTitle`, `department`, `hireDate`, `salary` fields
- No distinction between "system user" and "employee"
- `role` field is for system permissions, not employment role

### Code Reference:
```47:95:startup-mvp/prisma/schema.prisma
model User {
  id                   String         @id @default(cuid())
  name                 String?
  email                String         @unique
  emailVerified        DateTime?
  password             String
  image                String?
  role                 String         @default("user")
  status               String         @default("active") // active, inactive, trash
  designationTemplateId String?      // Reference to PermissionTemplate
  permissions          Json?         // Cached merged permissions (template + overrides)
  inchargeId           String?       // Reference to another User (self-referential)
  incharge             User?         @relation("UserIncharge", fields: [inchargeId], references: [id], onDelete: SetNull)
  inchargeOf           User[]        @relation("UserIncharge")
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  accounts             Account[]
  sessions             Session[]
  userLogs             UserLog[]
  files                File[]
  notifications        Notification[]
  createdNotifications Notification[] @relation("NotificationCreator")
  createdUnits         Unit[]         @relation("UnitCreator")
  createdOrganizations Organization[] @relation("OrganizationCreator")
  createdClients       Client[]       @relation("ClientCreator")
  createdSuppliers     Supplier[]     @relation("SupplierCreator")
  quotations           Quotation[]    @relation("SubmittedBy")
  updatedQuotations    Quotation[]    @relation("UpdatedBy")
  sections             Section[]      @relation("PreparedBy")
  createdCoverLetters  CoverLetter[]  @relation("CoverLetterCreator")
  createdModuleGroups  ModuleGroup[]  @relation("ModuleGroupCreator")
  settings             Settings[]     @relation("SettingsUser")
  createdSettings      Settings[]     @relation("SettingsCreator")
  designationTemplate  PermissionTemplate? @relation("UserDesignationTemplate", fields: [designationTemplateId], references: [id], onDelete: SetNull)
  userPermissions      UserPermission[]
  
  // Accounting module relations
  createdChartOfAccounts ChartOfAccount[] @relation("ChartOfAccountCreator")
  createdVouchers       Voucher[]        @relation("VoucherCreator")
  postedVouchers        Voucher[]        @relation("VoucherPostedBy")
  vouchersAsUser        Voucher[]        @relation("VoucherUser")
  voucherLinesAsUser    VoucherLine[]    @relation("VoucherLineUser")
  journalEntryLinesAsUser JournalEntryLine[] @relation("JournalEntryLineUser")
  createdCashBankAccounts CashBankAccount[] @relation("CashBankAccountCreator")

  @@index([status])
  @@index([designationTemplateId])
  @@index([inchargeId])
}
```

---

## 2. Existing Salary or Payroll Handling

### Answer: **MINIMAL - NO STRUCTURED PAYROLL SYSTEM**

### What Exists:

1. **Chart of Accounts - Salary Accounts**:
   - **"Salaries Payable"** (code: `2130`): LIABILITY type account
     - Purpose: "Salaries owed to staff"
     - Location: `prisma/seed-chart-of-accounts.ts` line 297-303
   - **"Salary Expense"** (code: `6130`): EXPENSE type account
     - Purpose: "Employee salaries"
     - Location: `prisma/seed-chart-of-accounts.ts` line 429-435

2. **Voucher Linking to Users**:
   - `Voucher.userId`: Optional field to link vouchers to users
   - `VoucherLine.userId`: Optional field to link voucher lines to users
   - `JournalEntryLine.userId`: Optional field to link journal entries to users
   - **Purpose**: Tracking/reporting, not payroll accounting

### What Does NOT Exist:

1. **No Payroll Models**:
   - No `Payroll`, `Salary`, `PayrollEntry`, or `EmployeeSalary` models
   - No salary amount stored per user
   - No payroll period tracking
   - No salary payment records

2. **No Automatic Payroll Processing**:
   - No automatic salary accrual
   - No automatic salary payment vouchers
   - No payroll calculation logic

3. **No Employee-Specific COA**:
   - Users do NOT have `chartOfAccountId` field (unlike customers/suppliers)
   - No automatic COA creation for employees
   - No employee ledger views

### Code Reference:
```297:303:startup-mvp/prisma/seed-chart-of-accounts.ts
    {
      code: "2130",
      name: "Salaries Payable",
      type: "LIABILITY" as AccountType,
      parentCode: "2100",
      description: "Salaries owed to staff",
      isPostable: true,
    },
```

```429:435:startup-mvp/prisma/seed-chart-of-accounts.ts
    {
      code: "6130",
      name: "Salary Expense",
      type: "EXPENSE" as AccountType,
      parentCode: "6000",
      description: "Employee salaries",
      isPostable: true,
    },
```

```752:753:startup-mvp/prisma/schema.prisma
  userId         String?
  user           User?       @relation("VoucherUser", fields: [userId], references: [id], onDelete: SetNull)
```

---

## 3. Existing COA Linkage

### Answer: **NO COA LINKAGE FOR USERS**

### Current State:

**User Model**:
- **NO `chartOfAccountId` field** (unlike `Client` and `Supplier`)
- **NO relation to `ChartOfAccount`**
- **NO automatic COA creation** when user is created

**Comparison with Customers/Suppliers**:
- ✅ `Client` has `chartOfAccountId` → Auto-creates "AR - {Customer Name}" COA
- ✅ `Supplier` has `chartOfAccountId` → Auto-creates "AP - {Supplier Name}" COA
- ❌ `User` has **NO** `chartOfAccountId` → No COA linkage

### Voucher/Journal Entry Linking:

**Optional `userId` fields exist** in:
- `Voucher.userId`: Links voucher to user (for tracking)
- `VoucherLine.userId`: Links voucher line to user
- `JournalEntryLine.userId`: Links journal entry line to user

**Purpose**: These fields are for **tracking/reporting**, not for payroll accounting. They allow:
- Linking expense vouchers to employees (e.g., travel expenses)
- Tracking which user a transaction relates to
- **NOT** for salary payment accounting

### Code Reference:
```731:770:startup-mvp/prisma/schema.prisma
model Voucher {
  id            String      @id @default(cuid())
  voucherNumber String      @unique
  date          DateTime    @default(now())
  type          VoucherType
  reference     String?
  description   String?     @db.Text
  status        String      @default("draft") // draft, posted, cancelled
  createdBy     String
  creator       User        @relation("VoucherCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  postedById    String?
  postedBy      User?       @relation("VoucherPostedBy", fields: [postedById], references: [id], onDelete: SetNull)
  postedAt      DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // Optional links to related entities
  clientId       String?
  client         Client?    @relation(fields: [clientId], references: [id], onDelete: SetNull)
  supplierId     String?
  supplier       Supplier?   @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  userId         String?
  user           User?       @relation("VoucherUser", fields: [userId], references: [id], onDelete: SetNull)
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)

  voucherLines   VoucherLine[]
  journalEntries JournalEntry[]

  @@index([voucherNumber])
  @@index([date])
  @@index([type])
  @@index([status])
  @@index([createdBy])
  @@index([postedById])
  @@index([clientId])
  @@index([supplierId])
  @@index([userId])
  @@index([organizationId])
}
```

---

## 4. Current Payroll Accounting Gaps

### Gap 1: No Employee COA Structure
**Issue**: Employees don't have dedicated COAs like customers/suppliers
- Cannot query "employee ledger" for a specific user
- Cannot track salary accruals per employee
- No hierarchical structure under "Salaries Payable"

**Impact**: 
- Manual salary payments must use generic "Salaries Payable" account
- Cannot see outstanding salary per employee
- No employee-wise salary reports

### Gap 2: No Salary Accrual System
**Issue**: No automatic accrual of salaries
- No monthly salary accrual entries
- No tracking of accrued but unpaid salaries
- No distinction between accrued and paid salaries

**Impact**:
- Manual journal entries required for accruals
- No automatic "Salaries Payable" increase
- No period-based salary tracking

### Gap 3: No Salary Payment Tracking
**Issue**: Salary payments are not structured
- No dedicated salary payment vouchers
- No linking of salary payments to specific employees
- No salary payment history per employee

**Impact**:
- Cannot track which salary payment is for which employee
- Cannot see payment history per employee
- No salary payment reports

### Gap 4: No Employee Expense Tracking
**Issue**: While `userId` exists in vouchers, there's no structured expense tracking
- No employee expense reports
- No employee-wise expense ledger
- No COA for employee advances/loans

**Impact**:
- Cannot easily track employee expenses
- No employee advance/loan tracking
- No employee expense reports

### Gap 5: No Payroll Period Management
**Issue**: No concept of payroll periods
- No monthly/period-based salary calculation
- No payroll period tracking
- No salary payment scheduling

**Impact**:
- Manual salary payment processing
- No automated payroll runs
- No period-based salary reports

---

## 5. What Can Be Safely Added

### 1. **Employee COA Structure** ✅ SAFE
**What**: Add `chartOfAccountId` to User model and auto-create COA on user creation
**Similar to**: Customer/Supplier COA creation pattern

**Implementation**:
- Add `chartOfAccountId` field to `User` model (optional, backward compatible)
- Create COA under "Salaries Payable" parent when user is created
- Format: `"SP - {User Name}"` (SP = Salaries Payable)
- Type: `LIABILITY` (similar to AP for suppliers)
- Code format: `SP-{YYYY}-{NNNN}`

**Benefits**:
- Employee-wise salary tracking
- Employee ledger views
- Structured salary payment accounting

**Risk**: Low - Optional field, backward compatible

### 2. **Employee Ledger Function** ✅ SAFE
**What**: Create `getEmployeeLedger(userId, filters?)` function
**Similar to**: `getCustomerLedger()` and `getSupplierLedger()`

**Implementation**:
- Query `JournalEntryLine` where `chartOfAccountId = user.chartOfAccountId`
- Return formatted ledger with summary totals
- Support date range filtering

**Benefits**:
- View employee salary/expense transactions
- Track employee advances/loans
- Employee-wise accounting reports

**Risk**: Low - Read-only function, no data changes

### 3. **Salary Payable Report** ✅ SAFE
**What**: Create report aggregating all employee COAs under "Salaries Payable"
**Similar to**: AR/AP reports pattern

**Implementation**:
- Find "Salaries Payable" control account
- Get all employee COAs (children of SP parent)
- Query `JournalEntryLine` for all employee COA IDs
- Map COA IDs to users and aggregate by employee
- Calculate balances per employee

**Benefits**:
- See outstanding salaries per employee
- Employee-wise salary aging
- Total salaries payable report

**Risk**: Low - Read-only report, no data changes

### 4. **Salary Payment Voucher Enhancement** ⚠️ MODERATE RISK
**What**: Enhance payment vouchers to better support salary payments
**Implementation**:
- Use existing `PAYMENT` voucher type
- Link to employee via `userId` (already exists)
- Use employee's COA in voucher lines
- Debit: Employee COA (or Salaries Payable)
- Credit: Cash/Bank account

**Benefits**:
- Structured salary payments
- Employee-wise payment tracking
- Better salary payment reports

**Risk**: Moderate - Requires UI changes and workflow updates

### 5. **Employee Expense Reports** ✅ SAFE
**What**: Create reports for employee expenses using existing `userId` fields
**Implementation**:
- Query `JournalEntryLine` where `userId IS NOT NULL`
- Filter by expense accounts
- Group by user and account
- Generate expense reports per employee

**Benefits**:
- Track employee expenses
- Employee-wise expense analysis
- Reimbursement tracking

**Risk**: Low - Uses existing data, read-only reports

### 6. **Salary Accrual System** ⚠️ HIGH RISK
**What**: Automatic monthly salary accrual
**Implementation**:
- New `SalaryAccrual` model or scheduled job
- Monthly accrual entries:
  - Debit: Salary Expense
  - Credit: Employee COA (or Salaries Payable)
- Link to payroll period

**Benefits**:
- Automatic accrual accounting
- Period-based salary tracking
- Accurate financial statements

**Risk**: High - Requires new models, scheduled jobs, complex business logic

---

## 6. Comparison: Customers vs Suppliers vs Employees

| Feature | Customers | Suppliers | Employees (Users) |
|---------|-----------|-----------|-------------------|
| **Dedicated Model** | ✅ `Client` | ✅ `Supplier` | ❌ Uses `User` |
| **COA Auto-Creation** | ✅ Yes | ✅ Yes | ❌ No |
| **chartOfAccountId Field** | ✅ Yes | ✅ Yes | ❌ No |
| **COA Type** | ASSET (AR) | LIABILITY (AP) | N/A |
| **COA Parent** | Accounts Receivable | Accounts Payable | N/A |
| **COA Name Format** | "AR - {Name}" | "AP - {Name}" | N/A |
| **Individual Ledger** | ✅ `getCustomerLedger()` | ✅ `getSupplierLedger()` | ❌ No |
| **Aggregate Report** | ✅ AR Report | ✅ AP Report | ❌ No |
| **Voucher Linking** | ✅ `clientId` | ✅ `supplierId` | ✅ `userId` (optional) |
| **Journal Entry Linking** | ✅ `clientId` | ✅ `supplierId` | ✅ `userId` (optional) |

---

## 7. Current User-Voucher Usage

### How `userId` is Currently Used:

**In Vouchers**:
- `Voucher.userId`: Optional field for linking vouchers to users
- Used for tracking which user a transaction relates to
- **NOT** used for payroll accounting

**In Voucher Lines**:
- `VoucherLine.userId`: Optional field for linking lines to users
- Allows tracking expenses per user
- **NOT** used for salary payments

**In Journal Entry Lines**:
- `JournalEntryLine.userId`: Optional field for linking entries to users
- Copied from `VoucherLine.userId` when voucher is posted
- Used for reporting/tracking

**Current Limitations**:
- No structured salary payment workflow
- No employee-wise salary tracking
- No employee ledger views
- No salary payable reports

---

## 8. Summary

### Current Employee Model:
- **Single User model** handles both system access and employee data
- **No distinction** between "user" and "employee"
- **No payroll-specific fields** (salary, department, hireDate, etc.)
- **No COA linkage** (unlike customers/suppliers)
- **Optional voucher linking** exists but not used for payroll

### Payroll Accounting Gaps:
1. ❌ No employee COA structure
2. ❌ No salary accrual system
3. ❌ No salary payment tracking
4. ❌ No employee expense tracking
5. ❌ No payroll period management

### What Can Be Safely Added:
1. ✅ **Employee COA Structure** (low risk, similar to customer/supplier pattern)
2. ✅ **Employee Ledger Function** (low risk, read-only)
3. ✅ **Salary Payable Report** (low risk, read-only)
4. ⚠️ **Salary Payment Enhancement** (moderate risk, requires UI changes)
5. ✅ **Employee Expense Reports** (low risk, uses existing data)
6. ⚠️ **Salary Accrual System** (high risk, requires new models and logic)

### Recommended Next Steps:
1. **Phase 1 (Low Risk)**: Add `chartOfAccountId` to User model and auto-create COA
2. **Phase 2 (Low Risk)**: Implement `getEmployeeLedger()` function
3. **Phase 3 (Low Risk)**: Create Salary Payable report (aggregate employee COAs)
4. **Phase 4 (Moderate Risk)**: Enhance salary payment workflow
5. **Phase 5 (High Risk)**: Implement salary accrual system (if needed)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Status**: Analysis Complete - No Code Changes Made

