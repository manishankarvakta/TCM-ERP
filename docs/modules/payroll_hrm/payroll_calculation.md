# Payroll Calculation Guide

This document explains in simple terms how employee monthly salaries, deductions, overtime, and allowances are calculated by the ERP system.

---

## 1. Salary Structure Split (Earnings)

When an employee has a configured **Gross Base Salary** (e.g., 10,000 BDT), the system automatically splits it into five standard parts based on the type of employee (or default structure settings):

*   **Basic Salary**: **55%** of Gross Salary (e.g., 5,500 BDT)
*   **House Rent**: **26%** of Gross Salary (e.g., 2,600 BDT)
*   **Medical Allowance**: **5%** of Gross Salary (e.g., 500 BDT)
*   **Transport Allowance**: **4%** of Gross Salary (e.g., 400 BDT)
*   **Food Allowance**: **10%** of Gross Salary (e.g., 1,000 BDT)

> **Formula**:
> Basic + House Rent + Medical + Transport + Food = Gross Salary (100%)

---

## 2. Unpaid Absence Deductions (Deductions)

If an employee is absent or on unpaid leave, a portion of their **Basic Salary** is deducted.

### How it counts:
*   **`ABSENT` status**: Counts as **1.0 day** of absence.
*   **`HALF_DAY` status**: Counts as **0.5 day** of absence.
*   **`LEAVE` (Unpaid)**: Counts as **1.0 day** of absence.

### Calculation Divisor:
Depending on your payroll settings, the daily rate is calculated using either:
1.  **Calendar Days**: Divided by the actual number of days in the month (e.g., 30 or 31).
2.  **Working Days**: Divided by a fixed standard number of days (e.g., 26 working days).

> **Formula**:
> Daily Rate = Basic Salary / Days Divisor
> Absence Deduction = Absence Days * Daily Rate

---

## 3. Lateness & Late Cuts (Deductions)

Lateness is tracked for both morning arrival and returning from break:
*   **Morning Late (`lateCountValue`)**: 1 count if checked in past the grace period.
*   **Lunch Late (`breakLateCountValue`)**: 1 count if checked in late from break.

### Late-to-Absent Conversion Rule:
The system totals your late counts for the month. Based on your late policy (e.g., **3 lates = 1 absent day cut**):

> **Formula**:
> Converted Penalty Days = Floor(Total Late Counts / 3)
> Lateness Deduction = Converted Penalty Days * Daily Base Rate

### Attendance Bonus Impact:
If an employee's total monthly lates exceed the policy threshold (e.g., more than 3 lates), they **automatically lose their monthly Attendance Bonus**.

---

## 4. Overtime (OT) Earnings (Earnings)

Overtime hours are tracked from biometric checkout times. The hourly rate is calculated using your Basic Salary:

> **Formula**:
> Hourly Basic Rate = Basic Salary / (Monthly Working Days Divisor * Daily Shift Hours)
> OT Rate = Hourly Basic Rate * OT Multiplier (e.g., 2.0x)
> OT Pay = OT Hours * OT Rate

---

## 5. Structured & Ad-hoc Allowances (Earnings)

*   **Tiffin Bill**: A daily meal allowance granted automatically if checkout exceeds the tiffin threshold (e.g., staying past 7:30 PM).
*   **Night Bill**: A night shift allowance granted if working overnight shifts.
*   **Holiday Bill**: Premium pay added if working on a weekend or public holiday.
*   **Custom Bonus**: Ad-hoc rewards added manually by managers for performance.

---

## 6. Financial Deductions (Deductions)

*   **Loan Repayment**: If the employee has an active cash advance/loan, the configured **monthly installment amount** is automatically deducted.
*   **Tax Withholding**: Deducted based on the employee's configured tax percentage (applied to the **Basic Salary**).
*   **Provident Fund (PF)**: Deducted based on the employee's configured PF percentage (applied to the **Basic Salary**).
*   **Custom Fine**: Ad-hoc disciplinary fines added manually by managers.

---

## 7. The Final Payout (Net Pay)

To compile the employee's salary at the end of the month:

*   **Gross Pay** = Gross Base Salary + OT Pay + Allowances + Bonuses
*   **Total Deductions** = Absences + Lateness + Loan Repayment + Tax + PF + Fines
*   **Net Pay (Net Salary)** = Gross Pay - Total Deductions
