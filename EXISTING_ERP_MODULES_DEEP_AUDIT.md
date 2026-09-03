# Current System Readiness

| Area | Score /10 | Key Rationale |
| :--- | :---: | :--- |
| **CRM** | **7.5 / 10** | Complete Lead, Opportunity, Contact, Client lifecycle; atomic Lead-to-Opportunity conversion transaction. |
| **Sales** | **4.0 / 10** | E-commerce styled `Order` model (`SHIPPED`/`DELIVERED`); lacks milestone service sales order confirmation. |
| **Quotation** | **8.5 / 10** | Advanced multi-section proposal builder (`Quotation`, `QuotationItem`, `Section`, `CoverLetter`) with PDF export. |
| **Projects** | **7.5 / 10** | Comprehensive Project, Milestone, Issue, Task, and Timesheet structure with budget tracking. |
| **Task Management** | **8.0 / 10** | Polymorphic task engine (`Task`, `TaskDependency`, `TaskWatcher`, `Checklist`) supporting subtasks & dependencies. |
| **Development** | **5.0 / 10** | Issues support `type: BUG/FEATURE/TASK` and milestones; lacks Git/GitHub integration, sprints, and code review flows. |
| **QA** | **4.5 / 10** | Issues track bug reports with priority & assignee; lacks dedicated Test Case, Test Run, or UAT modules. |
| **Creative** | **3.0 / 10** | Tasks & Tiptap Docs can store notes/tasks; lacks creative request workflows, asset proofing, or design revision tracking. |
| **Marketing** | **2.0 / 10** | Lead source string exists; lacks campaign tracking, ad spend attribution, or SEO/email campaign management. |
| **HR** | **7.5 / 10** | Complete Employee, Attendance, Shift, Holiday, Leave, Payroll, Loan, and ZKTeco biometric integration. |
| **Accounts** | **8.0 / 10** | Double-entry accounting core (`ChartOfAccount`, `CashBankAccount`, `Voucher`, `VoucherLine`, `JournalEntryLine`). |
| **Resource Planning** | **2.5 / 10** | Timesheets track historical actual work; future capacity allocation & workload balancing models are **MISSING**. |
| **Support** | **1.0 / 10** | **MISSING**. No `Ticket` or `Helpdesk` models exist; client support relies on manual task creation. |
| **Client Portal** | **1.0 / 10** | **MISSING**. Clients do not have user accounts, passwords, or dedicated login authentication. |
| **Approval Engine** | **3.5 / 10** | Ad-hoc status updates in module actions (`approveLeave`, `approvePayroll`); no generic state machine or workflow engine. |
| **Reporting** | **5.0 / 10** | Module-specific dashboard aggregate queries exist; lacks dynamic custom query builder or cross-department analytics. |
| **CEO Control** | **4.5 / 10** | Can answer sales pipeline and project counts; cannot answer project profitability, employee utilization, or SLA risks. |
| **Security** | **6.0 / 10** | Strong NextAuth v5 session invalidation; weak server-action owner checks and reliance on client UI guards. |
| **Multi-Tenancy** | **3.0 / 10** | **CRITICAL GAP**. `organizationId` missing on `User`, `Lead`, `Client`, `Opportunity`, `Project`, `Task`, `Employee`. |
| **Overall ERP Foundation** | **5.5 / 10** | **Solid technical foundation requiring multi-tenancy schema hardening and targeted module extensions.** |

---

### Top 15 Existing Strengths

1. **Advanced Quotation Engine**: Multi-section proposal generation (`Quotation`, `QuotationItem`, `Section`, `CategoryGroup`, `CoverLetter`) with dynamic pricing and PDF generation (`startup-mvp/app/actions/quotations.ts`).
2. **Atomic Lead Conversion**: `convertLeadToOpportunity` operates in a Prisma `$transaction`, seamlessly creating/linking `Client`, `Contact`, and `Opportunity` (`startup-mvp/app/actions/crm/lead.action.ts:765`).
3. **Double-Entry Accounting Core**: Full Chart of Accounts (`ChartOfAccount`), Cash/Bank accounts, Vouchers (`PAYMENT`, `RECEIPT`, `JOURNAL`, `CONTRA`), and Journal Entries (`startup-mvp/prisma/schema.prisma:123-180`).
4. **Comprehensive HR & Payroll Backend**: Employee master, Leave Applications, Shifts, Overtime, Loans, and Payroll generation linked to Vouchers (`startup-mvp/prisma/schema.prisma:316-366, 1756-1999`).
5. **Hardware Biometric Integration**: Direct ZKTeco device integration via `node-zklib` (`startup-mvp/package.json:78`) writing to `AttendanceLog` and `Attendance`.
6. **Polymorphic Task & Work Engine**: `Task` model supports hierarchical subtasks (`parentId`), dependencies (`TaskDependency`), watchers (`TaskWatcher`), checklists, and billable timesheets (`startup-mvp/prisma/schema.prisma:1198`).
7. **Polymorphic Timeline Activity Logging**: `Activity` model logs notes, calls, emails, and meetings for any entity using `contextType` and `contextId` (`startup-mvp/prisma/schema.prisma:28`).
8. **Modern Core Tech Stack**: Built on Next.js 16 (App Router), React 19, TypeScript, Prisma ORM 6, Tailwind CSS v4, and Radix UI / shadcn (`startup-mvp/package.json`).
9. **Granular RBAC Matrix**: Key-based permission structure (`module.submodule`) with mapped operations (`create`, `view`, `edit`, `delete`, `export`) and user overrides (`startup-mvp/lib/permissions.ts`).
10. **Secure Session Invalidation**: NextAuth.js v5 configured with custom JWT callbacks that validate against PostgreSQL `Session` records on every request (`startup-mvp/lib/auth.ts:188`).
11. **Internal File Storage Architecture**: `uploadFileServerSide` server action routes file uploads to MinIO/S3 inside the private network (`startup-mvp/app/actions/files.ts:71`).
12. **Project & Issue Tracking**: Projects feature Milestones, Issues, Kanban boards, Gantt/Timeline views, and Timesheets (`startup-mvp/prisma/schema.prisma:1564-1678`).
13. **Centralized User Audit Logging**: `createUserLog` utility logs authentication events, file uploads, lead conversions, and permission changes into `UserLog` (`startup-mvp/lib/user-log.ts`).
14. **Real-time WebSockets & Queue Infrastructure**: Integrated Socket.io 4.8, Redis adapter, BullMQ 5.76, and `node-cron` for event broadcasting and background processing (`startup-mvp/package.json`).
15. **Financial Project Attribution**: `JournalEntryLine`, `VoucherLine`, `PurchaseItem`, `InvoiceItem`, `PayrollItem`, and `Timesheet` all contain `projectId` foreign keys (`startup-mvp/prisma/schema.prisma`).

