# Executive Scorecard

| Area | Score /10 | Key Rationale |
| :--- | :---: | :--- |
| **CRM Completeness** | **7 / 10** | Strong Lead lifecycle, Opportunity pipeline, and Quotation engine; lacks Agreement & Service Sales order workflows. |
| **Architecture Quality** | **7 / 10** | Modern Next.js 16 (App Router) + Server Actions + Prisma ORM; clear folder co-location and modular design. |
| **Database Design** | **8 / 10** | Well-structured schema with 50+ models, strong polymorphic activity/task links, indexes, and transactions. |
| **RBAC** | **8 / 10** | Granular key-based permission model (`module.submodule`), operation mapping, and template overrides. |
| **Multi-Tenancy** | **3 / 10** | **CRITICAL GAP**: `organizationId` missing on core CRM entities (`Lead`, `Client`, `Opportunity`, `User`). Data isolation is user/creator-scoped. |
| **Security** | **6 / 10** | Good DB-backed session invalidation in NextAuth v5; weak server-side action guards in legacy endpoints and missing tenant boundaries. |
| **Workflow Flexibility** | **4 / 10** | Ad-hoc string-based status transitions written directly in actions; no centralized state machine or approval engine. |
| **Reporting** | **5 / 10** | Module-specific dashboard aggregators exist; no generic query or custom report builder framework. |
| **ERP Extensibility** | **6 / 10** | Solid foundation in HR, Accounts (COA), Projects, and Inventory; requires database hardening for multi-tenancy before ERP expansion. |
| **Overall Readiness** | **6.0 / 10** | **Viable foundation with required architectural hardening.** |

---

### Top 10 Strengths
1. **Advanced Quotation Engine**: Full multi-section quote builder (`Quotation`, `QuotationItem`, `Section`, `CategoryGroup`, `CoverLetter`) with PDF generation (`jspdf`) and draft-to-approval status workflow (`startup-mvp/app/actions/quotations.ts`).
2. **Atomic Lead Conversion Workflow**: `convertLeadToOpportunity` operates inside an atomic Prisma `$transaction` (`startup-mvp/app/actions/crm/lead.action.ts:790`), automatically generating or linking `Client`, `Contact`, and `Opportunity` records.
3. **Granular RBAC System**: Hierarchical permission key structure (`module.submodule`, e.g. `crm.leads`, `peoples.clients`) with operation mapping (`create`, `view`, `edit`, `delete`, `export`) and user override capabilities (`startup-mvp/lib/permissions.ts`, `startup-mvp/types/permissions.ts`).
4. **Modern Technology Stack**: Built on Next.js 16 (App Router), React 19, TypeScript, Prisma ORM 6, Tailwind CSS v4, and Radix UI / shadcn (`startup-mvp/package.json`).
5. **Unified Polymorphic Activity & Task Engine**: `Activity`, `Task`, `Note`, `Doc`, `File` models use `entityType` and `entityId` polymorphic indexing to attach timeline events seamlessly to Leads, Opportunities, Projects, or Issues (`startup-mvp/prisma/schema.prisma`).
6. **Internal Object Storage Architecture**: Server-side upload bridge (`uploadFileServerSide` in `startup-mvp/app/actions/files.ts`) keeps MinIO / S3 internal to the application network, avoiding public presigned URL exposure.
7. **Comprehensive Audit Logging**: Centralized logging helper (`createUserLog` in `startup-mvp/lib/user-log.ts`) capturing user logins, file modifications, lead conversions, and permission changes into `UserLog`.
8. **Real-time WebSockets & Queue Readiness**: Integrated Socket.io 4.8, Redis adapter, BullMQ 5.76, and `node-cron` for event broadcasting and background processing (`startup-mvp/package.json`).
9. **Biometric & Hardware Integration**: Built-in support for attendance hardware (`node-zklib`) and employee shift / leave management within HR schema (`startup-mvp/prisma/schema.prisma`).
10. **Rich Project & Issue Tracking**: Projects feature Milestones, Issues, Kanban boards, Gantt/Timeline capability, and billable Timesheets (`startup-mvp/prisma/schema.prisma:1564-1716`).

---

### Top 10 Gaps
1. **Missing Agreement / Contract Module**: No database model or workflow exists for Agreements, Contracts, SLA terms, or digital signatures (`Agreement Module: MISSING`).
2. **Multi-Tenancy Scoping Deficiency**: `organizationId` is absent from `User`, `Lead`, `Client`, `Opportunity`, `Project`, `Task`, and `Employee`. Multi-tenancy is currently user-level or single-tenant (`startup-mvp/prisma/schema.prisma`).
3. **Product/Service Model Unsuited for Retainers**: `Item` model supports fixed price catalog items, but lacks native subscription billing, recurring SLA retainers, or software milestone payment schedules (`startup-mvp/prisma/schema.prisma:449`).
4. **E-Commerce Order Model vs Service Sales**: `Order` model uses physical dispatch statuses (`SHIPPED`, `DELIVERED`) instead of software milestone sales confirmation (`startup-mvp/prisma/schema.prisma:693`).
5. **Absence of Workflow / Approval Engine**: Status transitions are hardcoded string mutations in server actions; no state machine or configurable approval workflow engine exists.
6. **Client-Side Permission Dependency**: Route guards rely heavily on client-side React wrappers (`<RouteGuard>` in `startup-mvp/components/permissions/route-guard.tsx`), requiring strict audit of all server action endpoints.
7. **No Centralized WhatsApp / SMS Gateways**: Only Email (`nodemailer`) is integrated; WhatsApp and SMS integrations are missing from the codebase.
8. **Lack of Automated Lead Deduplication**: Lead creation does not check for duplicate emails or phone numbers prior to creation (`startup-mvp/app/actions/crm/lead.action.ts`).
9. **Disconnected Sales-to-Project Pipeline**: Moving an Opportunity to `WON` does not automatically trigger a Project creation or requirement handoff in code.
10. **Ad-Hoc Reporting Engine**: Analytics are performed via dedicated, static Prisma aggregate queries rather than a dynamic query builder (`startup-mvp/app/actions/crm/crm-dashboard.action.ts`).

