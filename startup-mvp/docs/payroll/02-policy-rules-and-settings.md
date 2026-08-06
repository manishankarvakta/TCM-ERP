# 02. Payroll Policy Rules & Settings Guide

This guide provides a comprehensive reference to all **Payroll Settings**, **Calculation Modes**, **Policy Rules**, and **Configuration Parameters** available in ffERP.

---

## 1. Payroll Calculation Settings (`/dashboard/settings?section=payroll`)

The core calculation settings are stored in table `Settings` under code `"payroll.settings"`.

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         PAYROLL CALCULATION SETTINGS                        │
 ├─────────────────────────────┬──────────────────┬────────────────────────────┤
 │ Setting Field               │ Allowed Options  │ Default Value & Standard   │
 ├─────────────────────────────┼──────────────────┼────────────────────────────┤
 │ Absent Deduction Days Basis │ calendar /       │ calendar                   │
 │                             │ working          │ (Fixed 30-Day recommended) │
 ├─────────────────────────────┼──────────────────┼────────────────────────────┤
 │ Absent Deduction Rate Basis │ BASIC /          │ BASIC (Executive)          │
 │                             │ GROSS            │ GROSS (Garments/Industrial)│
 ├─────────────────────────────┼──────────────────┼────────────────────────────┤
 │ Standard Working Days/Month │ 20 to 31 Days    │ 30 Days (Fixed Divisor)    │
 ├─────────────────────────────┼──────────────────┼────────────────────────────┤
 │ Working Hours Per Day       │ 1 to 24 Hours    │ 8 Hours                    │
 ├─────────────────────────────┼──────────────────┼────────────────────────────┤
 │ Daily OT Threshold Hours    │ 0 to 24 Hours    │ 8 Hours                    │
 ├─────────────────────────────┼──────────────────┼────────────────────────────┤
 │ Weekday OT Multiplier       │ 1.0x to 5.0x     │ 1.5x                       │
 ├─────────────────────────────┼──────────────────┼────────────────────────────┤
 │ Weekend OT Multiplier       │ 1.0x to 10.0x    │ 2.0x                       │
 ├─────────────────────────────┼──────────────────┼────────────────────────────┤
 │ Holiday OT Multiplier       │ 1.0x to 10.0x    │ 2.0x                       │
 └─────────────────────────────┴──────────────────┴────────────────────────────┘
```

---

## 2. Detailed Configuration Modes

### A. Absent Deduction Salary Rate Basis (`absentDeductionBasis`)
Determines which salary component is used to calculate the daily deduction rate for unapproved absence:

1. **`BASIC` (Basic Salary Basis — 55%)**:
   - **Formula**: $\text{Daily Rate} = \frac{\text{Basic Salary (55\%)}}{\text{Pay Divisor}}$
   - **Usage**: Common in Corporate Offices, IT companies, and Executive Management staff.
   - **Rationale**: Treats allowances (House Rent, Medical) as fixed monthly benefits while penalizing only the core Basic salary.

2. **`GROSS` (Total Gross Salary Basis — 100%)**:
   - **Formula**: $\text{Daily Rate} = \frac{\text{Total Gross Salary (100\%)}}{\text{Pay Divisor}}$
   - **Usage**: Standard in Ready-Made Garment (RMG) factories, textile plants, and industrial manufacturing facilities under **Bangladesh Labour Act 2006 (Section 126)**.
   - **Rationale**: An absent worker does not earn daily House Rent, Medical, Transport, or Food allowances for days they did not perform duty.

---

### B. Month Divisor Mode (`absentDeductionMode` & `standardWorkingDays`)
Determines how daily rates are computed across different calendar months:

1. **`working` (Fixed Working Days Mode)**:
   - **Pay Divisor**: Fixed **30 Days** (or 26 working days) for all 12 calendar months.
   - **Advantage**: Standardizes daily rates across January (31d), February (28d), July (31d), and November (30d), ensuring identical daily rate calculations year-round.

2. **`calendar` (Calendar Days Mode)**:
   - **Pay Divisor**: Dynamic total days of the specific month (e.g. 31 for July, 28 for Feb, 30 for June).

---

### C. Net 8-Hour Overtime Safeguard Rule
To prevent unearned overtime payouts when an employee arrives late:

1. **Rule**: An employee **must complete their required net shift working hours (e.g., 8 net hours)** before any Overtime hours are credited.
2. **Execution**:
   - If `workHours < requiredShiftHours` (e.g. 7h 14m < 8h 00m due to late arrival), `otHours` is set to **`0`**.
   - Morning lateness automatically offsets evening extra stay before granting Overtime.

---

## 3. Submodule Policy Configurations

### 1. Salary Structure Policy (`SalaryStructurePolicy`)
Configures allowance component distribution percentages against Total Contract Gross Salary:
- **Basic Percentage**: `55%`
- **House Rent Percentage**: `26%`
- **Medical Allowance Percentage**: `5%`
- **Transport Allowance Percentage**: `4%`
- **Food Allowance Percentage**: `10%`
- **Total**: `100%`

### 2. Late Policy (`LatePolicy`)
Controls lateness penalties and conversion ratios:
- **`enableLateToAbsentConversion`**: Converts $N$ late arrivals into 1 Absent Day deduction (e.g. 3 Lates = 1 Absent Day).
- **`lateCountForBonusLoss`**: Max late arrivals permitted before forfeiting monthly Attendance Bonus.
- **`deductSalaryForLate`**: Enables direct salary deduction for late arrivals.

### 3. Overtime Policy (`OvertimePolicy`)
- **`isEligible`**: Enables/disables Overtime eligibility per employee category (e.g. Workers = Eligible, Managers = Ineligible).
- **`multiplier`**: OT hourly rate multiplier (e.g. `2.0x` or `1.5x` basic hourly rate).
- **`minimumOTMinutes`**: Minimum threshold (e.g. 30 mins) required before OT is recognized.

---

## 4. How to Update Settings via UI

1. Navigate to **Dashboard Settings**: [`http://localhost:3000/dashboard/settings?section=payroll`](http://localhost:3000/dashboard/settings?section=payroll).
2. Click the **Global Rules** tab ([`tab=global`](http://localhost:3000/dashboard/settings?section=payroll&tab=global)).
3. Under **Absent Deduction Days Basis**, select **Fixed Working Days** and set **30 days**.
4. Under **Absent Deduction Salary Rate Basis**, select **Basic Salary Basis (55%)** or **Total Gross Salary Basis (100%)**.
5. Click **Save Settings**.
6. Open your draft payroll run and click **Recalculate Payroll**.