---

### Top 15 Missing Capabilities

1. **Agreement / Contract Module**: No `Agreement` or `Contract` database model exists for legal terms, scope locking, or client digital signatures (`Agreement Module: MISSING`).
2. **Client Portal / Client Authentication**: Clients do not have user accounts, passwords, or login capabilities; client interaction relies on public links or email (`Client Portal: MISSING`).
3. **Client Support / Ticketing System**: No `Ticket` or `Helpdesk` database model exists for customer bug reports or service requests (`Ticketing: MISSING`).
4. **Department / Team Model**: No `Department` or `Team` database entity exists. `department` is merely an optional plain text string on `Employee` (`startup-mvp/prisma/schema.prisma:330`).
5. **Future Resource Allocation / Capacity Planning**: No model exists to schedule future employee capacity or balance workload across teams (`Resource Planning: MISSING`).
6. **Milestone Service Sales Order**: The `Order` model is built for physical retail (`SHIPPED`, `DELIVERED`); software milestone sales order confirmations are missing (`startup-mvp/prisma/schema.prisma:693`).
7. **Unified Approval Engine**: Approvals are hardcoded per module; there is no configurable state-machine or cross-department approval workflow engine.
8. **Git / CI/CD Integration**: Project Issues lack integration with Git commits, pull requests, branches, or deployment environments (`DevOps Integration: MISSING`).
9. **QA Test Case & Test Run Management**: No test plan, test case, or automated test result models exist for QA teams (`QA Management: MISSING`).
10. **Creative Asset Proofing**: No asset revision, visual feedback, or design proofing workflow exists (`Creative Ops: MISSING`).
11. **Marketing Campaign Tracking**: No campaign model, ad spend tracking, or multi-channel lead attribution exists (`Marketing Ops: MISSING`).
12. **Automated Lead Deduplication**: Lead creation does not check for duplicate emails or phone numbers before creating records (`startup-mvp/app/actions/crm/lead.action.ts`).
13. **Third-Party WhatsApp / SMS Gateways**: Only Email (`nodemailer`) is present; native WhatsApp and SMS API drivers are missing from code.
14. **Dynamic Custom Report Builder**: Reporting relies on static Prisma aggregations; there is no dynamic query or CEO report builder framework.
15. **Disconnected Sales-to-Project Pipeline**: Moving an Opportunity to `WON` does not automatically spawn a Project or hand off scope requirements in code.

---

### Top 15 Reusable Components

1. **NextAuth v5 Auth Provider**: `lib/auth.ts` for session handling, login verification, and JWT generation.
2. **Prisma ORM Database Schema**: `prisma/schema.prisma` containing 50+ tested relational models.
3. **Hierarchical RBAC Permission Evaluator**: `lib/permissions.ts` and `types/permissions.ts` providing permission checking helpers (`getUserPermissionsEnhanced`, `hasPermission`).
4. **Internal MinIO / S3 Object Storage Bridge**: `app/actions/files.ts` and `lib/storage.ts` for file uploads and presigned URL downloads.
5. **Polymorphic Activity Timeline Engine**: `Activity` model and `app/actions/crm/activity.action.ts` for unified activity feeds.
6. **Polymorphic Task & Work Engine**: `Task`, `TaskDependency`, `TaskWatcher`, and `Checklist` models for team work management (`startup-mvp/prisma/schema.prisma:1198`).
7. **Quotation Proposal Builder**: `Quotation`, `QuotationItem`, `Section`, `CoverLetter` models and `app/actions/quotations.ts`.
8. **Double-Entry Accounting Ledger Engine**: `ChartOfAccount`, `Voucher`, `VoucherLine`, `JournalEntryLine` (`startup-mvp/prisma/schema.prisma:123`).
9. **HR Attendance & Biometric Integration**: `Employee`, `Attendance`, `Shift`, `BiometricDevice` models and `node-zklib` driver.
10. **In-App Notification Dispatcher**: `Notification` model and `app/actions/notificationActions.ts` with Socket.io real-time alerts.
11. **User Audit Logger**: `createUserLog` in `lib/user-log.ts` for audit tracking in `UserLog`.
12. **Tiptap Rich Text Editor**: Integrated editor for Notes, Docs, and Quotation descriptions (`startup-mvp/package.json:47-53`).
13. **Project & Issue Tracking Engine**: `Project`, `Milestone`, `Issue`, and `Timesheet` models (`startup-mvp/prisma/schema.prisma:1564`).
14. **Service Catalog Catalog Engine**: `Item`, `Category`, `ItemGroup`, `Unit` models (`startup-mvp/prisma/schema.prisma:449`).
15. **Client & Contact Management Directory**: `Client` and `Contact` models (`startup-mvp/prisma/schema.prisma:153-189`).

---

### Top 15 Architectural Risks