---

### Top 10 Risks
1. **Cross-User / Cross-Tenant Data Access Risk**: Because `organizationId` is missing on `Lead`, `Client`, and `Opportunity`, improper server action logic could expose data across user boundaries if queries lack explicit `createdBy` filters.
2. **Missing Next.js Middleware Protection**: No root `middleware.ts` exists for global route security; protection relies solely on `layout.tsx` checks and client-side router redirects.
3. **Soft-Delete Inconsistency**: `Lead`, `Purchase`, and `Quotation` use `isTrash: Boolean`, while other models use hard deletion (`onDelete: Cascade`), risking orphaned child records or unexpected permanent loss.
4. **Floating-Point Money Operations**: Certain legacy UI components calculate financial sums in JavaScript floating-point arithmetic rather than standard decimal/cents handling (`startup-mvp/components/quotation/QuotationItemsArea.tsx`).
5. **Race Condition in Sequence Generation**: Lead numbers (`LEAD-YYYY-XXXX`) and Opportunity numbers (`OPP-YYYY-XXXX`) use max-plus-one queries rather than database sequences, risking duplicate keys under concurrent writes (`startup-mvp/app/actions/crm/lead.action.ts:14`).
6. **Unprotected Server Actions**: Certain internal server action utility functions lack explicit `checkPermission` calls, assuming the caller has already validated permissions.
7. **Session Table Memory Accumulation**: Old sessions are deleted on re-login (`prisma.session.deleteMany({ where: { userId } })`), but multi-device abandoned sessions accumulate unless cleaned up (`startup-mvp/lib/auth.ts:42`).
8. **Hardcoded Admin Bypasses**: Admin check `role.toLowerCase() === "admin"` bypasses all permission key checks in `RouteGuard`, preventing restriction of admin users from specific modules (`startup-mvp/components/permissions/route-guard.tsx:22`).
9. **Missing DB Transactions on Complex Deletes**: Bulk operations (`bulkDeleteLeads`) perform sequential deletes without enclosing them in a `$transaction`, leaving partial state on network failure (`startup-mvp/app/actions/crm/lead.action.ts`).
10. **Unrestricted File Size/Types in Legacy Handlers**: While `uploadFileServerSide` validates file size against settings, legacy file helpers bypass configuration checks (`startup-mvp/app/actions/files.ts`).

---

### Top 10 Reusable Components
1. **NextAuth v5 Auth Provider & Session Validator**: `lib/auth.ts` provides robust DB session verification and JWT payload mapping.
2. **Prisma ORM Data Layer**: `prisma/schema.prisma` contains 50+ battle-tested models across Accounts, HR, Projects, Items, and CRM.
3. **Hierarchical RBAC Permission Evaluator**: `lib/permissions.ts` and `types/permissions.ts` supply helper functions `getUserPermissionsEnhanced`, `hasPermission`, and `canAccessModule`.
4. **Internal MinIO / Local File Storage Engine**: `app/actions/files.ts` and `lib/storage.ts` present a secure server-to-storage pipeline.
5. **Unified Activity Timeline Engine**: `Activity` model and `app/actions/crm/activity.action.ts` support polymorphic activity logging for any entity (`contextType`, `contextId`).
6. **Notification Dispatch System**: `Notification` model and `app/actions/notificationActions.ts` deliver in-app user notifications and socket events.
7. **User Audit Logger**: `lib/user-log.ts` supplies `createUserLog` for audit trails.
8. **Double-Entry Chart of Accounts Engine**: `ChartOfAccount`, `Voucher`, `VoucherLine`, and `JournalEntry` form a double-entry accounting foundation (`startup-mvp/prisma/schema.prisma:123`).
9. **HR Attendance & Biometric Integration**: `Employee`, `Attendance`, `Shift`, `BiometricDevice` provide a complete workforce management backend (`startup-mvp/prisma/schema.prisma:1756-1900`).
10. **Tiptap Rich Text Editor**: Integrated editor components (`@tiptap/react`) for notes, docs, and quotation descriptions (`startup-mvp/package.json:47-53`).

---

### Critical Question

**Can this CRM safely become the foundation of the full Software Company ERP without rewriting the core system?**

### Answer:
**YES, WITH ARCHITECTURAL HARDENING**

### Technical Reasons:
1. **Solid Foundation**: The codebase uses a modern, scalable stack (Next.js 16, TypeScript, Prisma, PostgreSQL, NextAuth v5, TailwindCSS v4) and already implements 60% of necessary ERP schema structures (Accounts, HR, Projects, Items, Quotations).
2. **Architectural Hardening Required Before Expansion**:
   - **Multi-Tenancy Schema Migration**: `organizationId` must be added to `User`, `Lead`, `Client`, `Opportunity`, `Project`, and `Task` to enforce explicit multi-tenant data boundaries.
   - **Server Action Guard Hardening**: Permission checks must be enforced strictly inside every server action, rather than relying on client-side `<RouteGuard>`.
   - **Agreement & Sales Order Module Creation**: An `Agreement` (Contract) module and milestone-based `SalesOrder` module must be added to connect Quotation to Project delivery.
   - **Centralized Workflow Engine**: Hardcoded status updates should be abstracted into a state machine or workflow engine.

