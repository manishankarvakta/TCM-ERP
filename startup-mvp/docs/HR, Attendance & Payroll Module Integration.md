Software Requirements Specification (SRS)
HR, Attendance & Payroll Module Integration
For Existing Garments ERP System
1. Introduction
1.1 Purpose

This document defines the Software Requirements Specification (SRS) for integrating a complete Human Resource Management System (HRMS) into the existing Garments ERP platform.

The new modules will include:

HR Management
Attendance Management
Shift Management
Leave Management
Payroll Management
Overtime Management
Holiday Calendar
Biometric Device Integration
Payroll Accounting Integration

The system will integrate tightly with the existing:

Employee Module
Accounts Module
Voucher System
Journal Entry System
Authentication & Permission Engine
Warehouse/Branch Management System

The goal is to create a scalable, auditable, and accounting-compliant HR & Payroll ecosystem for garments and manufacturing operations.

2. Scope

The HRMS extension will provide:

Core Functional Areas
Module	Description
Employee HR	Employee profiles, documents, designation, department
Attendance	Daily attendance tracking
Shift Management	Shift scheduling and policies
Leave Management	Leave requests and approvals
Payroll	Automated salary calculation
Overtime	OT calculation and approval
Holiday Calendar	Public and company holidays
Loan & Advance	Employee loans and salary advances
Biometric Integration	Fingerprint machine synchronization
Payroll Accounting	Automatic voucher & journal generation
3. Existing System Overview

The current ERP system already contains:

Employee Management
Accounts Module
Chart of Accounts
Voucher System
Journal Entries
Inventory & Production
Role-Based Permissions
Audit Logging
Warehouse Assignment

The existing accounting architecture uses:

Voucher lifecycle
Double-entry bookkeeping
Immutable journal entries
Transaction-safe posting system

This HRMS must follow the same accounting integrity rules.

4. Technology Stack
Layer	Technology
Frontend	Next.js 16 + React 19
UI	TailwindCSS + Shadcn UI
Backend	Next.js Server Actions
ORM	Prisma
Database	PostgreSQL
State Management	Redux Toolkit
Authentication	NextAuth v5
File Storage	MinIO
Cache	Redis

5. Functional Requirements
5.1 HR Management Module
Features
Employee Master Profile

System shall support:

Personal information
Contact information
Emergency contact
NID/Passport
Department
Designation
Joining date
Employment type
Salary structure
Branch/Warehouse assignment
Profile image
Document uploads
Employment Types

System shall support:

Permanent
Temporary
Contract
Intern
Daily Worker
Employee Documents

System shall support storing:

CV
NID
Passport
Certificates
Appointment Letter
Salary Documents
Agreements

Stored via MinIO integration.

5.2 Attendance Management Module
Attendance Features

System shall support:

Check-in
Check-out
Multiple punch handling
Late detection
Early exit detection
Half-day calculation
Absent tracking
Overtime tracking
Manual attendance adjustment
Attendance Sources

Attendance may come from:

Manual Entry
Web App
Mobile App
Biometric Device
API Sync
Attendance Status Types
Status
Present
Absent
Leave
Late
Half Day
Holiday
Weekend
Attendance Rules

System shall:

Prevent duplicate attendance
Lock attendance after payroll posting
Auto-calculate work hours
Detect overtime
Apply shift rules
5.3 Shift Management Module
Features

System shall support:

Multiple shifts
Shift rotation
Night shifts
Grace periods
Late policies
OT thresholds
Shift Parameters
Parameter
Shift Start
Shift End
Grace Minutes
Late After
Half Day After
OT Start After
5.4 Leave Management Module
Leave Features

System shall support:

Leave applications
Leave approvals
Leave cancellation
Leave balance tracking
Paid vs unpaid leave
Multi-level approval
Leave Types
Leave Type
Casual Leave
Sick Leave
Annual Leave
Maternity Leave
Unpaid Leave
Leave Workflow
Employee Request
    ↓
Manager Approval
    ↓
HR Approval
    ↓
Attendance Adjustment
    ↓
Payroll Impact
5.5 Holiday Management Module
Features

System shall support:

Public holidays
Festival holidays
Factory holidays
Branch-specific holidays
5.6 Overtime Management Module
Features

System shall support:

