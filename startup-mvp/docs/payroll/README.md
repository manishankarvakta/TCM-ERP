# ffERP HR & Payroll System Documentation Suite

Welcome to the comprehensive technical and operational documentation for the **ffERP HR & Payroll Subsystem**. This documentation covers system architecture, policy configurations, mathematical calculation engine formulas, and end-user operational manuals.

---

## 📚 Table of Contents

| Section | Documentation File | Focus & Scope |
| :--- | :--- | :--- |
| **01. System Architecture & Modules** | [`01-system-architecture-and-modules.md`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/docs/payroll/01-system-architecture-and-modules.md) | Architectural sitemap, 11 submodules, database schema models, data flow pipelines (`AttendanceLog` $\rightarrow$ `Attendance` $\rightarrow$ `Payroll`). |
| **02. Policy Rules & Settings Guide** | [`02-policy-rules-and-settings.md`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/docs/payroll/02-policy-rules-and-settings.md) | Detailed configuration guide for Gross vs. Basic absent deduction basis, 30-day divisor vs. Calendar, 8-hour net OT rule, and late penalties. |
| **03. Calculation Engine Reference** | [`03-calculation-engine-reference.md`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/docs/payroll/03-calculation-engine-reference.md) | Exhaustive mathematical formulas for salary component splits (55/26/5/4/10), daily rates, proration, absenteeism, late deductions, and accounting journal entries. |
| **04. End-User Manual & Workflows** | [`04-user-manual-and-workflows.md`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/docs/payroll/04-user-manual-and-workflows.md) | Step-by-step user manual for HR Officers, Payroll Managers, and Accountants (Biometric sync, Draft creation, Recalculate button, Approval, and Post to GL). |
| **📊 Comprehensive HR & Payroll Report** | [`Comprehensive_HR_and_Payroll_System_Report.md`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/docs/payroll/Comprehensive_HR_and_Payroll_System_Report.md) | Full end-to-end system report detailing overall sitemap, 11 submodules, UI settings, Gross vs Basic basis, Net 8h OT safeguard, and GL posting. |
| **🗓️ July 2026 Payroll Audit Report** | [`July_2026_Payroll_Calculation_Report.md`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/docs/payroll/July_2026_Payroll_Calculation_Report.md) | Dedicated audit report for **July 2026 (`PR-2026-07`)** and **Abdullah AL Mamun Molla (`EMP1000171`)** covering initial bugs, fixes, and side-by-side math. |
| **⏱️ Attendance Module Deep Dive** | [`Attendance_Module_Deep_Dive_Report.md`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/docs/payroll/Attendance_Module_Deep_Dive_Report.md) | Deep-dive architectural report on biometric punch ingestion, break tracking, lateness penalties, and the **Net 8-Hour Overtime Safeguard** engine. |

---

## 🌟 System Highlights & Key Features

1. **Flexible Absenteeism Basis**: Toggle seamlessly between **Basic Salary Basis (55%)** (Executive standard) and **Total Gross Salary Basis (100%)** (Garments/Industrial standard under Bangladesh Labour Act 2006).
2. **Fixed 30-Day vs. Calendar Month Divisor**: Supports fixed 30-day month calculation across all 12 calendar months (`defaultPayDivisor = 30`).
3. **Net 8-Hour Overtime Safeguard**: Ensures an employee completes their 8 required net working hours before Overtime starts accumulating, preventing unearned OT payouts on late arrival days.
4. **Instant Draft Recalculation**: One-click **Recalculate Payroll** action on draft salary sheets to instantly update attendance logs, overtime, loans, fines, and bonuses.
5. **URL-Embedded Navigation**: Deep-linking support (`?section=payroll&tab=global`) ensuring active tabs never reset during reloads or form saves.
6. **Double-Entry Accounting Balance**: Automated generation of balanced accrual and disbursement journal vouchers (`Debit Expenses = Credit Liabilities + Credit Recoveries`).

---

## 🏢 Business Context & Compliance Standards

- **Bangladesh Labour Act 2006 (Section 126 & Section 2(45))**: Full support for Gross Wages deduction on unapproved absence in industrial manufacturing facilities.
- **Bangladesh RMG / Garment Industry Alignment**: Pre-configured defaults for 8-hour shifts, fixed 60-minute lunch break deductions, and 55/26/5/4/10 salary structure splits.
- **Audit Compliance**: Complete immutable audit trail logging (`UserLog`) for all policy changes, status transitions, draft recalculations, and GL postings.