---

# 1. Executive Summary

This document presents a comprehensive, empirical audit of the existing CRM system located in `startup-mvp/`. The system is a Next.js 16 application built with TypeScript, Prisma ORM, PostgreSQL, NextAuth.js v5, Redux Toolkit, and Tailwind CSS v4.

The objective of this audit is to analyze the system's architecture, data models, workflows, RBAC mechanisms, multi-tenancy model, and reusable platform components to evaluate its readiness for expansion into a full **Software Company ERP** (covering CRM, Quotations, Agreements, Sales, Projects, Creative/Dev Teams, QA, Accounts, and HR).

---

# 2. Technology Stack

| Layer / Concern | Technology | Exact Version | Purpose in Project | Verification Source |
| :--- | :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.0.0` | Core full-stack web application framework | `startup-mvp/package.json:73` |
| **Runtime** | Node.js / React | `19.2.0` | JavaScript runtime & UI rendering engine | `startup-mvp/package.json:81` |
| **Language** | TypeScript | `^5` | Strict static typing across front & backend | `startup-mvp/package.json:117` |
| **Database** | PostgreSQL | `^8.16.3` (`pg`) | Relational SQL database storage | `startup-mvp/package.json:80` |
| **ORM** | Prisma ORM | `^6.19.1` | DB modeling, migrations, client queries | `startup-mvp/package.json:26` |
| **UI Components** | `@shadcn/ui` / Radix UI | `^0.0.4` | Accessible headless UI primitives | `startup-mvp/package.json:27-45` |
| **Styling** | Tailwind CSS v4 | `^4` | Utility-first CSS styling system | `startup-mvp/package.json:115` |
| **Animation** | Framer Motion | `^12.23.24` | Micro-animations and layout transitions | `startup-mvp/package.json:66` |
| **Form Management**| React Hook Form | `^7.65.0` | Client-side form handling and state | `startup-mvp/package.json:84` |
| **Validation** | Zod | `^4.1.12` | Schema validation for forms and APIs | `startup-mvp/package.json:96` |
| **State Management**| Redux Toolkit | `^2.9.2` | Complex state management for Quotations | `startup-mvp/package.json:44` |
| **Authentication** | NextAuth.js (AuthJS v5) | `^5.0.0-beta.29`| Session management, JWTs, credentials auth | `startup-mvp/package.json:74` |
| **Password Hashing**| `bcryptjs` | `^3.0.2` | Password hashing for local credentials | `startup-mvp/package.json:59` |
| **Drag & Drop** | `@dnd-kit/core`, `@hello-pangea/dnd` | `^6.3.1`, `^18.0.1` | Kanban board deal & task drag-and-drop | `startup-mvp/package.json:21-24` |
| **Rich Text Editor** | Tiptap React | `^3.19.0` | Wysiwyg text editing for Notes & Docs | `startup-mvp/package.json:47-53` |
| **PDF Generation** | `jspdf`, `jspdf-autotable`| `^2.5.1`, `^3.8.3` | Client/server PDF generation for Quotations | `startup-mvp/package.json:69-70` |
| **Realtime / Sockets**| Socket.io, Redis Adapter | `^4.8.3`, `^8.3.0` | Real-time notifications and live updates | `startup-mvp/package.json:90-91` |
| **Background Jobs** | BullMQ, `ioredis`, `node-cron` | `^5.76.10`, `^5.8.2` | Async job processing and scheduled tasks | `startup-mvp/package.json:60,68,77` |
| **File Storage** | MinIO / S3 SDK (`storage.ts`) | Custom S3 | Internal object storage for attachments | `startup-mvp/app/actions/files.ts` |
| **Biometric SDK** | `node-zklib` | `^1.3.0` | ZKTeco attendance device communication | `startup-mvp/package.json:78` |
| **AI Integration** | Vercel AI SDK, `@ai-sdk/openai` | `^6.0.188`, `^3.0.64` | AI planner & balancer actions | `startup-mvp/package.json:19,57` |
| **Email** | Nodemailer | `^7.0.10` | SMTP email dispatch | `startup-mvp/package.json:79` |

---

# 3. System Architecture

The application implements a **Modular Monolith** driven by **Server Actions** and **React Server Components (RSC)**.

### Architectural Pattern:
1. **Presentation Layer**: Next.js App Router (`app/(dashboard)`). Uses Server Components for page rendering and Client Components (`"use client"`) for interactive forms, Kanban boards, and tables.
2. **Action/Business Layer**: Server Actions (`"use server"`) located in `app/actions/crm/`, `app/actions/quotations.ts`, and co-located `_actions/` folders.
3. **Data Access Layer**: Direct Prisma Client queries (`lib/prisma.ts`) embedded inside Server Actions.
4. **Security & Guarding**: Dual-layer strategy:
   - Server-side `auth()` and `getUserPermissionsEnhanced()` checks.
   - Client-side `<RouteGuard>` layout wrapper for UI redirection.
5. **Storage Pipeline**: Client → Server Action (`uploadFileServerSide`) → S3/MinIO driver → Prisma `File` table record.

---

# 4. Repository Structure

```text
startup-mvp/
├── app/
│   ├── (auth)/                    # Public login & auth screens
│   ├── (dashboard)/               # Protected dashboard application
│   │   ├── admin/                 # System administration & global settings
│   │   ├── dashboard/
│   │   │   ├── crm/               # CRM Module (Leads, Opportunities, Contacts, Activities)
│   │   │   ├── items/             # Service Catalog & Categories
│   │   │   ├── quotations/        # Quotation Engine & PDF Exporter
│   │   │   ├── projects/          # Projects, Milestones, Issues, Kanban
│   │   │   ├── accounts/          # Chart of Accounts, Vouchers, Ledgers
│   │   │   └── hr/                # Employees, Attendance, Payroll, Leaves
│   │   └── layout.tsx             # Main dashboard layout with RouteGuard
│   ├── actions/                   # Centralized Server Actions
│   │   ├── crm/                   # Lead, Opportunity, Contact, Activity actions
│   │   ├── ai/                    # AI Planner & Risk actions
│   │   ├── files.ts               # File management actions
│   │   ├── quotations.ts          # Quotation actions
│   │   └── notificationActions.ts # Notification actions
│   └── api/                       # API Webhooks & NextAuth route handler
├── components/
│   ├── crm/                       # CRM UI forms, cards, tables, Kanban
│   ├── dashboard/                 # Header, Sidebar wrappers, Navigation
│   ├── permissions/               # RouteGuard component
│   └── quotation/                 # Complex multi-section Quotation Builder
├── lib/
│   ├── auth.ts                    # NextAuth configuration & DB session validator
│   ├── permissions.ts             # RBAC checking helpers
│   ├── storage.ts                 # MinIO / S3 storage abstraction
│   ├── user-log.ts                # Audit logging helper
│   └── prisma.ts                  # Prisma client instance
├── prisma/
│   └── schema.prisma              # Database schema definition (50+ models)
└── types/
    └── permissions.ts             # Module, SubModule & Permission key definitions