1. **Missing `organizationId` Across Core Entities**: `User`, `Lead`, `Client`, `Opportunity`, `Project`, `Task`, `Employee`, `Invoice` lack `organizationId` foreign keys, posing cross-tenant data leakage risks (`startup-mvp/prisma/schema.prisma`).
2. **Sequence Generator Race Condition**: `generateVoucherNumber` and `generateInvoiceNumber` fetch max-plus-one outside `$transaction` blocks, risking duplicate key collision crashes under concurrent requests (`accounting-helpers.ts`, `invoices.ts`).
3. **Floating-Point Money Conversions**: `app/actions/quotations.ts` and `invoices.ts` convert `Prisma.Decimal` to native JS `Number` (`sum + Number(item.amount)`) for arithmetic, introducing precision loss prior to DB writes.
4. **Missing Row-Level Ownership Guards**: `lib/permissions.ts` checks module-level permissions but lacks row-level ownership checks (e.g. allowing any user with edit rights to mutate records owned by others).
5. **Client-Side Guard Reliance**: UI navigation relies on `<RouteGuard>` (`components/permissions/route-guard.tsx`), requiring strict audit of all Server Actions to prevent direct API execution bypasses.
6. **Absence of Root Next.js Middleware**: No root `middleware.ts` exists for global URL protection; routing relies on `layout.tsx` checks.
7. **Soft-Delete Inconsistency**: `Lead`, `Purchase`, and `Quotation` use `isTrash: Boolean`, while other models use hard deletion (`onDelete: Cascade`), risking orphaned records.
8. **Hardcoded Admin Bypasses**: `role.toLowerCase() === "admin"` bypasses all permission checks in `RouteGuard`, preventing restriction of admin users from sensitive modules (`components/permissions/route-guard.tsx:22`).
9. **Unbounded Session Accumulation**: Abandoned sessions on secondary devices accumulate in the `Session` table unless explicitly cleaned up (`startup-mvp/lib/auth.ts:42`).
10. **Non-Atomic Bulk Operations**: Bulk actions like `bulkDeleteLeads` execute sequential deletes without enclosing `$transaction` blocks (`startup-mvp/app/actions/crm/lead.action.ts`).
11. **Plain Text Department Attributes**: `department` stored as a plain string on `Employee` prevents structural department hierarchy or cost-center reporting.
12. **Ad-Hoc Status String Transitions**: Status transitions are hardcoded string mutations across actions rather than driven by a state machine.
13. **Unprotected Legacy File Handlers**: Legacy upload helpers bypass file size and type restriction checks defined in system settings (`startup-mvp/app/actions/files.ts`).
14. **Lack of Database Indexes on Certain Polymorphic Keys**: Polymorphic queries missing composite indexes on `[entityType, entityId]` cause full table scans as dataset grows.
15. **Unvalidated Currency Multi-Currency Conversions**: Quotations support currency labels but lack exchange rate models or conversion rates in accounting journals.

---

### Top 10 Cross-Module Integration Gaps

1. **Opportunity to Project Handoff**: `Opportunity` stage `WON` does not automatically spawn a `Project` or transfer requirement documentation.
2. **Quotation to Agreement / Sales Order**: Accepting a `Quotation` transitions its status but does not generate an `Agreement` or milestone `SalesOrder`.
3. **Project Milestone to Billing Invoice**: `Milestone` completion does not trigger an `Invoice` draft or notify Accounts.
4. **Timesheet to Payroll & Project Costing**: `Timesheet` entries do not dynamically feed into `PayrollItem` calculation or Project Profitability ledgers.
5. **Sales Order to Accounting COA**: `Order` creation does not automatically post to Accounts Receivable in `ChartOfAccount`.
6. **Task Engine to Department Workspaces**: `Task` model lacks a `departmentId` foreign key, preventing department-level work queues (Dev vs QA vs Creative).
7. **Client Support to Project Issues**: No connection exists between customer support requests and Development `Issue` tickets.
8. **HR Department to Accounting Cost Center**: `Employee` department strings are not mapped to `ChartOfAccount` cost centers.
9. **Item Service Catalog to Project Tasks**: Adding a service item to a Quotation does not generate corresponding Project task templates.
10. **Lead Source to Marketing Campaign**: `Lead.source` is an unlinked text string not tied to any Marketing Campaign budget or ROI tracker.

---

# 1. Executive Summary

This document presents a comprehensive, empirical audit of the existing CRM, Accounts, HR, Quotation, Project, and Platform codebase located in `startup-mvp/`.

The primary objective of this audit is to evaluate the existing system architecture, database models, server actions, permissions, and departmental capabilities before designing an expansion into a full **Software Company ERP**.

### Summary of Audit Findings:
- **Foundational Architecture**: The application is built on a modern full-stack architecture (Next.js 16 App Router, React 19, TypeScript, Prisma ORM 6, NextAuth.js v5, PostgreSQL).
- **Existing Capability Coverage**: Approximately **55%** of target ERP functionality already exists in code or database schema (CRM, Quotations, Accounts COA, HR & Payroll, Projects, Tasks, Polymorphic Timelines).
- **Critical Architectural Prerequisites**: Before adding new ERP modules, the database must undergo **Multi-Tenancy Schema Hardening** (`organizationId` addition across entities), and core race conditions in sequence generators must be resolved inside `$transaction` blocks.

---

# 2. Complete Module Inventory

