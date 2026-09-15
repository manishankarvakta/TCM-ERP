# 03. Payroll Calculation Engine Mathematical Reference

This document serves as the authoritative mathematical reference for the **ffERP Payroll Calculation Engine** ([`app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action.ts`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action.ts)).

---

## 1. Salary Structure Component Breakdown

When an employee's Monthly Contract Gross Salary ($S_{\text{Gross}}$) is evaluated, components are derived using the assigned `SalaryStructurePolicy` percentages ($55 / 26 / 5 / 4 / 10$):

$$\text{Basic Salary } (B) = S_{\text{Gross}} \times 0.55$$
$$\text{House Rent } (HR) = S_{\text{Gross}} \times 0.26$$
$$\text{Medical Allowance } (M) = S_{\text{Gross}} \times 0.05$$
$$\text{Transport Allowance } (T) = S_{\text{Gross}} \times 0.04$$
$$\text{Food Allowance } (F) = S_{\text{Gross}} \times 0.10$$

$$\text{Total Base Gross} = B + HR + M + T + F = S_{\text{Gross}}$$

---

## 2. Daily Salary Rate Formulas

The daily salary rate depends on the **Month Divisor Mode** (`absentDeductionMode`) and **Absent Rate Basis** (`absentDeductionBasis`):

### Divisor Resolution ($D$):
- **Fixed Working Days Mode**: $D = \text{standardWorkingDays}$ (Default: $30$).
- **Calendar Days Mode**: $D = \text{calendarDaysInMonth}$ (e.g. $31$ for July, $28$ for Feb).

### Daily Rate Numerator Resolution ($N$):
- **Basic Basis (`"BASIC"`)**: $N = B = S_{\text{Gross}} \times 0.55$.
- **Gross Basis (`"GROSS"`)**: $N = S_{\text{Gross}}$.

$$\text{Daily Absent Rate } (R_{\text{absent}}) = \frac{N}{D}$$

---

## 3. Absenteeism Deduction Formula

Given total evaluated absent days ($A_{\text{days}}$) in the month:

$$\text{Absenteeism Cut } (D_{\text{absent}}) = \text{Round}_2\Big(A_{\text{days}} \times R_{\text{absent}}\Big)$$

### Mathematical Proofs for ৳45,000 Contract Gross (July, 20.5 Absent Days):

#### Method A: Basic Basis (55%) + Fixed 30 Days Divisor
$$R_{\text{absent}} = \frac{24,750.00}{30} = \text{৳825.00 / day}$$
$$D_{\text{absent}} = 20.5 \times 825.00 = \mathbf{\text{৳16,912.50}}$$
$$\text{Net Pay} = 45,000.00 - 16,912.50 = \mathbf{\text{৳28,087.50}}$$

#### Method B: Gross Basis (100%) + Fixed 30 Days Divisor
$$R_{\text{absent}} = \frac{45,000.00}{30} = \text{৳1,500.00 / day}$$
$$D_{\text{absent}} = 20.5 \times 1,500.00 = \mathbf{\text{৳30,750.00}}$$
$$\text{Net Pay} = 45,000.00 - 30,750.00 = \mathbf{\text{৳14,250.00}}$$

---

## 4. Overtime (OT) Pay Formulas

### A. Hourly Basic Rate ($R_{\text{hourly}}$):
$$R_{\text{hourly}} = \frac{B}{D \times H_{\text{daily}}}$$
*(where $H_{\text{daily}} = 8$ working hours per day).*

### B. Overtime Payout ($E_{\text{OT}}$):
$$E_{\text{OT}} = \text{Round}_2\Big(\text{otHours} \times R_{\text{hourly}} \times M_{\text{OT}}\Big)$$
*(where $M_{\text{OT}} = 1.5$ or $2.0$ multiplier).*

---

## 5. Gross Pay, Total Deductions & Net Pay

### Total Gross Pay ($G_{\text{total}}$):
$$G_{\text{total}} = B + HR + M + T + F + E_{\text{OT}} + A_{\text{tiffin}} + A_{\text{night}} + A_{\text{holiday}} + B_{\text{custom}}$$

### Total Deductions ($D_{\text{total}}$):
$$D_{\text{total}} = D_{\text{absent}} + D_{\text{late}} + D_{\text{loan}} + D_{\text{tax}} + D_{\text{pf}} + F_{\text{custom}}$$

### Net Payable Salary ($S_{\text{Net}}$):
$$S_{\text{Net}} = G_{\text{total}} - D_{\text{total}}$$

---

## 6. General Ledger Accounting Journal Entries

Upon posting a payroll batch to General Ledger via `postPayroll`:

```
  JOURNAL VOUCHER ENTRY (ACCRUAL POSTING)
  ========================================================================
  DEBIT  : Salary & Benefits Expense Account          [G_total]
  CREDIT : Net Salary Payable Liability Account       [S_Net]
  CREDIT : Employee Loan Recovery Control Account     [D_loan]
  CREDIT : Income Tax Payable Control Account         [D_tax]
  CREDIT : Provident Fund Payable Control Account     [D_pf]
  CREDIT : Unapproved Absenteeism Recovery Account    [D_absent]
  ========================================================================
  BALANCE VERIFICATION:
  Total Debits == Total Credits  (DEBIT G_total == CREDIT S_Net + Deductions)
```