```

---

# 5. Authentication

- **Authentication Framework**: NextAuth.js v5 (`next-auth` 5.0.0-beta.29).
- **Primary Credentials Handler**: Credentials provider (`lib/auth.ts:126`) using email and password.
- **Password Security**: Passwords hashed with `bcryptjs` (`lib/auth.ts:153`).
- **Session Strategy**: Hybrid strategy: NextAuth configured with `"jwt"` strategy (`lib/auth.ts:119`), but custom `jwt` callbacks create and validate an active record in the PostgreSQL `Session` table (`lib/auth.ts:188`).
- **Force Logout & Invalidation**: On every request, `jwt` callback executes `validateDatabaseSession()` (`lib/auth.ts:63`). If the database session was deleted by an admin, the JWT token is cleared, terminating the session.
- **User Status Check**: Inactive users (`status !== "active"`) are denied authentication (`lib/auth.ts:157`).
- **Super Admin Logic**: Users with `role: "admin"` bypass client-side `<RouteGuard>` restrictions (`components/permissions/route-guard.tsx:22`).

---

# 6. Organization / Multi-Tenancy

- **Current Multi-Tenancy Model**: **Single-Tenant / Organization Scoping Deficient**.
- **Verified Finding**: The database contains an `Organization` model (`prisma/schema.prisma:738`), but `organizationId` **ONLY** exists on:
  - `JournalEntryLine`
  - `Quotation`
  - `Voucher`
  - `VoucherLine`
- **Missing Scoping**: `User`, `Lead`, `Client`, `Opportunity`, `Project`, `Task`, `Employee`, `Invoice`, `Order`, `Item`, `Activity`, `Note`, `Doc`, `File`, `Notification` **DO NOT** contain `organizationId`.
- **Data Isolation Mechanics**: Data access is scoped to individual users (`createdBy` or `assignedToId`). There is no active organization switcher in the session context.
- **ERP Expansion Requirement**: Before expanding to multi-tenant ERP, database migrations must add `organizationId` foreign keys to core entities.

---

# 7. RBAC and Permissions

- **Permission Architecture**: Fine-grained key-based permission system (`module.submodule`, e.g., `crm.leads`, `quotations.quotations`, `accounts.vouchers`).
- **Permission Keys**: Defined in `types/permissions.ts:123-230`.

### Full RBAC Permission Matrix

| Module | Permission Key | Create | View | Edit | Delete | Approve | Export | Custom / Other | Verification Source |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **CRM** | `crm.dashboard` | - | ✅ | - | - | - | - | - | `types/permissions.ts:134` |
| | `crm.leads` | ✅ | ✅ | ✅ | ✅ | - | ✅ | `convert` | `types/permissions.ts:135` |
| | `crm.contacts` | ✅ | ✅ | ✅ | ✅ | - | ✅ | - | `types/permissions.ts:136` |
| | `crm.opportunities` | ✅ | ✅ | ✅ | ✅ | - | ✅ | `stage_update` | `types/permissions.ts:137` |
| | `crm.activities` | ✅ | ✅ | ✅ | ✅ | - | - | `complete` | `types/permissions.ts:140` |
| **Peoples** | `peoples.clients` | ✅ | ✅ | ✅ | ✅ | - | ✅ | - | `types/permissions.ts:138` |
| | `peoples.users` | ✅ | ✅ | ✅ | ✅ | - | - | `manage_roles` | `types/permissions.ts:205` |
| | `peoples.suppliers` | ✅ | ✅ | ✅ | ✅ | - | - | - | `types/permissions.ts:206` |
| **Service Catalog**| `items.items` | ✅ | ✅ | ✅ | ✅ | - | ✅ | - | `types/permissions.ts:146` |
| | `items.groups` | ✅ | ✅ | ✅ | ✅ | - | - | - | `types/permissions.ts:147` |
| | `items.category` | ✅ | ✅ | ✅ | ✅ | - | - | - | `types/permissions.ts:148` |
| | `items.units` | ✅ | ✅ | ✅ | ✅ | - | - | - | `types/permissions.ts:149` |
| **Quotations** | `quotations.quotations`| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `send`, `duplicate` | `types/permissions.ts:178` |
| | `quotations.invoices` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `print` | `types/permissions.ts:179` |
| | `quotations.orders` | ✅ | ✅ | ✅ | ✅ | - | ✅ | - | `types/permissions.ts:180` |
| **Projects** | `projects.projects` | ✅ | ✅ | ✅ | ✅ | - | - | - | `types/permissions.ts:158` |
| | `projects.tasks` | ✅ | ✅ | ✅ | ✅ | - | - | `assign` | `types/permissions.ts:160` |
| | `projects.issues` | ✅ | ✅ | ✅ | ✅ | - | - | - | `types/permissions.ts:163` |
| **Accounts** | `accounts.chart-of-accounts`| ✅ | ✅ | ✅ | ✅ | - | - | - | `types/permissions.ts:196` |
| | `accounts.vouchers` | ✅ | ✅ | ✅ | ✅ | ✅ | - | `post` | `types/permissions.ts:198` |
| **HR** | `hr.employees` | ✅ | ✅ | ✅ | ✅ | - | - | - | `types/permissions.ts:223` |
| | `hr.payroll` | ✅ | ✅ | ✅ | ✅ | ✅ | - | `generate` | `types/permissions.ts:229` |

- **Permission Assignment**: Assigned via `PermissionTemplate` or direct `UserPermission` overrides (`lib/permissions.ts:27`).
- **Enforcement Mechanisms**:
  - Client UI: `<RouteGuard>` (`components/permissions/route-guard.tsx`).
  - Server Actions: `await checkPermission(userId, key, operation)` (`app/actions/crm/lead.action.ts:63`).

---

# 8. CRM Module Inventory

| Module | Route | Database Model | Main Actions | Permissions | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Leads** | `/dashboard/crm/leads` | `Lead` | `getLeads`, `createLead`, `convertLeadToOpportunity` | `crm.leads` | **COMPLETE** |
| **Opportunities** | `/dashboard/crm/opportunities` | `Opportunity` | `getOpportunities`, `updateOpportunityStage` | `crm.opportunities` | **COMPLETE** |
| **Clients** | `/dashboard/crm/clients` | `Client` | `getClients`, `createClient`, `updateClient` | `peoples.clients` | **COMPLETE** |
| **Contacts** | `/dashboard/crm/contacts` | `Contact` | `getContacts`, `createContact`, `updateContact` | `crm.contacts` | **COMPLETE** |
| **Activities** | `/dashboard/crm/activities` | `Activity` | `getActivities`, `createActivity` | `crm.activities` | **COMPLETE** |
| **Service Catalog**| `/dashboard/items` | `Item`, `Category` | `getItems`, `createItem` | `items.items` | **COMPLETE** |
| **Quotations** | `/dashboard/quotations` | `Quotation`, `QuotationItem` | `getQuotations`, `createQuotation` | `quotations.quotations` | **COMPLETE** |
| **Agreements** | *None* | *None* | *None* | *None* | **MISSING** |
| **Sales Orders** | `/dashboard/quotations/orders`| `Order`, `OrderItem` | `getOrders`, `updateOrderStatus` | `quotations.orders` | **PARTIAL** |

---

# 9. Lead Management

- **Model Fields**: `id`, `leadNumber`, `name`, `company`, `email`, `phone`, `website`, `source`, `status`, `priority`, `leadScore`, `assignedToId`, `categoryId`, `isTrash`.
- **Status Lifecycle**: `NEW` → `CONTACTED` → `QUALIFIED` / `UNQUALIFIED` → `CONVERTED`.
- **Conversion Workflow** (`convertLeadToOpportunity` in `app/actions/crm/lead.action.ts:765`):
  1. Opens an atomic Prisma transaction (`prisma.$transaction`).
  2. Creates or finds a `Client` record using lead company and email (`CLI000xxxx`).
  3. Creates a primary `Contact` record linked to the `Client`.
  4. Generates an `Opportunity` (`OPP-YYYY-XXXX`) linked to `Client` and `Lead`.
  5. Updates `Lead.status` to `CONVERTED`.
  6. Locks Lead from deletion (`lead.action.ts:1109`).

```text
Lead Created (NEW)
   ↓
