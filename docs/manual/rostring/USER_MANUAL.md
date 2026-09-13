# Duty Roster & Shift Scheduling System - User Manual

Welcome to the **Duty Roster & Shift Scheduling System** User Manual for `ffERP`. This guide provides comprehensive instructions for HR managers, supervisors, and department heads on managing daily employee shift schedules, assigning dynamic shifts and off-days, and understanding how roster entries integrate with attendance and payroll processing.

---

## 📌 1. System Overview & Key Concepts

The Duty Roster system uses an **Overlay Architecture** designed to offer maximum scheduling flexibility without altering an employee's default profile assignment.

### Core Concepts:
1. **Default Shift Baseline (`Employee.shiftId`)**:
   - Every employee has a static default shift assigned in their profile (e.g., Morning Shift `08:00 - 16:00`).
   - If no dynamic roster entry is created for a specific day, the employee automatically falls back to their default shift.

2. **Dynamic Daily Roster Override (`EmployeeRoster`)**:
   - Allows assigning custom shifts or off-days on a per-day, per-employee basis.
   - Takes immediate priority over default shift assignments.

3. **Shift Resolution Formula**:
   $$\text{Effective Shift} = \begin{cases} 
   \text{Off Day} & \text{if Roster entry isOffDay = true} \\
   \text{Roster Shift} & \text{if Roster entry exists with custom shift} \\
   \text{Employee Default Shift} & \text{if no Roster entry exists} \\
   \text{System Default Shift} & \text{if no default shift assigned}
   \end{cases}$$

---

## 🔐 2. Access Control & Navigation

### Required Permission Key:
- **Permission Key**: `hr.roster`
- **Module**: `hr` (HR & Payroll)
- **Operations**:
  - `view`: View the duty roster matrix board.
  - `create`: Use the Bulk Roster Schedule Generator.
  - `edit`: Update individual roster cells or clear month overrides.

### Accessing the Roster Board:
1. Log in to your `ffERP` dashboard.
2. In the left navigation sidebar, expand **HR & Payroll**.
3. Click on **Duty Roster** (`/dashboard/hr/roster`).

---

## 🖥️ 3. Matrix Board Controls & Navigation

The Duty Roster Board features an intuitive control toolbar and an interactive matrix grid.

### Control Toolbar Overview:
- **Month Navigation Controls**:
  - **Left Arrow (`<`)**: Jump to the previous month.
  - **Right Arrow (`>`)**: Jump to the next month.
  - **Month Picker**: Click the date input to select any target year and month (e.g., `2026-09`).
- **Employee Search Bar**: Type an employee's name or employee code to instantly filter rows.
- **Clear Month Button (`Trash Icon`)**: Reverts custom roster entries across a target month back to baseline default shifts.
- **Bulk Roster Generator Button (`Calendar Icon`)**: Opens the modal dialog for batch shift scheduling.

---

## 🖱️ 4. Managing Daily Shift Assignments

### A. 1-Click Cell Shift Assignment:
1. Locate the employee's row and the column for the target day of the month.
2. Click on the cell badge to open the **Shift Selector Popover**.
3. Choose one of the available options:
   - **Default Shift**: Reverts the cell to the employee's baseline shift.
   - **Weekly Off Day**: Marks the employee as scheduled off for that day (displays a **Rose** badge labeled `OFF`).
   - **Custom Shift**: Select any active shift (e.g., Evening Shift `16:00 - 00:00`, Night Shift `00:00 - 08:00`). Displays an **Emerald** badge labeled with the shift name.
4. The cell updates immediately and saves to the server.

### Cell Badge Legend:
| Badge Style | Meaning |
| :--- | :--- |
| 🟩 **Solid Emerald** | Custom shift override assigned via roster. |
| 🟥 **Solid Rose** | Scheduled Off Day assigned via roster. |
| ⬜ **Dashed Slate** | Unmodified default shift baseline. |
| 🟧 **Amber Header** | Weekend day (Friday / Saturday). |

---

## ⚡ 5. Bulk Roster Schedule Generator

For departments or teams with recurring schedules or fixed off-days, use the **Bulk Roster Generator**:

1. Click **Bulk Roster Generator** in the top control toolbar.
2. **Date Range**: Select the Start Date and End Date.
3. **Assigned Shift**: Select the shift to assign across the date range, or choose `Employee Default Shift (Revert)`.
4. **Recurring Weekly Off Days**: Check the recurring off-days for your workplace (e.g., check `Fri` for Friday weekly holidays).
5. Click **Generate Roster**. The system automatically creates shift overrides and off-days for all targeted employees across the selected date range.

---

## 🧹 6. Clearing Custom Roster Overrides

To reset custom schedules for a specific month and return employees to default shifts:

1. Navigate to the desired month using the month controls.
2. Click the **Clear Month** button in the control bar.
3. Confirm the prompt. All custom roster entries for that month will be cleared, returning employees to their baseline default shifts.

---

## 🔄 7. Automated Attendance & Payroll Integration

The Duty Roster system integrates automatically with all attendance and payroll processing mechanisms:

### 1. Manual Check-in & Admin Punch Processing
- When an employee punches in or an admin creates a manual attendance entry, the system evaluates late arrival, half-day threshold, and overtime relative to the active rostered shift.

### 2. Biometric Device Background Sync
- Automated biometric device sync (`processor.ts`) prefetches daily roster entries. Biometric check-ins are evaluated against rostered shift times and off-days with 100% accuracy.

### 3. Auto-Absent Protection
- End-of-day bulk absent processing checks roster entries. Employees scheduled as `OFF_DAY` on the roster are protected from being incorrectly marked as `ABSENT`.

### 4. Payroll & Workday Accounting
- Processed attendance statuses (`PRESENT`, `LATE`, `WEEKEND`, `HALF_DAY`), overtime hours, tiffin allowances, and night bill allowances flow directly into monthly payroll calculations with 100% precision.

---

## ❓ 8. Frequently Asked Questions (FAQ)

**Q1: What happens if I don't assign a roster entry for an employee on a given day?**  
*Answer*: The employee automatically uses their static default shift assigned in their profile. If no default shift is assigned in their profile, the system defaults to Morning Shift (`08:00 - 16:00`).

**Q2: Can I change an employee's shift after attendance has already been logged?**  
*Answer*: Yes. Updating a cell in the Duty Roster board updates the effective shift rules. Re-evaluating or recalculating attendance for that day will update work hours and overtime calculations accordingly.

**Q3: How are overtime hours calculated for employees on Evening or Night shifts?**  
*Answer*: Overtime is calculated relative to the active rostered shift's end time. For an Evening Shift ending at 00:00, overtime starts after 00:00 (plus configured OT grace threshold), ensuring accurate night shift OT accounting.

---

*Manual maintained by `ffERP` HR Engineering Team. Last updated: September 2026.*