| Module | Submodule | Route | DB Models | Actions/APIs | Permissions | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | Login / Session | `/login` | `User`, `Account`, `Session`, `VerificationToken` | `lib/auth.ts`, `app/api/auth/[...nextauth]` | Public | **COMPLETE** |
| **RBAC** | Roles & Perms | `/admin/settings` | `PermissionTemplate`, `UserPermission` | `lib/permissions.ts` | `peoples.users` | **COMPLETE** |
| **CRM** | Leads | `/dashboard/crm/leads` | `Lead`, `Category` | `app/actions/crm/lead.action.ts` | `crm.leads` | **COMPLETE** |
| **CRM** | Opportunities | `/dashboard/crm/opportunities` | `Opportunity` | `app/actions/crm/opportunity.action.ts` | `crm.opportunities` | **COMPLETE** |
| **CRM** | Clients | `/dashboard/crm/clients` | `Client` | `app/(dashboard)/dashboard/clients/_actions/client.action.tsx` | `peoples.clients` | **COMPLETE** |
| **CRM** | Contacts | `/dashboard/crm/contacts` | `Contact` | `app/actions/crm/contact.action.ts` | `crm.contacts` | **COMPLETE** |
| **CRM** | Activities | `/dashboard/crm/activities` | `Activity` | `app/actions/crm/activity.action.ts` | `crm.activities` | **COMPLETE** |
| **Catalog** | Items & Catalog| `/dashboard/items` | `Item`, `Category`, `ItemGroup`, `Unit` | `app/(dashboard)/dashboard/items/_actions/item.action.tsx` | `items.items` | **COMPLETE** |
| **Quotations**| Proposal Builder| `/dashboard/quotations` | `Quotation`, `QuotationItem`, `Section`, `CategoryGroup` | `app/actions/quotations.ts` | `quotations.quotations` | **COMPLETE** |
| **Orders** | Sales Orders | `/dashboard/quotations/orders` | `Order`, `OrderItem` | `app/actions/orders.ts` | `quotations.orders` | **PARTIAL** |
| **Invoices** | Billing Invoices| `/dashboard/quotations/invoices` | `Invoice`, `InvoiceItem` | `app/actions/invoices.ts` | `quotations.invoices` | **COMPLETE** |
| **Projects** | Projects & Kanban| `/dashboard/projects` | `Project`, `Milestone`, `ProjectBudget` | `app/(dashboard)/dashboard/projects/` | `projects.projects` | **COMPLETE** |
| **Tasks** | Work Engine | `/dashboard/projects/tasks` | `Task`, `TaskDependency`, `TaskWatcher`, `Checklist` | `app/actions/tasks.ts` | `projects.tasks` | **COMPLETE** |
| **Issues** | Bugs & Issues | `/dashboard/projects/issues` | `Issue` | `app/(dashboard)/dashboard/projects/issues/` | `projects.issues` | **COMPLETE** |
| **Timesheets**| Time Tracking | `/dashboard/projects/timesheets` | `Timesheet` | `app/actions/timesheets.ts` | `projects.tasks` | **COMPLETE** |
| **Accounts** | Chart of Accounts| `/dashboard/accounts/chart-of-accounts`| `ChartOfAccount`, `CashBankAccount` | `app/(dashboard)/dashboard/accounts/...` | `accounts.chart-of-accounts` | **COMPLETE** |
| **Accounts** | Vouchers & COA | `/dashboard/accounts/vouchers` | `Voucher`, `VoucherLine`, `JournalEntryLine` | `app/(dashboard)/dashboard/accounts/vouchers/_actions/` | `accounts.vouchers` | **COMPLETE** |
| **HR** | Employees | `/dashboard/hr/employees` | `Employee`, `EmployeeSalary` | `app/(dashboard)/dashboard/employees/_actions/` | `hr.employees` | **COMPLETE** |
| **HR** | Attendance | `/dashboard/hr/attendance` | `Attendance`, `AttendanceLog`, `BiometricDevice` | `app/(dashboard)/dashboard/hr/attendance/_actions/` | `hr.attendance` | **COMPLETE** |
| **HR** | Leaves | `/dashboard/hr/leave` | `LeaveType`, `LeaveApplication` | `app/(dashboard)/dashboard/hr/leave/_actions/` | `hr.leaves` | **COMPLETE** |
| **HR** | Payroll | `/dashboard/hr/payroll` | `Payroll`, `PayrollItem`, `EmployeeLoan`, `Overtime` | `app/(dashboard)/dashboard/hr/payroll/_actions/` | `hr.payroll` | **COMPLETE** |
| **Files** | Object Storage | `/dashboard/files` | `File`, `EntityFileLink` | `app/actions/files.ts` | `files` | **COMPLETE** |
| **Alerts** | Notifications | Header Dropdown | `Notification` | `app/actions/notificationActions.ts` | `notifications` | **COMPLETE** |
| **Audit** | User Logs | `/admin/logs` | `UserLog` | `lib/user-log.ts` | `admin` | **COMPLETE** |
| **Agreements**| Legal Contracts | *None* | *None* | *None* | *None* | **MISSING** |
| **Ticketing** | Client Support | *None* | *None* | *None* | *None* | **MISSING** |
| **Portal** | Client Login | *None* | *None* | *None* | *None* | **MISSING** |

---

# 3. Technology & Architecture

- **Framework**: Next.js 16.0.0 (App Router).
- **Runtime & UI**: React 19.2.0, TypeScript, Tailwind CSS v4, Radix UI primitives, shadcn/ui.
- **ORM & DB**: Prisma ORM 6.19.1, PostgreSQL (`pg` 8.16.3).
- **Authentication**: NextAuth.js v5 (`next-auth` 5.0.0-beta.29), `@auth/prisma-adapter` 2.11.1, `bcryptjs` 3.0.2.
- **Architectural Pattern**: Modular Monolith using React Server Components for rendering, Server Actions (`"use server"`) for mutations, and co-located `_actions/` or `app/actions/` modules.

---

# 4. CRM

### Verified Current Workflow:
```text
Lead Created (NEW) 
   ↓
Contacted & Qualified (QUALIFIED)
   ↓
convertLeadToOpportunity Action (Prisma $transaction)
   ├─► Create / Find Client Record (CLIXXXXXXX)
   ├─► Create Primary Contact
   └─► Create Opportunity Record (OPP-YYYY-XXXX)
   ↓
Lead Status set to CONVERTED (Protected against deletion)
   ↓
Opportunity Stage Progression (DISCOVERY → PROPOSAL → NEGOTIATION → WON)
```

- **Models**: `Lead`, `Opportunity`, `Client`, `Contact`, `Activity`.
- **Strengths**: Atomic lead conversion transaction (`app/actions/crm/lead.action.ts:765`). Unified activity timeline via polymorphic `Activity` model.
- **Gaps**: Lacks automated lead deduplication. Opportunity `WON` does not automatically spawn a `Project`. `organizationId` is missing on `Lead`, `Client`, `Opportunity`.

---

# 5. Quotation

- **Status**: **COMPLETE / ADVANCED**.
- **Models**: `Quotation`, `QuotationItem`, `Section`, `CategoryGroup`, `CoverLetter`, `QuotationTerms` (`prisma/schema.prisma:837`).
- **Workflow**: `DRAFT` → `REVIEW` → `SENT` → `ACCEPTED` / `REJECTED` / `EXPIRED` → `APPROVED`.
- **Capabilities**: Multi-section proposal builder, custom dimension pricing, terms template, client PDF export (`jspdf`).
- **Gaps**: Floating-point rounding risk in `sum + Number(item.amount)` before DB saves (`app/actions/quotations.ts`). Accepting a quotation does not generate an `Agreement` or milestone `SalesOrder`.

---

# 6. Sales / Orders

- **Status**: **PARTIAL / E-COMMERCE STYLED**.
- **Models**: `Order`, `OrderItem` (`prisma/schema.prisma:693`).
- **Statuses**: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `COMPLETED`.
- **Analysis**: Structured for retail order dispatch rather than software milestone sales. Needs expansion to support milestone billing, project handover, and dev commission tracking.

---

# 7. Projects

- **Status**: **COMPLETE**.
- **Models**: `Project`, `Milestone`, `MilestoneDependency`, `Issue`, `ProjectBudget` (`prisma/schema.prisma:1564-1678`).
- **Statuses**: `DRAFT`, `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`, `ARCHIVED`.
- **Features**: Milestones with dependencies, Issues, Kanban views, Gantt/Timeline views, billable Timesheets.
- **Gaps**: Disconnected from Opportunity `WON` event. `organizationId` missing on `Project`.

---