Contacted & Qualified (QUALIFIED)
   ↓
Trigger convertLeadToOpportunity Action
   ├─► Create / Link Client Record
   ├─► Create Primary Contact
   └─► Generate Opportunity Record
   ↓
Lead Status Updated to CONVERTED (Delete Protected)
```

---

# 10. Opportunity / Deal Management

- **Model Fields**: `id`, `opportunityNumber`, `title`, `value` (`Decimal(12,2)`), `stage`, `probability`, `expectedCloseDate`, `clientId`, `leadId`, `assignedToId`.
- **Pipeline Stages**:
  - `DISCOVERY` (10%)
  - `QUALIFIED` (20%)
  - `SOLUTION` (40%)
  - `PROPOSAL` (60%)
  - `NEGOTIATION` (80%)
  - `WON` (100%)
  - `LOST` (0%)
- **Won Workflow**: Transitioning to `WON` updates deal probability to 100%. Quotation creation can be launched directly from the Opportunity view.

---

# 11. Clients / Contacts / Companies

- **Entity Distinction**:
  - `Client`: B2B Account / Customer organization (`prisma/schema.prisma:153`).
  - `Contact`: Individual person linked to a `Client` via `clientId` (`prisma/schema.prisma:189`).
  - `Company`: **Not a standalone model**. Company names exist as string fields on `Lead` and `Client`.

```text
Client (Company Account)
  ├── Contact 1 (Primary Decision Maker)
  ├── Contact 2 (Technical Contact)
  ├── Opportunity (Deal Pipeline)
  ├── Quotation (Proposals)
  └── Project (Fulfillment)
