# Developer & System Guide: Employee Types, Policies & Calculations

This document provides a comprehensive guide to the **Employee Type** model and how it serves as a configuration mapping hub for dynamic HR, Attendance, and Payroll policies.

---

## 1. The Core Architecture

In this system, an **Employee Type** (e.g. `Management`, `Executive`, `Staff`) is not just a descriptive text label. It is a dynamic database entity linked directly to a set of calculation policies. When the payroll engine runs or when a biometric/attendance log is processed, the system resolves the rules to apply by checking the employee's assigned `EmployeeType`.

```
  ┌──────────────────────────────────────────────────────────┐
  │                        Employee                          │
  └────────────────────────────┬─────────────────────────────┘
                               │ (linked via employeeTypeId)
                               ▼
  ┌──────────────────────────────────────────────────────────┐
  │                      EmployeeType                        │
  └────┬───────────┬───────────┬───────────┬───────────┬─────┘
       │           │           │           │           │
       ▼           ▼           ▼           ▼           ▼
 ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
 │Salary    ││Attendance││Late      ││Overtime  ││Tiffin/   │
 │Structure ││Policy    ││Policy    ││Policy    ││Night/    │
 │Policy    ││          ││          ││          ││Holiday   │
 └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘
```

---

## 2. Policy Definitions & Configurations

Each of the policies linked to an `EmployeeType` defines specific parameters used during attendance processing and payroll calculation:

### 2.1. Salary Structure Policy (`SalaryStructurePolicy`)
Controls the breakdown of the employee's gross salary into individual components.
*   **`basedOn`**: The base salary component (`GROSS` or `BASIC`).
*   **Component Percentages**:
    *   `basicPercent`: Default split for Basic Salary (e.g. `55.00%`).
    *   `houseRentPercent`: Default split for House Rent (e.g. `26.00%`).
    *   `medicalPercent`: Default split for Medical Allowance (e.g. `5.00%`).
    *   `transportPercent`: Default split for Transport Allowance (e.g. `4.00%`).
    *   `foodPercent`: Default split for Food Allowance (e.g. `10.00%`).

### 2.2. Attendance Policy (`AttendancePolicy`)
Defines attendance-related rewards and whether penalties apply.
*   **`isEligibleForAttendanceBonus`**: Boolean flag toggling eligibility.
*   **`bonusCalculationType`**: Bonus payout rules (e.g. `FLAT` rate vs percentage).
*   **`attendanceBonusAmount`**: Payout rate if the employee satisfies perfect attendance.
*   **`applyAbsentPenalty`**: Toggles whether absent days deduct from the monthly salary.
*   **`applyLatePenalty`**: Toggles whether late check-ins result in deductions.

### 2.3. Late Policy (`LatePolicy`)
Dictates how check-in delays affect salary and attendance status.
*   **`resetLateEveryMonth`**: Toggles whether late count accumulators reset monthly.
*   **`enableLateToAbsentConversion`**: Toggles whether recurrent late punches convert into absent days (e.g. 3 late days = 1 absent day).
*   **`lateDaysForOneAbsent`**: Threshold count for late-to-absent conversion.
*   **`deductSalaryForLate`**: Configures whether late entries trigger automatic payroll deductions.
*   **`deductAttendanceBonusForLate`**: Configures if a late check-in invalidates the attendance bonus.

### 2.4. Overtime Policy (`OvertimePolicy`)
Governs how overtime work hours are calculated and compensated.
*   **`isEligible`**: Enables/disables overtime tracking.
*   **`calculationType`**: OT rate formula (e.g., custom fixed rate vs a multiplier formula).
*   **`basicPercentageFromGross`**: Determines basic-to-gross ratio used in hourly rate calculation.
*   **`monthlyWorkingDays`**: Dividers used to calculate daily and hourly base rates.
*   **`multiplier`**: Hourly rate multiplier (e.g., `2.00` times the basic hourly rate).
*   **`minimumOTMinutes`**: Minimum threshold to qualify for OT (e.g., must work at least 30 minutes overtime to accrue hours).

### 2.5. Tiffin, Night, and Holiday Bill Policies
Configure specific extra allowances paid directly for daily working conditions:
*   **`TiffinBillPolicy`**: Pays a daily allowance (e.g. `100 BDT`) if an employee remains clocked in past a specific evening hour (`allowAfterTime`).
*   **`NightBillPolicy`**: Pays an overnight shift allowance for check-outs that extend past midnight.
*   **`HolidayBillPolicy`**: Pays a flat or multiplier allowance (e.g. `ONE_DAY_GROSS`) if an employee works on weekends or public holidays.