# 8. Tasks / Work Management Engine

- **Status**: **COMPLETE / HIGHLY REUSABLE**.
- **Models**: `Task`, `TaskDependency`, `TaskWatcher`, `Checklist`, `ChecklistItem` (`prisma/schema.prisma:1198-1289`).
- **Features**: Hierarchical subtasks (`parentId`), blocker dependencies, watchers, priority, estimated hours, checklists, billable timesheet linkage.
- **Polymorphic Link**: Uses `entityType` (`"lead"`, `"opportunity"`, `"project"`, `"issue"`) and `entityId`.

### Generic Task Engine Reusability: **9.0 / 10**
*Rationale*: The `Task` model is fully polymorphic and hierarchical, making it immediately capable of supporting Creative, Development, QA, and Marketing work items without structural modification.

---

# 9. Development Operations

- **Status**: **PARTIAL**.
- **Existing**: `Issue` model (`prisma/schema.prisma:1646`) supports `type: BUG | FEATURE | TASK`, priority, estimated hours, actual hours, milestone assignment, and assignee.
- **Missing**: Sprints, code backlog, Git/GitHub integration, pull request links, release/environment tracking.

---

# 10. QA

- **Status**: **PARTIAL / ISSUE-BASED**.
- **Existing**: QA issues are created inside `Issue` (`type: BUG`).
- **Missing**: Dedicated `TestCase`, `TestPlan`, `TestRun`, or UAT approval models.

---

# 11. Creative Operations

- **Status**: **PARTIAL / TASK-BASED**.
- **Existing**: Tasks and Tiptap Docs can be assigned to creative personnel.
- **Missing**: Creative request templates, asset proofing, visual feedback markers, or design revision history.

---

# 12. Marketing

- **Status**: **STUB / MISSING**.
- **Existing**: `Lead.source` string field.
- **Missing**: Marketing campaigns, ad spend tracking, landing page attribution, email marketing campaigns.

---

# 13. HR & Admin

- **Status**: **COMPLETE**.
- **Models**: `Employee`, `EmployeeSalary`, `Attendance`, `AttendanceLog`, `Shift`, `Holiday`, `LeaveType`, `LeaveApplication`, `Overtime`, `EmployeeLoan`, `Payroll`, `PayrollItem`, `BiometricDevice` (`prisma/schema.prisma:316-366, 1756-1999`).
- **Features**: ZKTeco hardware sync (`node-zklib`), shift late/half-day rules, paid leave balances, monthly payroll processing with auto-generated Voucher posting.

---

# 14. Department Architecture

- **Status**: **CRITICAL STRUCTURAL GAP**.
- **Audit Finding**: There is **NO `Department` database model** in `prisma/schema.prisma`.
- **Existing Structure**: `department` exists **only** as an optional plain text string column on `Employee` (`schema.prisma:330`).
- **Implication**: Departments cannot be used as cost centers, work queue boundaries, or RBAC scopes without creating a dedicated `Department` entity.

```text
Organization (Global / Flat)
  └── Employee (has department: String?)
```

---

# 15. Accounts & Finance

- **Status**: **COMPLETE / ADVANCED**.
- **Models**: `ChartOfAccount`, `CashBankAccount`, `Voucher`, `VoucherLine`, `JournalEntry`, `JournalEntryLine` (`prisma/schema.prisma:123-180`).
- **Features**: Double-entry bookkeeping, COA hierarchy (`parentId`), multi-voucher types (`PAYMENT`, `RECEIPT`, `JOURNAL`, `CONTRA`), Trial Balance, Balance Sheet, Ledger generation.
- **Project Dimension**: `JournalEntryLine` and `VoucherLine` include `projectId` foreign keys, providing an existing foundation for Project Costing.

---

# 16. Billing & Collection

- **Status**: **COMPLETE**.
- **Models**: `Invoice`, `InvoiceItem` (`prisma/schema.prisma:409-448`).
- **Features**: Invoice generation, item line details, tax calculation, client billing address, link to `Order` and `Voucher`.
- **Gap**: Lacks automated milestone billing triggers driven by Project Milestone completion.

---

# 17. Resource Allocation

- **Status**: **MISSING**.
- **Audit Distinction**:
  - `Timesheet`: Historical actual hours logged (`prisma/schema.prisma:1686`).
  - `Resource Allocation`: Future capacity scheduling & workload balancing (**MISSING**).

---

# 18. Timesheets

- **Status**: **COMPLETE**.
- **Model**: `Timesheet` (`prisma/schema.prisma:1686`).
- **Fields**: `hours` (Decimal 5,2), `date`, `description`, `projectId`, `issueId`, `taskId`, `employeeId`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `isBillable` (Boolean), `approvedById`.
- **Capability**: Fully capable of supporting project costing and billable client hours tracking.

---

# 19. Client Support / Ticketing

- **Status**: **MISSING**.
- **Audit Finding**: Search for `Ticket`, `Support`, or `Helpdesk` returned **no models** in `prisma/schema.prisma`. Customer issues currently rely on manual `Task` or `Issue` creation.

---

# 20. Client Portal

- **Status**: **MISSING**.
- **Audit Finding**: `Client` model (`prisma/schema.prisma:153`) has no `password` or linked `User` record. Clients cannot authenticate or log into the application.

---

# 21. Files & Documents

- **Status**: **COMPLETE**.
- **Models**: `File`, `EntityFileLink` (`prisma/schema.prisma:367, 1515`).
- **Storage Pipeline**: `uploadFileServerSide` action (`app/actions/files.ts`) buffers uploads to internal MinIO/S3 storage.
- **Polymorphic Link**: `EntityFileLink` maps files to any entity (`entityType`, `entityId`).

---

# 22. Notifications

- **Status**: **COMPLETE**.
- **Model**: `Notification` (`prisma/schema.prisma:1476`).
- **Realtime**: Socket.io integration (`package.json:90`).
- **Action**: `createNotification` (`app/actions/notificationActions.ts`). Dispatched on Lead conversion, Task assignment, and Quote updates.

---

# 23. Workflow / Approvals

- **Status**: **PARTIAL / AD-HOC**.
- **Audit Finding**: Approvals are implemented independently per module (`approveLeave`, `approvePayroll`, `approveVoucher`, `approveLoan`) with independent status columns and approver IDs. No generic approval state-machine exists.