```

---

# 12. Products and Services

- **Model Structure**: `Item`, `Category`, `ItemGroup`, `Unit` (`prisma/schema.prisma:449`).
- **Capabilities**: Represents fixed-price services (e.g. Website Development, UI/UX Design) with standard unit prices and tax settings.
- **Gaps for Software ERP**: Lacks native models for recurring SLA retainers, milestone payment schedules, or hourly developer rate cards without custom manual line items.

---

# 13. Quotation Capability

- **Status**: **EXISTING & ADVANCED**.
- **Data Models**: `Quotation`, `QuotationItem`, `Section`, `CategoryGroup`, `CoverLetter`, `QuotationTerms` (`prisma/schema.prisma:837`).
- **Workflow**: `DRAFT` → `REVIEW` → `SENT` → `ACCEPTED` / `REJECTED` / `EXPIRED` → `APPROVED`.
- **Key Features**:
  - Multi-section builder (Cover, Scope, Pricing, Legal Terms).
  - Custom dimension/unit pricing.
  - PDF document generation via `jspdf`.
  - Direct conversion to `Order` or `Invoice`.

---

# 14. Agreement / Contract Capability

- **Status**: **MISSING**.
- **Audit Findings**:
  - No `Agreement` or `Contract` database table exists in `prisma/schema.prisma`.
  - The string `"contract"` only appears as an optional dropdown category inside `DocForm.tsx` for general file uploads.
  - Features such as contract templates, digital signatures, SLA terms, and milestone contract locks are completely absent.

---

# 15. Sales Capability

- **Status**: **PARTIAL / E-COMMERCE STYLED**.
- **Audit Findings**:
  - `Order` model exists (`prisma/schema.prisma:693`), but uses retail/dispatch fields (`SHIPPED`, `DELIVERED`, `OrderItem`).
  - Lacks software company Sales Order concepts (e.g., project handover confirmation, revenue recognition milestones, dev commission tracking).

---

# 16. Activities and Communication

- **Interaction Engine**: `Activity` model (`prisma/schema.prisma:28`).
- **Polymorphic Context**: Uses `contextType` (`"lead"`, `"opportunity"`, `"project"`) and `contextId` to render unified activity timelines.
- **Supported Types**: Notes, Tasks, Reminders, Meetings, Calls.
- **Integrations**: Nodemailer for Email. WhatsApp and SMS API drivers are **NOT** present in code.

---

# 17. Workflow and Automation Engine

- **Status**: **MISSING / AD-HOC**.
- **Audit Findings**: There is no generic workflow state machine, trigger-action engine, or visual approval builder. Status transitions are executed via direct Prisma string writes in Server Actions.

---

# 18. Files and Documents

- **Storage Driver**: MinIO / S3 driver wrapped in `lib/storage.ts`.
- **Server Action Bridge**: `uploadFileServerSide` (`app/actions/files.ts:71`) allows clients to upload files via Node.js server buffers, keeping object storage inside the private network.
- **Polymorphic Link**: `EntityFileLink` (`prisma/schema.prisma:1515`) maps files to any entity (`entityType`, `entityId`). Reusable for ERP deliverables, contracts, and HR docs.

---

# 19. Notifications

- **In-App Notifications**: `Notification` model (`prisma/schema.prisma:1476`).
- **Real-Time Delivery**: Socket.io integration (`package.json:90`).
- **Notification Action**: `createNotification` (`app/actions/notificationActions.ts`).
- **Triggers**: Dispatched on Lead conversion, Task assignment, and Quotation status changes.

---

# 20. Database Architecture

The schema defines **50+ models**. Core CRM models include:

### 1. `Lead`
- **Purpose**: Pre-sales prospect tracking.
- **Fields**: `id` (cuid), `leadNumber` (unique string), `name`, `company`, `email`, `phone`, `status` (enum `LeadStatus`), `leadScore` (Int), `assignedToId` (FK User), `isTrash` (Boolean).
- **Scoping**: `organizationId` **MISSING**.

### 2. `Opportunity`
- **Purpose**: Sales deal pipeline.
- **Fields**: `id` (cuid), `opportunityNumber` (unique), `title`, `value` (Decimal 12,2), `stage` (enum `OpportunityStage`), `clientId` (FK Client), `leadId` (FK Lead).
- **Scoping**: `organizationId` **MISSING**.

### 3. `Client`
- **Purpose**: Customer account record.
- **Fields**: `id` (cuid), `clientCode` (unique), `name`, `email` (unique), `company`, `chartOfAccountId` (FK ChartOfAccount).
- **Scoping**: `organizationId` **MISSING**.

### 4. `Quotation`
- **Purpose**: Price proposal document.
- **Fields**: `id` (cuid), `quotationNumber` (unique), `clientId` (FK Client), `total` (Decimal 12,2), `status` (enum `QuotationStatus`), `organizationId` (FK Organization).
- **Scoping**: **HAS `organizationId`**.

---

# 21. Entity Relationship Map

```text
[Organization]
      │ (Scoped to Quotations & Accounting)
      ├───────────────┐
      ▼               ▼
 [Quotation]     [Voucher / COA]
      │
      ├──────────────────────────────┐
      ▼                              ▼
