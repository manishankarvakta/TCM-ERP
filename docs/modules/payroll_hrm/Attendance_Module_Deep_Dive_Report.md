# HR & Payroll — Attendance Module Deep Dive Report

**Module Location**: [`lib/hr/biometric/processor.ts`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/lib/hr/biometric/processor.ts) & [`lib/hr/shift-utils.ts`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/lib/hr/shift-utils.ts)  
**Scope**: Ingestion, Punch Pairing, Shift Resolution, Lateness, Net Work Hours & Overtime Engine  
**Date of Report**: August 6, 2026  
**Status**: Production Architecture  

---

## 1. EXECUTIVE SUMMARY

The **ffERP Attendance Subsystem** is an enterprise-grade biometric processing engine capable of processing thousands of raw device punches per second, pairing check-in and check-out events across shift boundaries (including overnight shifts crossing midnight), tracking lunch break deductions, evaluating lateness penalties, and calculating net overtime hours.

---

## 2. BIOMETRIC INGESTION & PROCESSING PIPELINE

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         ATTENDANCE INGESTION PIPELINE                       │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ 1. Raw Punch Ingestion (`AttendanceLog`)                                    │
 │    - Ingests device punches (ZKTeco, Realtime, Hikvision) via Webhook/API   │
 │    - Filters rapid duplicate punches (< 2 minutes)                          │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ 2. Date & Shift Window Resolution (`resolveAttendanceDateForPunch`)          │
 │    - 4-Hour Pre/Post Buffer routes overnight punches to operational date    │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ 3. Check-In & Check-Out Pairing (`processBiometricAttendance`)              │
 │    - Earliest punch within window = Check-In (`checkIn`)                    │
 │    - Latest punch within window = Check-Out (`checkOut`)                    │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ 4. Work Hours Calculation (`calculateWorkHoursWithBreak`)                   │
 │    - Total Elapsed Time = CheckOut - CheckIn                                │
 │    - Deducts Lunch Break (`FIXED` 60m or `TRACKED` mid-punches)             │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ 5. Net 8-Hour Overtime Safeguard (`calculateOTHours`)                        │
 │    - Validates `workHours >= requiredShiftHours` (8.0 hrs) before OT grant   │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ 6. Status Determination (`determineAttendanceStatus`)                       │
 │    - Evaluates PRESENT, LATE, HALF_DAY, ABSENT, WEEKEND, LEAVE               │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CORE ATTENDANCE ALGORITHMS & LOGIC

### 1. Lunch Break Deduction Engine
Supports three distinct break modes configured per shift (`Shift.breakType`):
- **`FIXED` (Default 60 Mins)**: Deducts a fixed 60 minutes (1 hour) from total elapsed time between check-in and check-out.
- **`TRACKED` (Mid-Punches)**: Calculates exact elapsed break time between `breakCheckOut` and `breakCheckIn` mid-day punches.
- **`NONE`**: No break deduction applied (e.g. 6-hour continuous shifts).

### 2. Lateness Evaluation & Grace Periods
- **Shift Start Time**: `08:00 AM`
- **Grace Minutes (`graceMinutes`)**: `7 Minutes` (Arrival up to `08:07 AM` = `PRESENT`).
- **Late Threshold (`lateAfter`)**: `10 Minutes` (Arrival at `08:10 AM` or later = **`LATE`**).
- **Half Day Threshold (`halfDayAfter`)**: `220 Minutes` (Arrival after `11:40 AM` = **`HALF_DAY`**).

---

## 4. NET 8-HOUR OVERTIME SAFEGUARD RULE

### Problem Statement
Previously, raw biometric overtime (`calculateOTHours`) evaluated OT based solely on whether an employee checked out past 5:00 PM (`shiftEndDateTime`), ignoring whether they arrived late in the morning.

### Solution Implementation ([`lib/hr/shift-utils.ts#L285`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/lib/hr/shift-utils.ts#L285))
We updated `calculateOTHours` to dynamically check the assigned shift's start time, end time, and break settings to compute required shift work hours:

$$\text{requiredShiftHours} = \frac{(\text{shiftEndTime} - \text{shiftStartTime}) - \text{breakDuration (mins)}}{60}$$

If actual net worked hours (`workHours`) is less than `requiredShiftHours`, Overtime is blocked:

$$\text{If } \text{workHours} < \text{requiredShiftHours} \implies \mathbf{\text{otHours} = 0}$$

---

## 5. CASE STUDY: JULY 26, 2026 (`EMP1000171`)

### Biometric Log Details
- **Date**: July 26, 2026 (Sunday)
- **Employee**: Abdullah AL Mamun Molla (`EMP1000171`)
- **Check-In**: `09:15:16 AM` (75 minutes late)
- **Check-Out**: `05:30:14 PM` (30 minutes past shift end)
- **Shift**: Day Shift (`08:00` – `17:00` with 60m fixed break)

```
  08:00 AM                  09:15 AM                          05:00 PM  05:30 PM
    │                          │                                 │        │
    ▼                          ▼                                 ▼        ▼
  Shift Start           Actual Check-In                       Shift End Actual Check-Out
    ├──── 75m LATE ────────────┤                                 ├─ +30m ─┤
                               └─── 8h 15m Total Elapsed ────────┴────────┘
                                    - 1h 00m Fixed Lunch Break
                                   ────────────────────────────
                                    = 7h 15m (7.23 Net Work Hrs)
```

### Calculation Breakdown
1. **Gross Elapsed Time**: $\text{09:15:16 AM to 05:30:14 PM} = 8 \text{ Hours } 15 \text{ Mins}$.
2. **Net Worked Hours**: $8 \text{ hrs } 15 \text{ mins} - 1 \text{ hr break} = \mathbf{7.23 \text{ Hours}}$ (`7h 14m`).
3. **Required Shift Hours**: $(17:00 - 08:00) - 1 \text{ hr break} = \mathbf{8.0 \text{ Hours}}$.
4. **Overtime Evaluation**:
   - Because $7.23 < 8.0 \text{ Hours}$, the system detected that the employee did **not** complete the required 8 net work hours for the shift.
   - **Result**: Morning lateness (75 mins) offset the evening extra stay (30 mins), and `otHours` evaluated to **`0`** (**0 OT Hours**).

---

## 6. AUDIT COMPLIANCE & RE-SYNC SAFETY

- **Manual Override Locks**: Manual attendance edits set `isManual = true`. Biometric auto-sync engines respect manual overrides and skip modified rows.
- **Locked Payroll Isolation**: Once a monthly payroll batch is approved or posted to General Ledger, associated daily attendance rows are locked (`isLocked = true`) to prevent historical data mutation.