---

## 3. Database Relations Reference

The relations are defined in [prisma/schema.prisma](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/schema.prisma) as follows:

```prisma
model EmployeeType {
  id                      String                 @id @default(cuid())
  name                    String
  description             String?
  status                  String                 @default("active") // "active" | "inactive"
  isTrash                 Boolean                @default(false)
  createdBy               String
  createdAt               DateTime               @default(now())
  updatedAt               DateTime               @updatedAt
  employees               Employee[]
  creator                 User                   @relation("EmployeeTypeCreator", fields: [createdBy], references: [id])
  
  // Relations to policies
  attendancePolicyId      String?
  attendancePolicy        AttendancePolicy?      @relation(fields: [attendancePolicyId], references: [id])
  latePolicyId            String?
  latePolicy              LatePolicy?            @relation(fields: [latePolicyId], references: [id])
  overtimePolicyId        String?
  overtimePolicy          OvertimePolicy?        @relation(fields: [overtimePolicyId], references: [id])
  tiffinBillPolicyId      String?
  tiffinBillPolicy        TiffinBillPolicy?      @relation(fields: [tiffinBillPolicyId], references: [id])
  nightBillPolicyId       String?
  nightBillPolicy         NightBillPolicy?       @relation(fields: [nightBillPolicyId], references: [id])
  holidayBillPolicyId     String?
  holidayBillPolicy       HolidayBillPolicy?     @relation(fields: [holidayBillPolicyId], references: [id])
  salaryStructurePolicyId String?
  salaryStructurePolicy   SalaryStructurePolicy? @relation(fields: [salaryStructurePolicyId], references: [id])

  @@index([attendancePolicyId])
  @@index([latePolicyId])
  @@index([overtimePolicyId])
  @@index([tiffinBillPolicyId])
  @@index([nightBillPolicyId])
  @@index([holidayBillPolicyId])
  @@index([salaryStructurePolicyId])
}
```

---

## 4. Server Actions API

We list and join policy mappings using the following Next.js Server Actions defined in [payroll-policies.action.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/settings/_actions/payroll-policies.action.ts):

*   `listSalaryStructurePolicies()`: Fetches all active salary structures.
*   `listAttendancePolicies()`: Fetches active attendance rules.
*   `listLatePolicies()`: Fetches active late rules.
*   `listOvertimePolicies()`: Fetches overtime configurations.
*   `listTiffinBillPolicies()`, `listNightBillPolicies()`, `listHolidayBillPolicies()`: Fetch allowances.
*   `listEmployeeTypesWithPayrollPolicies()`: Joins `EmployeeType` with all related policies to return a mapped data array:
    ```typescript
    const employeeTypes = await prisma.employeeType.findMany({
      where: { isTrash: false },
      include: {
        attendancePolicy: true,
        latePolicy: true,
        overtimePolicy: true,
        tiffinBillPolicy: true,
        nightBillPolicy: true,
        holidayBillPolicy: true,
        salaryStructurePolicy: true,
      },
    });
    ```

---

## 5. Calculations Integration

### 5.1. Daily Attendance Calculation
During daily attendance punch synchronization, the attendance processor uses the policies resolved from the employee's `EmployeeType`:
1.  **Late Detection**: Compares punch time with `Shift.startTime` + grace period. If late, maps penalty parameters from `LatePolicy`.
2.  **Tiffin Bill**: Compares checkout time with `TiffinBillPolicy.allowAfterTime`. If met, writes `TiffinBillPolicy.amount` to `Attendance.tiffinBillAmount`.
3.  **Night Bill**: Checks if checkout is overnight. If met, writes `NightBillPolicy.amount` to `Attendance.nightBillAmount`.
4.  **Overtime**: If checkout exceeds cutoff bounds, calculates OT hours and maps hourly rates from `OvertimePolicy` to compute `Attendance.calculatedOvertimeAmount`.

### 5.2. Monthly Payroll Run
During a monthly payroll calculation:
1.  **Deductions**: Aggregates `Attendance.lateDeductionAmount` and `absentCount` penalties to set `PayrollItem.lateDeduction` and `PayrollItem.absentDeduction`.
2.  **Allowances**: Sums daily tiffin, night, and holiday bill amounts from the month's attendance sheet to populate `tiffinAllowance`, `nightAllowance`, and `holidayAllowance` columns on the `PayrollItem`.
3.  **Salary Structure**: Splits the employee's monthly Gross salary based on the `SalaryStructurePolicy` splits if no custom salary sheet exists on the employee's master card.