Automatic OT detection
Manual OT approval
OT rates
Holiday OT
Friday OT
Night OT
OT Calculation
OT Amount
= OT Hours × OT Rate
5.7 Payroll Management Module
Payroll Features

System shall support:

Monthly payroll generation
Salary structure management
Bonus management
Deduction management
Loan deduction
Advance deduction
Tax deduction
Attendance-based salary calculation
Payroll approval workflow
Salary sheet generation
Salary payment tracking
Salary Components
Earnings
Basic Salary
House Rent
Medical
Transport
Food Allowance
OT
Bonus
Deductions
Absent deduction
Advance deduction
Loan deduction
Tax
PF contribution
Payroll Workflow
Attendance Finalization
    ↓
Payroll Calculation
    ↓
Payroll Review
    ↓
Payroll Approval
    ↓
Voucher Generation
    ↓
Journal Posting
    ↓
Salary Payment
5.8 Loan & Advance Module
Features

System shall support:

Employee loans
Salary advances
Installment deduction
Loan balance tracking
Loan approval workflow
5.9 Biometric Integration Module
Supported Devices
ZKTeco
eSSL
FingerTec
Features

System shall support:

Device synchronization
Raw punch log storage
Attendance processing
Duplicate punch prevention
Sync error logs
6. Accounting Integration Requirements

The payroll system must integrate directly with the existing Accounts Module.

6.1 Salary Accrual Entry

When payroll is generated:

Debit:
Salary Expense Account

Credit:
Employee Salary Payable Account
6.2 Salary Payment Entry

When salary is paid:

Debit:
Employee Salary Payable

Credit:
Cash/Bank Account
6.3 Advance Deduction Entry
Credit:
Employee Advance Account
7. Non-Functional Requirements
7.1 Performance

System shall:

Process payroll for 10,000+ employees
Generate payroll within acceptable time
Support concurrent attendance sync
7.2 Security

System shall:

Use role-based permissions
Encrypt sensitive data
Maintain audit logs
Restrict payroll access
7.3 Reliability

System shall:

Use Prisma transactions
Prevent partial payroll posting
Ensure accounting integrity
7.4 Scalability

System shall support:

Multiple branches
Multiple factories
Multi-tenant deployment
Distributed attendance devices
8. Database Requirements
New Core Tables
Table
Attendance
AttendanceLog
Shift
LeaveType
LeaveApplication
Payroll
PayrollItem
EmployeeSalary
Holiday
Overtime
EmployeeLoan
9. User Roles & Permissions
Roles
Role
Super Admin
HR Admin
HR Manager
Payroll Officer
Attendance Operator
Factory Manager
Employee
Permission Examples
Feature	Permission
View Payroll	payroll.view
Generate Payroll	payroll.generate
Approve Payroll	payroll.approve
Edit Attendance	attendance.edit
Approve Leave	leave.approve
10. Reports
Attendance Reports
Daily attendance
Monthly attendance
Late reports
Absent reports
OT reports
Payroll Reports
Salary sheet
Payslip
Bank transfer sheet
Payroll summary
Salary register
HR Reports
Employee list
Department-wise employee
Joining report
Leave balance report
Accounting Reports
Salary expense ledger
Salary payable ledger
Employee advance ledger
11. UI/UX Requirements

System shall:

Follow existing ERP UI design
Use Shadcn UI
Be mobile responsive
Support dark mode
Support printable payroll sheets
12. Audit & Compliance

System shall log:

Attendance edits
Payroll approvals
Salary changes
Leave approvals
Loan approvals

Using existing audit infrastructure.

13. System Constraints
Payroll cannot be edited after posting
Attendance cannot be modified after payroll lock
Posted vouchers remain immutable
Journal entries cannot be deleted

Must follow existing accounting policies.

14. Future Enhancements

Future roadmap may include:

Mobile attendance app
Face recognition attendance
GPS attendance
AI attendance anomaly detection
Employee self-service portal
Tax automation
Government compliance automation
Production-linked payroll
Piece-rate salary engine
15. Conclusion

The HRMS addition will transform the current ERP into a complete Garments ERP ecosystem by integrating:

Employee lifecycle management
Attendance tracking
Payroll automation
HR workflows
Accounting-integrated salary processing

The architecture will leverage the existing ERP’s:

Double-entry accounting
Voucher engine
Permission system
Audit system
Transaction-safe backend

to ensure enterprise-grade scalability, accounting integrity, and operational reliability.