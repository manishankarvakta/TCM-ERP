
# SYSTEM ARCHITECTURE AUDIT

**Date**: 2026-02-11
**Scope**: Full System Audit (Read-Only)

====================================================
1. PROJECT STRUCTURE OVERVIEW
====================================================

The project follows a standard **Next.js App Router** structure with a flat, functional organization.

```
/
├── app/                    # Routing & Pages
│   ├── (auth)/             # Authentication routes
│   ├── (dashboard)/        # Main app application
│   │   └── dashboard/
│   │       ├── accounts/   # Accounting Module
│   │       ├── crm/        # CRM Module (Fragmented/Zombie)
│   │       ├── items/      # Inventory/Items Module
│   │       ├── quotations/ # Sales/Quotation Module
│   │       └── settings/   # Admin Settings
│   └── api/                # API Routes (for external/cron)
├── actions/                # (Root) - Seemingly unused or legacy?
├── app/actions/            # Server Actions (Primary Business Logic)
├── components/             # Shared UI Components (shadcn/ui)
├── lib/                    # Shared Utilities, Auth, Permissions
├── prisma/                 # Database Schema & Migrations
├── scripts/                # Seeding & Maintenance Scripts
└── types/                  # TypeScript Definitions
```

*   **Business Logic**: Primarily located in `app/actions/*.ts`.
*   **Server Actions**: Centralized in `app/actions/`.
*   **UI Components**: Split between `components/` (shared) and `app/.../_components` (feature-specific).
*   **Cross-Module Imports**: Heavy. `app/actions/quotations.ts` imports from accounting helpers, creating tight coupling.

====================================================
2. ROUTING SYSTEM (Next.js App Router)
====================================================

The routing is **modular by folder**, but implementation consistency varies.

**Key Routes:**

*   **Dashboard**: `app/(dashboard)/dashboard`
    *   `/accounts/*`: Accounting module (Vouchers, Ledgers, Chart of Accounts).
    *   `/items/*`: Inventory management.
    *   `/quotations/*`: Sales & Orders.
    *   `/purchases/*`: Procurement.
    *   `/crm/*`: **STRUCTURAL ERROR**. The folders exist (`contacts`, `deals`, `leads`) but the `page.tsx` files appear missing or directories are empty in some cases, or code exists without backing data models (Zombie Routes).
    *   `/settings/*`: Admin configuration.

*   **API**: `app/api`
    *   `/admin`, `/auth`, `/backup`
    *   `/quotations/check-expired`: External cron trigger endpoint.

**Status**:
*   **Routing Style**: Folder-based modularity.
*   **Isolation**: Moderate. Modules are separated by folders, but deeply coupled in logic/actions.

====================================================
3. PRISMA DATA STRUCTURE REPORT
====================================================

**Schema Summary**: Use of a single `schema.prisma` file containing all module definitions.

**Core Models**:
*   `User`, `Organization`, `PermissionTemplate`

**Business Models**:
*   **Sales**: `Quotation`, `QuotationItem`, `Order`, `Invoice`
*   **Purchase**: `Purchase`, `PurchaseItem`, `Supplier`
*   **Inventory**: `Item`, `Category`, `Unit`, `Delivery`
*   **Entities**: `Client`, `Supplier`, `Employee` (Note: `Client` and `Supplier` carry CRM-like data, but dedicated CRM models are missing).

**Accounting Models**:
*   `ChartOfAccount`, `startOfAccount` (typos likely in logic, schema has `ChartOfAccount`), `JournalEntry`, `JournalEntryLine`, `Voucher`.

**Missing/Reverted Models (CRM)**:
*   `Contact`, `Opportunity`, `Deal`, `PipelineStage`, `Activity` are **NOT PRESENT** in the schema. This contradicts the existence of `app/(dashboard)/dashboard/crm` folders.

**Relationships**:
*   **Tightly Coupled**: `Quotation` <-> `Order` <-> `Invoice` <-> `Accounting`.
*   **Direct Accounting Links**: `JournalEntryLine` links directly to `Client`, `Supplier`, `User`, `Organization`. This is a robust but rigid accounting integration.

====================================================
4. SERVER ACTIONS & BUSINESS LOGIC
====================================================

Server actions are the primary domain layer.

**Location**: `app/actions/*.ts`

**Key Files**:
*   `quotations.ts`: **MASSIVE FILE** (>1500 lines likely). Handles creation, updates, PDF generation, and accounting hooks.
*   `orders.ts`, `invoices.ts`: Transactional logic for sales cycle.
*   `*-accounting-integration.ts`: Dedicated files for bridging business events to accounting entries (e.g., `quotation-accounting-integration.ts`). *Good separation of concern here.*