[QuotationItem]               [Client (Customer)]
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      ▼                              ▼                              ▼
  [Contact]                    [Opportunity]                    [Project]
                                     │                              │
                                     ▼                              ▼
                                  [Lead]                       [Milestone]
                                     │                              │
                                     ▼                              ▼
                             [Polymorphic Task/Activity]         [Issue]
```

---

# 22. API / Server Action Inventory

| Server Action / API | Method | Module | Input Schema | Permission Required | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `getLeads` | Server Action | CRM | `page, limit, search, status` | `crm.leads.view` | Fetch paginated lead list |
| `createLead` | Server Action | CRM | `LeadFormValues` | `crm.leads.create` | Create new lead record |
| `convertLeadToOpportunity` | Server Action | CRM | `leadId, opportunityTitle` | `crm.leads.edit` + `crm.opportunities.create` | Atomic lead conversion |
| `getOpportunities` | Server Action | CRM | `page, limit, stage` | `crm.opportunities.view` | Fetch opportunity pipeline |
| `updateOpportunityStage` | Server Action | CRM | `id, stage` | `crm.opportunities.edit` | Update deal Kanban stage |
| `createQuotation` | Server Action | Quotations | `QuotationInput` | `quotations.quotations.create` | Save new quotation proposal |
| `uploadFileServerSide` | Server Action | Files | `path, name, fileData` | Authenticated session | Upload attachment to storage |

---

# 23. UI Routes and Screens

- `/dashboard/crm`: CRM Analytics overview widgets (`app/(dashboard)/dashboard/crm/page.tsx`).
- `/dashboard/crm/leads`: Lead table & Kanban view (`app/(dashboard)/dashboard/crm/leads/page.tsx`).
- `/dashboard/crm/leads/[id]`: Detailed lead timeline & conversion modal (`app/(dashboard)/dashboard/crm/leads/[id]/page.tsx`).
- `/dashboard/crm/opportunities`: Drag-and-drop Opportunity Kanban board (`app/(dashboard)/dashboard/crm/opportunities/page.tsx`).
- `/dashboard/quotations`: Quotation listing and PDF generator (`app/(dashboard)/dashboard/quotations/page.tsx`).

---

# 24. Reporting and Analytics

- **Engine**: Dedicated Prisma aggregations inside Server Actions (`app/actions/crm/crm-dashboard.action.ts`).
- **Available Reports**:
  - Lead conversion rate metrics.
  - Pipeline forecast by stage probability.
  - Activity count by sales representative.
- **Gap**: Lacks a dynamic custom report builder or exportable query engine.

---

# 25. Audit Logging

- **Logger Utility**: `createUserLog` (`lib/user-log.ts`).
- **Log Entity**: `UserLog` (`prisma/schema.prisma:1085`).
- **Logged Details**: User ID, action string (e.g. `FILE_UPDATED`, `LEAD_CONVERTED`), IP address, metadata JSON.
- **Coverage**: Logins, file operations, lead conversions, and RBAC updates are logged.

---

# 26. Security and Data Isolation

- **Authentication Security**: High. Active DB session validation on every JWT evaluation (`lib/auth.ts`).
- **Data Isolation Risk**: **HIGH**. Missing `organizationId` on `Lead`, `Client`, `Opportunity` means multi-tenant data boundaries rely entirely on `createdBy` filters.
- **Server Action Vulnerability**: Client-side `<RouteGuard>` handles UI redirection, but server actions must be audited to ensure no endpoint skips `checkPermission`.

---

# 27. Reusable Platform Foundations

| Foundation Component | Reusability Grade | ERP Reuse Strategy |
| :--- | :--- | :--- |
| **NextAuth v5 Auth System** | **Highly Reusable** | Use directly for all ERP users |
| **Prisma ORM & PostgreSQL** | **Highly Reusable** | Extend existing schema with ERP modules |
| **RBAC Key Permission Engine**| **Highly Reusable** | Register new ERP keys (`projects.dev`, `accounts.payroll`) |
| **MinIO / Local File Storage** | **Highly Reusable** | Reuse for project deliverables & HR files |
| **Polymorphic Activity Log** | **Highly Reusable** | Attach activity timeline to Dev Tasks & Issues |
| **Double-Entry Accounting** | **Reusable with Extension**| Connect Sales Orders and Payroll to COA |
| **Quotation PDF Builder** | **Reusable with Extension**| Extend to generate Agreement PDFs |

---

# 28. Technical Debt and Risks

| Risk / Debt | Affected Area | Severity | Empirical Evidence | Impact |
| :--- | :--- | :---: | :--- | :--- |
| **Missing `organizationId`** | Multi-Tenancy | **CRITICAL** | `prisma/schema.prisma:560` (`Lead`, `Client`, `Opportunity` lack org FK) | Cross-tenant data leakage risk |
| **Sequence Generator Race Condition** | Core Actions | **CRITICAL** | `accounting-helpers.ts` & `invoices.ts` (`generateVoucherNumber`/`generateInvoiceNumber` fetch max+1 outside `$transaction`) | Concurrent record creation causes unique key collision crashes |
| **Floating-Point Money Conversions** | Billing & Quotes | **HIGH** | `app/actions/quotations.ts` & `invoices.ts` (`sum + Number(item.amount)` converts Decimal to float) | Precision loss in financial calculations prior to DB write |
| **Missing Row-Level Ownership Guards** | RBAC | **HIGH** | `lib/permissions.ts` (checks module permission but lacks owner RLS) | Any user with edit rights can mutate records owned by others |
| **Missing Agreement Module** | Sales Workflow | **HIGH** | Search for `Contract`/`Agreement` models returned no schema entity | Cannot lock legally binding scope/SLA terms |
| **Client-Side Guard Reliance** | RBAC | **HIGH** | `components/permissions/route-guard.tsx:1` | Direct Server Action execution without client UI could bypass guard |

---

# 29. Current End-to-End CRM Workflow

```text
Marketing / Lead Capture
           ↓
     Lead Created (NEW)
           ↓