| Module | Approval Exists | Implementation | Reusable Engine? |
| :--- | :---: | :--- | :---: |
| **Leave** | Yes | `LeaveApplication.status` + `managerId`/`hrId` | No (Module-specific) |
| **Payroll** | Yes | `Payroll.status` + `approvedBy` | No (Module-specific) |
| **Loans** | Yes | `EmployeeLoan.status` + `approvedBy` | No (Module-specific) |
| **Vouchers** | Yes | `Voucher.status` + `createdBy` | No (Module-specific) |
| **Quotations**| Yes | `Quotation.status` (`APPROVED`) | No (Module-specific) |

---

# 24. Status Architecture

- **Status Inventory**:
  - `LeadStatus`: Prisma Enum (`NEW`, `CONTACTED`, `QUALIFIED`, `UNQUALIFIED`, `CONVERTED`).
  - `OpportunityStage`: Prisma Enum (`DISCOVERY`, `QUALIFIED`, `SOLUTION`, `PROPOSAL`, `NEGOTIATION`, `WON`, `LOST`, `UNQUALIFIED`).
  - `QuotationStatus`: Prisma Enum (`DRAFT`, `REVIEW`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`, `APPROVED`).
  - `ProjectStatus`: Prisma Enum (`DRAFT`, `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`, `ARCHIVED`).
  - `OrderStatus`: Prisma Enum (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `COMPLETED`).
  - `VoucherType`: Prisma Enum (`PAYMENT`, `RECEIPT`, `JOURNAL`, `CONTRA`, `SALES`, `PURCHASE`, `ADJUSTMENT`).
  - `Voucher.status`: Plain `String` (`@default("draft")`).
  - `Client.status`: Plain `String` (`@default("active")`).
- **Inconsistency**: Mixed use of strict Prisma Enums and plain text Strings across models.

---

# 25. Authentication

- **Framework**: NextAuth.js v5 (`next-auth` 5.0.0-beta.29).
- **Credentials Handler**: `lib/auth.ts:126` using `bcryptjs` password verification.
- **Session Verification**: Database session validation (`validateDatabaseSession`) on every JWT evaluation (`lib/auth.ts:188`). Session deletion immediately invalidates active tokens.

---

# 26. RBAC

- **Permission Keys**: Hierarchical strings (`module.submodule`) defined in `types/permissions.ts`.
- **Resolution Helper**: `getUserPermissionsEnhanced` in `lib/permissions.ts`.
- **UI Protection**: Client-side `<RouteGuard>` component (`components/permissions/route-guard.tsx`).
- **Server Action Protection**: `checkPermission` helper invoked inside server actions.

---

# 27. Multi-Tenancy

- **Status**: **CRITICAL DEFICIENCY**.

| Entity | `organizationId` | User Scoped | Tenant Safe? |
| :--- | :---: | :---: | :---: |
| **User** | ❌ No | Self | ⚠️ Risk |
| **Employee** | ❌ No | Linked to User | ⚠️ Risk |
| **Lead** | ❌ No | `assignedToId` / `ownerId` | ⚠️ Risk |
| **Client** | ❌ No | `createdBy` | ⚠️ Risk |
| **Contact** | ❌ No | Linked to Client | ⚠️ Risk |
| **Opportunity** | ❌ No | `assignedToId` | ⚠️ Risk |
| **Quotation** | ✅ **Yes** | `createdBy` | ✅ Safe |
| **Project** | ❌ No | `ownerId` | ⚠️ Risk |
| **Task** | ❌ No | `userId` | ⚠️ Risk |
| **Issue** | ❌ No | `reporterId` | ⚠️ Risk |
| **Timesheet** | ❌ No | `employeeId` | ⚠️ Risk |
| **ChartOfAccount**| ❌ No | Global | ⚠️ Risk |
| **Voucher** | ✅ **Yes** | `createdBy` | ✅ Safe |
| **Invoice** | ❌ No | Linked to Order | ⚠️ Risk |
| **File** | ❌ No | `ownerId` | ⚠️ Risk |

---

# 28. Audit Logging

- **Utility**: `createUserLog` in `lib/user-log.ts`.
- **Model**: `UserLog` (`prisma/schema.prisma:1085`).
- **Details Logged**: `userId`, `action` string, `ipAddress`, `userAgent`, `metadata` JSON.

---

# 29. Current Data Relationship Map

```text
[User] ──1:1──► [Employee]
  │                 │
  ├─► [Lead]        ├─► [Attendance]
  ├─► [Client]      ├─► [LeaveApplication]
  │      │          └─► [PayrollItem] ◄── [Payroll]
  │      ├─► [Contact]                        │
  │      ├─► [Opportunity]                    ▼
  │      │        │                       [Voucher] ──► [VoucherLine]
  │      │        ├─► [Quotation]             │                 │
  │      │        │        │                  ▼                 ▼
  │      └────────┼────────┼───────────► [JournalEntryLine] ◄───┘
  │               ▼        ▼                  ▲
  └───────────► [Project] ◄───────────────────┘
                  │
                  ├─► [Milestone] ──► [Issue]
                  ├─► [Task] ──► [Timesheet]
                  └─► [Polymorphic Activity / File / Doc / Note]
```

---

# 30. Current End-to-End Business Flow

```text
Marketing Source (Plain Text String)
           ↓
     Lead Created (NEW)
           ↓
Lead Qualification (QUALIFIED)
           ↓
[convertLeadToOpportunity Action]
   ├── Create / Find Client
   ├── Create Contact
   └── Create Opportunity (DISCOVERY)
           ↓
Opportunity Stage Progression (SOLUTION → PROPOSAL → NEGOTIATION)
           ↓
Create Quotation (Quotation Engine: DRAFT → SENT → ACCEPTED)
           ↓
Opportunity Stage set to WON
           ↓
[GAP: Manual Process Interruption]
           ↓
Create Project / Order Manually
           ↓
Execute Milestones, Tasks & Timesheets
           ↓
Create Invoice Manually
           ↓
Post Voucher Receipt to Chart of Accounts
```

---

# 31. Department Readiness

| Department | Existing Foundation | Readiness /10 | Missing Capability |
| :--- | :--- | :---: | :--- |
| **Creative** | Tasks, Tiptap Docs, Attachments | **3.0 / 10** | Creative requests, asset proofing, revision tracking |
| **Marketing** | Lead source string | **2.0 / 10** | Campaign tracking, ad spend, lead attribution |
| **Sales** | Leads, Opportunities, Quotations | **8.0 / 10** | Milestone service sales orders, commission tracking |
| **Accounts** | Chart of Accounts, Vouchers, Invoices | **8.5 / 10** | Automated project profitability aggregation |
| **Development** | Issues, Tasks, Milestones, Timesheets | **6.0 / 10** | Git/GitHub integration, Sprints, Code reviews |
| **QA** | Issues (`type: BUG`) | **4.5 / 10** | Test cases, Test plans, Test runs, UAT |
| **HR / Admin** | Employees, Attendance, Leave, Payroll | **8.0 / 10** | Department entity, recruitment, performance |
| **Project Mgmt** | Projects, Milestones, Tasks, Kanban | **8.0 / 10** | Automated Opportunity handover, capacity allocation |
| **Support** | *None* | **1.0 / 10** | Ticket model, Helpdesk, SLA, Client Portal |

---

# 32. Module Reuse Matrix

| Future Capability | Existing Component | Decision | Reason |
| :--- | :--- | :--- | :--- |
| **CRM** | `Lead`, `Opportunity`, `Client`, `Contact` | **EXTEND** | Add `organizationId`, deduplication, and auto handover |
| **Quotation** | `Quotation`, `QuotationItem`, `Section` | **REUSE AS-IS** | Complete, advanced engine; fix float math |
| **Agreement** | *None* | **BUILD NEW** | Create `Agreement` and digital signature models |
| **Service Sale** | `Order`, `OrderItem` | **EXTEND** | Adapt retail Order into Milestone Service Sales Order |
| **Project Mgmt** | `Project`, `Milestone`, `Timesheet` | **REUSE AS-IS** | Rich project delivery backbone |
| **Task Engine** | `Task`, `TaskDependency`, `Checklist` | **REUSE AS-IS** | Generic polymorphic task engine |
| **Resource Allocation**| *None* | **BUILD NEW** | Capacity scheduling & workload planning engine |
| **Creative Ops** | `Task`, `File` | **EXTEND** | Add creative request & asset proofing extensions |
| **Marketing Ops** | `Lead.source` | **BUILD NEW** | Campaign tracking & ROI attribution engine |
| **Development Ops**| `Issue`, `Milestone` | **EXTEND** | Add Sprints, Git integration, and pull request links |
| **QA Ops** | `Issue` (`type: BUG`) | **EXTEND** | Add Test Cases, Test Runs, and UAT approval |
| **Accounts** | `ChartOfAccount`, `Voucher`, `Ledger` | **REUSE AS-IS** | Complete double-entry accounting engine |
| **HR & Payroll** | `Employee`, `Attendance`, `Payroll` | **EXTEND** | Create `Department` entity and cost centers |
| **Support Ticketing**| *None* | **BUILD NEW** | Create `Ticket`, `SLA`, and Helpdesk modules |
| **Approval Engine** | Ad-hoc status actions | **REFACTOR** | Build unified state-machine approval engine |
| **CEO Dashboard** | Static Prisma aggregations | **EXTEND** | Build dynamic cross-department analytics queries |

---

# 33. CEO Control Readiness

| CEO Question | Status | Data / Model Missing |
| :--- | :---: | :--- |
| **1. How much is our sales pipeline?** | **YES** | Aggregate `Opportunity.value` by `stage` |
| **2. Which quotations are pending?** | **YES** | Filter `Quotation` where `status = SENT` |
| **3. Which deals are likely to close?** | **YES** | Filter `Opportunity` where `probability >= 60%` |
| **4. How many projects are active?** | **YES** | Count `Project` where `status = ACTIVE` |
| **5. Which projects are delayed?** | **PARTIAL**| Compare `Project.endDate` against current date |
| **6. Which projects are over budget?** | **PARTIAL**| Compare `Project.budget` against sum of `JournalEntryLine` cost |
| **7. Which employees are overloaded?** | **NO** | Future workload capacity allocation model is **MISSING** |
| **8. Which employees are underutilized?** | **NO** | Future workload capacity allocation model is **MISSING** |
| **9. What is our revenue?** | **YES** | Sum of posted `Voucher` receipts or `Invoice` totals |
| **10. What is our collection?** | **YES** | Sum of `Voucher` where `type = RECEIPT` |
| **11. What is overdue?** | **YES** | Filter `Invoice` where `dueDate < NOW` and `status = UNPAID` |
| **12. What is project profit?** | **PARTIAL**| `projectId` exists on ledger lines; unified aggregation view missing |
| **13. Which clients have critical issues?**| **PARTIAL**| Count `Issue` where `priority = URGENT` by `clientId` |
| **14. Which approvals need attention?** | **PARTIAL**| Disconnected across `LeaveApplication`, `Payroll`, `Voucher` |
| **15. Which department is blocking delivery?**| **NO** | `Department` entity does not exist in database schema |

---

# 34. Reporting Readiness

- **Existing Dashboards**: CRM Dashboard (`crm-dashboard.action.ts`), HR Dashboard, Financial Reports (COA, Trial Balance, Ledger), Project Reports (`project-reports.ts`).
- **Data Available for CEO Dashboard**: Sales pipeline value, active project count, cash/bank balances, overdue receivables, employee attendance count.
- **Missing Data for CEO Dashboard**: Resource utilization rates, department cost performance, client SLA compliance, project profitability P&L.

---

# 35. Technical Risks

| Risk | Area | Severity | Empirical Evidence | ERP Impact |
| :--- | :--- | :---: | :--- | :--- |
| **Missing `organizationId`** | Multi-Tenancy | **CRITICAL** | `schema.prisma:560` (`Lead`, `Client`, `Opportunity` lack org FK) | Cross-tenant data leak risk |
| **Sequence Race Condition** | Core Actions | **CRITICAL** | `accounting-helpers.ts` (`generateVoucherNumber` max+1 outside transaction) | Unique key collision crashes under load |
| **Float Money Precision Loss** | Quotations/Invoices| **HIGH** | `app/actions/quotations.ts` (`sum + Number(item.amount)`) | Calculation discrepancies on invoices |
| **Missing Row-Level Security** | RBAC | **HIGH** | `lib/permissions.ts` (checks module permission but lacks owner check)| Users with edit rights can mutate any record |
| **Missing Department Entity** | HR / Admin | **HIGH** | `schema.prisma:330` (`department` is plain string on Employee) | Cannot scope permissions or costs by department |
| **Client-Side Guard Reliance** | Security | **HIGH** | `components/permissions/route-guard.tsx:1` | Direct API execution bypasses UI guard |

---

# 36. Missing Capabilities

1. `Agreement` / `Contract` legal document model and digital signature workflow.
2. `Department` and `Team` database entities.
3. `Ticket` / `Helpdesk` customer support module.
4. Client Portal authentication (`Client` user login).
5. Future Resource Capacity Allocation & Workload Balancing engine.
6. Service Sales Order confirmation model with milestone billing triggers.
7. Centralized Workflow & Approval State-Machine Engine.
8. Git / GitHub / CI/CD pipeline integration for Development Issues.
9. QA Test Case, Test Plan, and Test Run modules.
10. Marketing Campaign tracking and ROI attribution.

---

# 37. Critical Findings

1. **Robust Core Foundation**: The application possesses a high-quality full-stack codebase (Next.js 16 App Router, TypeScript, Prisma ORM, NextAuth v5) with battle-tested engines for Quotations, Accounts (Double-Entry COA), HR/Payroll, and Projects.
2. **Key Architectural Prerequisites**:
   - Database schema must be migrated to introduce `organizationId` across all core models.
   - A `Department` model must be created to support department-level work queues and cost accounting.
   - Sequence generation functions must be wrapped inside `$transaction` locks.
3. **No Need to Rebuild Core Engines**: Quotations, Projects, Tasks, Accounts, HR, and Files should be extended, **NOT** rebuilt.

---

# 38. Appendix

- `startup-mvp/package.json`
- `startup-mvp/prisma/schema.prisma`
- `startup-mvp/lib/auth.ts`
- `startup-mvp/lib/permissions.ts`
- `startup-mvp/types/permissions.ts`
- `startup-mvp/app/actions/crm/lead.action.ts`
- `startup-mvp/app/actions/crm/opportunity.action.ts`
- `startup-mvp/app/actions/quotations.ts`
- `startup-mvp/app/actions/files.ts`
- `startup-mvp/app/actions/notificationActions.ts`

---

# MOST IMPORTANT FINAL ANSWERS

### 1. What percentage of the future Software Company ERP already exists?
**~55% of the total target ERP functionality already exists.**
*Evidence*: Full double-entry Accounts COA, complete HR & Payroll, advanced Quotation engine, rich Project/Task/Issue management, File storage, RBAC, and CRM Lead/Opportunity workflows are already implemented in code and schema.

### 2. Which modules should NOT be rebuilt?
- **Quotation Engine**: `Quotation`, `QuotationItem`, `Section`, `CoverLetter` (Extremely thorough builder; only fix floating-point math).
- **Task Engine**: `Task`, `TaskDependency`, `TaskWatcher`, `Checklist` (Generic polymorphic design handles any department work).
- **Accounts Engine**: `ChartOfAccount`, `Voucher`, `VoucherLine`, `JournalEntry` (Complete double-entry accounting foundation).
- **HR & Payroll Engine**: `Employee`, `Attendance`, `LeaveApplication`, `Payroll` (Fully functional with biometric sync).
- **File Storage Infrastructure**: `uploadFileServerSide` and `storage.ts` (Secure internal object storage bridge).

### 3. Which existing modules should be extended?
- **CRM**: Add `organizationId`, automated lead deduplication, and auto-handover to Projects on `WON`.
- **Projects & Issues**: Add Sprints, Git commit/PR links, and milestone billing triggers.
- **HR**: Create a true `Department` database entity linked to `Employee`.
- **Sales / Orders**: Adapt retail `Order` into a Software Milestone Service Sales Order.

### 4. Which modules genuinely need to be built new?
1. **Agreement / Contract Module** (`Agreement`, `AgreementTerms`, digital signatures).
2. **Client Support / Ticketing System** (`Ticket`, `TicketComment`, `SLA`).
3. **Client Portal Authentication** (Client user login & dashboard).
4. **Future Resource Capacity Allocation Engine** (Planning future workload availability).
5. **Marketing Campaign Engine** (`Campaign`, ad spend, ROI attribution).
6. **QA Test Management** (`TestCase`, `TestRun`, `TestPlan`).
7. **Centralized Approval Engine** (Cross-department state machine).

### 5. Which architectural problems must be solved before adding new ERP modules?
1. **Multi-Tenancy Schema Migration**: Add `organizationId` foreign keys across `User`, `Lead`, `Client`, `Opportunity`, `Project`, `Task`, `Employee`, `Invoice`.
2. **Department Database Entity**: Create `Department` and `Team` models so RBAC and cost accounting can be department-scoped.
3. **Sequence Generator Race Condition Fix**: Enclose sequence code generators (`generateVoucherNumber`, `generateInvoiceNumber`) inside Prisma `$transaction` blocks.
4. **Server Action Ownership Guard Enforcement**: Enforce row-level ownership validation inside Server Actions.

### 6. Can the current Project/Task system support Creative, Development, QA and Operations?
**YES.** The `Task` model is polymorphic (`entityType`, `entityId`), hierarchical (`parentId`), supports blocker dependencies (`TaskDependency`), watchers, checklists, and billable timesheets. It is fully capable of driving work across Creative, Dev, QA, and Ops teams.

### 7. Can the current Accounts system support project profitability?
**YES, WITH REPORTING EXTENSION.** `JournalEntryLine`, `VoucherLine`, `PurchaseItem`, `InvoiceItem`, `PayrollItem`, and `Timesheet` already possess `projectId` foreign keys. The underlying accounting records store project-level income and expenses. A dynamic query/reporting view is all that is needed to display P&L per project.

### 8. Can the current HR system support department/resource management?
**PARTIALLY.** The HR system excels at Employee records, Attendance, Leave, and Payroll. However, `department` is currently stored as an unlinked text string on `Employee`. Creating a `Department` database entity is required for true department resource management.

### 9. Can the current CRM + Quotation system support the future commercial flow?
**YES.** The Lead → Opportunity → Quotation pipeline is exceptionally strong. The missing link is inserting an `Agreement` step and a `Service Sales Order` step between Quotation acceptance and Project creation.

### 10. What information is still missing before a final ERP upgrade plan can safely be created?
1. Exact client preference on whether Multi-Tenancy should be hard database isolation per organization or shared organization context.
2. Preferred digital signature integration (e.g. DocuSign API vs native canvas signature) for Agreements.
3. Git provider choice (GitHub vs GitLab) for Development issue integration.