**Transactional Safety**:
*   **High**. pervasive use of `prisma.$transaction` ensures data integrity across business and accounting tables.

**Security**:
*   **Manual Checks**: Permission checks are explicitly called inside actions (e.g., `checkPermission`).

====================================================
5. PERMISSION & RBAC STRUCTURE
====================================================

**Definitions**: `types/permissions.ts`
**Enforcement**: `lib/permission-utils.ts`

**Structure**:
*   **Role-Based**: No, it's **Permission-Based**. Users have a `designationTemplateId` (Role) or custom `UserPermission` overrides.
*   **Granularity**: Fine-grained. `module.submodule` -> `operation` (e.g., `items.items` -> `create`).

**Implementation**:
*   **Route Level**: **MISSING**. No `middleware.ts` found to enforce permissions globally.
*   **Page Level**: Permissions are likely checked in `page.tsx` via `checkPermission` utility.
*   **Action Level**: explicit checks in server actions.

**Risk**:
*   Any new page/route forgotten to check `checkPermission` is openly accessible if not protected by middleware.

====================================================
6. EVENT / AUTOMATION INFRASTRUCTURE
====================================================

**Status**: **NO DOMAIN EVENT INFRASTRUCTURE PRESENT**.

*   No internal job queue (Bull/Bee/Redis).
*   No Event Bus (EventEmitter).
*   **Scheduled Tasks**: Relies on **external triggers** calling API endpoints (e.g., `/api/quotations/check-expired`).
*   **Redis**: `io-redis` is a dependency, likely used for caching or session, not job queues.

====================================================
7. CROSS-MODULE DEPENDENCY ANALYSIS
====================================================

**Coupling Report**:

*   **Sales -> Accounting**: **Explicit & Synchronous**. Creating an Invoice *immediately* writes to Journal Entries via `invoices.ts` -> `accounting-integration`.
    *   *Pros*: Immediate consistency.
    *   *Cons*: Performance bottleneck; if accounting fails, invoice fails.
*   **CRM -> Sales**: **broken/missing**. Code for CRM exists but models do not.
*   **UI -> Logic**: UI components imported into Pages, which use Server Actions. Clean separation.

====================================================
8. PERFORMANCE & SCALE RISK ANALYSIS (STRUCTURAL ONLY)
====================================================

1.  **Monolithic Server Actions**: `quotations.ts` and `backup.action.ts` are likely very large. Hard to maintain.
2.  **Synchronous Accounting**: As volume grows, writing to Ledger synchronously with every Order/Invoice will slow down user operations.
3.  **Missing Indexes**:
    *   Schema shows `@@index` on most foreign keys (Good).
    *   JSON fields (`permissions`, `settings`) rely on `Gin` indexes (Good).
4.  **Zombie Code**: The `app/dashboard/crm` folder structure exists but is empty/broken. This confuses developers and maintenance.
5.  **No Background Processing**: Heavy tasks (PDF generation, Backup, Mass Email) appear to run in the main thread/server action request cycle. This will timeout on Vercel/Serverless.

====================================================
9. DATABASE MIGRATION HISTORY
====================================================

**State**: **Drifted / In-Progress**.

*   Recent migrations:
    *   `20260211095536_sync_db_state`: Syncs DB to remove CRM tables.
    *   `20260205...`: Delivery Schedule.
*   **Anomalies**:
    *   Evidence of "reverting" features (CRM removal).
    *   Multiple similar migrations (`add_cost_price...`).

====================================================
10. SUMMARY REPORT
====================================================

**Architecture Type**: **Modular Monolith (Folder-based)** with **Synchronous Integration**.

**Biggest Structural Risk**:
1.  **Missing Middleware**: Lack of global permission enforcement requires perfect discipline in every `page.tsx`.
2.  **Synchronous Heavy Operations**: Accounting writes and PDF generation happen in the user request loop.
3.  **Zombie CRM Module**: Codebase contains shell folders for a feature set that was reverted from the database.

**Scale-Readiness Score**: **4/10**
*   Robust Transactional logic (+3)
*   Good use of Server Actions (+2)
*   No Background Jobs (-3)
*   Synchronous inter-module coupling (-2)

**Final Verdict**: The system is solid for an MVP with low concurrency. For scale, it requires extracting the Accounting writes to an async event bus and implementing a proper background job processor.