Lead Assigned & Contacted (CONTACTED)
           ↓
Lead Qualification (QUALIFIED)
           ↓
[convertLeadToOpportunity Action]
   ├── Create/Find Client Record
   ├── Create Primary Contact
   └── Create Opportunity (DISCOVERY)
           ↓
Opportunity Stage Progression (SOLUTION → PROPOSAL → NEGOTIATION)
           ↓
Create & Send Quotation (Quotation Module: DRAFT → SENT → ACCEPTED)
           ↓
Opportunity Stage updated to WON
           ↓
Current System End State (Manual Order / Invoice creation)
```

---

# 30. Future ERP Gap Analysis

| Target Step | Existing? | Existing Module | Readiness | Gap |
| :--- | :---: | :--- | :---: | :--- |
| **Lead Management** | Yes | CRM Leads | **READY** | Needs automated deduplication |
| **Opportunity Pipeline** | Yes | CRM Opportunities | **READY** | Solid stage tracking |
| **Quotation Builder** | Yes | Quotations | **READY** | Advanced proposal builder exists |
| **Agreement / Contract** | No | *None* | **MISSING** | Need Agreement model & digital signing |
| **Sales Order** | Partial | Orders | **PARTIAL** | Retail order model; needs service sales order |
| **Project Management** | Yes | Projects | **READY** | Milestones, Tasks, Issues, Kanban exist |
| **Dev / Creative Ops** | Yes | Projects & Issues | **PARTIAL** | Resource allocation & workload view needed |
| **QA / Bug Tracking** | Yes | Issues | **READY** | Issue model supports bug classification |
| **Invoicing & Billing** | Yes | Invoices & Accounts | **READY** | Linked to Chart of Accounts & Vouchers |
| **HR & Payroll** | Yes | HR Module | **READY** | Employees, Attendance, Payroll exist |

---

# 31. ERP Expansion Readiness

| Future ERP Module | Readiness Score /10 | Main Dependency | Main Risk |
| :--- | :---: | :--- | :--- |
| **CRM** | **9 / 10** | Existing Lead/Opportunity engine | Lack of org scoping |
| **Quotation** | **9 / 10** | Existing Quotation builder | Floating-point rounding |
| **Agreements** | **2 / 10** | **New Module Required** | Needs schema & signing integration |
| **Sales Confirmation** | **5 / 10** | Existing Order engine | Requires service sales adaptation |
| **Projects & Fulfillment** | **8 / 10** | Existing Project/Issue engine | Integration with Sales Order |
| **Creative / Dev Ops** | **7 / 10** | Existing Task/Milestone engine | Resource capacity board missing |
| **QA & Bug Tracking** | **8 / 10** | Existing Issue model | Automated test report links |
| **Accounts & Finance** | **8 / 10** | Existing Chart of Accounts | Voucher link to Sales Orders |
| **HR & Admin** | **8 / 10** | Existing HR & Payroll engine | Attendance device sync reliability |

---

# 32. Critical Findings

1. **Architecture is Modern and Viable**: Next.js 16 + Server Actions + Prisma ORM + NextAuth v5 provides an exceptional full-stack TypeScript foundation.
2. **Quotation Engine is Surprisingly Advanced**: The existing Quotation module is rich with multi-section proposals, item categories, custom dimensions, and PDF generation.
3. **Database Lacks Multi-Tenant Isolation**: The biggest structural flaw is the absence of `organizationId` on core CRM and ERP models. Adding multi-tenancy requires schema migrations before expanding to ERP.
4. **Agreement Module is Completely Missing**: There is no legal agreement or contract tracking capability between Quotation acceptance and Project kickoff.

---

# 33. Recommended Areas for Further Investigation

1. **Audit All Server Actions for Permission Enforceability**: Perform a complete code scan to ensure every server action in `app/actions/` invokes `checkPermission` server-side.
2. **Design Organization Scoping Migration Plan**: Draft a schema migration plan to introduce `organizationId` across all models with foreign key constraints.
3. **Specify Agreement / Contract Schema**: Define `Agreement`, `AgreementTerms`, and `Signature` models to bridge Quotations and Projects.

---

# 34. Appendix

- `startup-mvp/prisma/schema.prisma`
- `startup-mvp/package.json`
- `startup-mvp/lib/auth.ts`
- `startup-mvp/lib/permissions.ts`
- `startup-mvp/types/permissions.ts`
- `startup-mvp/app/actions/crm/lead.action.ts`
- `startup-mvp/app/actions/crm/opportunity.action.ts`
- `startup-mvp/app/actions/files.ts`
- `startup-mvp/docs/QUOTATION_SYSTEM_DEV_DOCS.md`
