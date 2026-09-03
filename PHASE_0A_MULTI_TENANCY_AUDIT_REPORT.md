# PHASE 0A — MULTI-TENANCY AUDIT & MIGRATION DESIGN REPORT

**Status**: AUDIT COMPLETE (Phase 0A Only)  
**Execution Directives Followed**: Diagnostic Audit Only. No production code modified. No database migrations executed. Phase 0B Implementation paused awaiting review.

---

## Executive Audit Summary

A comprehensive multi-tenancy audit was conducted across the entire database schema (`prisma/schema.prisma`), server actions (`app/actions/`), and route authorization guards.

### Primary Audit Findings:
1. **Critical Tenant Isolation Deficit**: The database contains an `Organization` model (`prisma/schema.prisma:738`), but `organizationId` **ONLY** exists on four models: `Quotation`, `Voucher`, `VoucherLine`, and `JournalEntryLine`.
2. **Unscoped Core Entities**: Core business entities—including `User`, `Employee`, `Lead`, `Client`, `Contact`, `Opportunity`, `Project`, `Task`, `Issue`, `Timesheet`, `Invoice`, `Order`, `Payroll`, and `File`—**completely lack `organizationId` foreign keys**.
3. **Data Leakage Risk**: Multi-tenancy is currently simulated through `createdBy` or `assignedToId` user-level filtering. If a user belongs to an organization, querying `prisma.lead.findMany()` without explicit `createdBy` checks returns records across all tenants in the database.
4. **Dangerous Mutation Patterns**: Server actions update and delete records directly by `id` without checking organization ownership (e.g. `prisma.opportunity.update({ where: { id }, data: { stage } })`).

---

## 1. Master Model Classification & Risk Audit

| Model Name | Current Organization Relationship | Expected Organization Relationship | Risk Level | Backfill Strategy | Affected Unique Constraints | Indexes Required | Server Actions & APIs Affected | Tests Required |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **User** | Unscoped (Global `@unique` email) | `organizationId String?` (Primary Org FK) | **CRITICAL** | Set to Default / Primary Organization ID | `email` (Keep global or composite per tenant) | `@@index([organizationId])` | `lib/auth.ts`, `actions/auth.action.tsx` | User login, session context resolution |
| **Employee** | Linked to User (`userId`) | `organizationId String?` (Org FK) | **HIGH** | Derive from `User.organizationId` | `employeeCode` | `@@index([organizationId])` | `actions/employee.action.tsx` | Employee list, HR payroll scoping |
| **Lead** | User Scoped (`assignedToId`, `ownerId`) | `organizationId String` (Org FK) | **CRITICAL** | Derive from `ownerId` -> User Org | `leadNumber` -> `@@unique([organizationId, leadNumber])` | `@@index([organizationId, status])` | `app/actions/crm/lead.action.ts` | Cross-tenant lead read/edit/delete/convert |
| **Client** | User Scoped (`createdBy`) | `organizationId String` (Org FK) | **CRITICAL** | Derive from `createdBy` -> User Org | `clientCode` -> `@@unique([organizationId, clientCode])` | `@@index([organizationId, status])` | `dashboard/clients/_actions/client.action.tsx` | Cross-tenant client lookup & creation |
| **Contact** | Indirect via Client (`clientId`) | Indirect + Explicit `organizationId` | **HIGH** | Derive from `Client.organizationId` | `email` -> `@@unique([organizationId, email])` | `@@index([organizationId])` | `app/actions/crm/contact.action.ts` | Contact directory tenant isolation |
| **Opportunity**| User Scoped (`assignedToId`) | `organizationId String` (Org FK) | **CRITICAL** | Derive from `Client.organizationId` | `opportunityNumber` -> `@@unique([organizationId, opportunityNumber])` | `@@index([organizationId, stage])` | `app/actions/crm/opportunity.action.ts` | Deal pipeline cross-tenant modification |
| **Quotation** | Scoped (`organizationId String?`) | `organizationId String` (Make Required) | **MEDIUM** | Backfill `NULL` values to default Org | `quotationNumber` -> `@@unique([organizationId, quotationNumber])` | `@@index([organizationId, status])` | `app/actions/quotations.ts` | Quote creation & PDF generation |
| **QuotationItem**| Indirect via Quotation | Indirectly Scoped | **LOW** | N/A (Cascade from Quotation) | None | `@@index([quotationId])` | `app/actions/quotations.ts` | Quote item mutations |
| **Project** | User Scoped (`ownerId`) | `organizationId String` (Org FK) | **CRITICAL** | Derive from `Client.organizationId` | `projectNumber` -> `@@unique([organizationId, projectNumber])` | `@@index([organizationId, status])` | `dashboard/projects/` actions | Cross-tenant project budget & task access |
| **Task** | User Scoped (`userId`, `assigneeId`)| `organizationId String` (Org FK) | **HIGH** | Derive from `Project.organizationId` | None | `@@index([organizationId, status])` | `app/actions/tasks.ts` | Task list & kanban cross-tenant leak |
| **Issue** | Indirect via Milestone -> Project | `organizationId String` (Explicit Org FK)| **HIGH** | Derive from `Project.organizationId` | `issueNumber` -> `@@unique([organizationId, issueNumber])` | `@@index([organizationId, status])` | `dashboard/projects/issues/` | Bug & issue ticket tenant isolation |
| **Timesheet** | Employee Scoped (`employeeId`) | `organizationId String` (Explicit Org FK)| **HIGH** | Derive from `Project.organizationId` | None | `@@index([organizationId, date])` | `app/actions/timesheets.ts` | Cost & hours cross-tenant leak |
| **ChartOfAccount**| Master Record (Global) | `organizationId String?` (Org / Global) | **HIGH** | Set to Default Org for private COAs | `code` -> `@@unique([organizationId, code])` | `@@index([organizationId, type])` | `dashboard/accounts/` actions | Financial statement cross-tenant leak |
| **Voucher** | Scoped (`organizationId String?`) | `organizationId String` (Make Required) | **MEDIUM** | Backfill `NULL` values to default Org | `voucherNumber` -> `@@unique([organizationId, voucherNumber])` | `@@index([organizationId, status])` | `dashboard/accounts/vouchers/` | Voucher posting & ledger isolation |
| **Invoice** | Indirect via Client / Order | `organizationId String` (Org FK) | **CRITICAL** | Derive from `Client.organizationId` | `invoiceNumber` -> `@@unique([organizationId, invoiceNumber])` | `@@index([organizationId, status])` | `app/actions/invoices.ts` | Revenue & billing cross-tenant access |
| **Order** | Indirect via Client | `organizationId String` (Org FK) | **CRITICAL** | Derive from `Client.organizationId` | `orderNumber` -> `@@unique([organizationId, orderNumber])` | `@@index([organizationId, status])` | `app/actions/orders.ts` | Sales order cross-tenant access |
| **Payroll** | User Scoped (`createdBy`) | `organizationId String` (Org FK) | **HIGH** | Derive from `createdBy` -> User Org | `payrollNumber` -> `@@unique([organizationId, payrollNumber])` | `@@index([organizationId])` | `dashboard/hr/payroll/_actions/` | Salary & payroll leak prevention |
| **File** | User Scoped (`ownerId`) | `organizationId String` (Org FK) | **HIGH** | Derive from `ownerId` -> User Org | `storageKey` | `@@index([organizationId])` | `app/actions/files.ts` | Attachment download security |
| **Notification**| User Scoped (`userId`) | Indirectly Scoped via User | **LOW** | N/A (User-level alerts) | None | `@@index([userId, isRead])` | `app/actions/notificationActions.ts` | User notification privacy |
| **settings** | User/Global Scoped | `organization_id String?` (Org Setting) | **MEDIUM** | Set global settings to `NULL` org | `code` -> `@@index([user_id, code])` | `@@index([organization_id, code])` | `dashboard/settings/_actions/` | System configuration isolation |

---

## 2. Codebase Audit of Dangerous Patterns

### Pattern A: `findUnique` / `findFirst` Without Organization Filtering
- **Location**: `app/actions/crm/lead.action.ts:782`
  ```typescript
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });
  ```
  *Vulnerability*: Reads lead by primary key `id` without checking if `lead` belongs to the authenticated user's organization.

- **Location**: `app/actions/crm/opportunity.action.ts:45`
  ```typescript
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  ```
  *Vulnerability*: Opportunity fetch ignores organization boundary.

### Pattern B: Direct `update` / `delete` by `id` Only
- **Location**: `app/actions/crm/opportunity.action.ts:112`
  ```typescript
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { stage },
  });
  ```
  *Vulnerability*: Any authenticated user who knows an `opportunityId` can change its stage, even if the deal belongs to another organization.

- **Location**: `app/actions/crm/contact.action.ts:88`
  ```typescript
  await prisma.contact.delete({
    where: { id: contactId },
  });
  ```
  *Vulnerability*: Direct deletion by ID without verifying parent Client organization.

### Pattern C: Untrusted `organizationId` Accepted From Client Browser
- **Location**: `app/actions/quotations.ts:104`
  ```typescript
  export async function createQuotation(input: {
    organizationId?: string;
    clientId: string;
    ...
  }) {
    // Uses input.organizationId directly if provided by client!
  }
  ```
  *Vulnerability*: Client can inject an arbitrary `organizationId` in the request payload to post quotations under another tenant.

### Pattern D: Admin Bypasses That Ignore Organization Boundaries
- **Location**: `components/permissions/route-guard.tsx:22`
  ```typescript
  if (role?.toLowerCase() === "admin") {
    setAuthorized(true);
    setChecking(false);
    return;
  }
  ```
  *Vulnerability*: An "Admin" of Organization A is treated as a global super-admin on the client side, bypassing all permission checks regardless of tenant scope.

---

## 3. Proposed Staged Migration Sequence (Phase 0B Blueprint)

### Step 1: Default Organization Seed & Migration (Schema Level)
Add `organizationId` as an optional field `String?` first to avoid migration failure on non-empty production tables:
```prisma
// Step 1: Add optional organizationId
model User {
  organizationId String?
  Organization   Organization? @relation(fields: [organizationId], references: [id])
  @@index([organizationId])
}

model Lead {
  organizationId String?
  Organization   Organization? @relation(fields: [organizationId], references: [id])
  @@index([organizationId])
}
// ... apply to Client, Opportunity, Project, Task, Issue, Invoice, Order, Payroll, File
```

### Step 2: Data Backfill Script
Execute a safe, idempotent database backfill script:
1. Ensure a default `Organization` record exists (`code: "ORG-DEFAULT"`).
2. Backfill `User.organizationId` to default org for existing users.
3. Backfill `Client.organizationId` using `createdBy` User's `organizationId`.
4. Backfill `Lead.organizationId` using `ownerId` / `createdBy` User's `organizationId`.
5. Backfill `Opportunity.organizationId` from `Client.organizationId`.
6. Backfill `Project.organizationId` from `Client.organizationId`.
7. Backfill `Task.organizationId`, `Issue.organizationId`, `Invoice.organizationId`, `Order.organizationId` from their respective parent entities.

### Step 3: Schema Hardening (Constraints & Required FKs)
Once backfill is verified 100% non-null:
1. Change `organizationId` from `String?` to `String` (required) on `Lead`, `Client`, `Opportunity`, `Project`, `Task`, `Invoice`, `Order`, `Quotation`, `Voucher`.
2. Update `@unique` constraints to composite unique keys per tenant:
   - `Lead`: `@@unique([organizationId, leadNumber])`
   - `Client`: `@@unique([organizationId, clientCode])`
   - `Opportunity`: `@@unique([organizationId, opportunityNumber])`
   - `Project`: `@@unique([organizationId, projectNumber])`
   - `Quotation`: `@@unique([organizationId, quotationNumber])`
   - `Invoice`: `@@unique([organizationId, invoiceNumber])`
   - `Order`: `@@unique([organizationId, orderNumber])`

### Step 4: Server Action & Session Context Helper Standardization
Create a mandatory server-side session context resolver `getTenantContext()`:
```typescript
// lib/tenant-context.ts
export async function getTenantContext() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, organizationId: true }
  });
  
  if (!user?.organizationId) throw new Error("Tenant Organization Context Missing");
  return { userId: user.id, role: user.role, organizationId: user.organizationId };
}
```

Enforce `organizationId: tenant.organizationId` on all Prisma query `where` clauses across `lead.action.ts`, `opportunity.action.ts`, `client.action.tsx`, `quotations.ts`, `invoices.ts`, `projects/`.

### Step 5: Automated Cross-Tenant Security Test Suite
Implement automated regression tests verifying that User from Organization A attempting to read/update/delete/approve a record belonging to Organization B receives `403 Forbidden` or `Unauthorized`.

---

## Verification & Stop Point

- **Diagnostic Audit Status**: **COMPLETE**.
- **Production Changes**: **0 Lines Modified** (Phase 0A Diagnostic Only).
- **Next Step**: Await user authorization to proceed to **PHASE 0B — MULTI-TENANCY IMPLEMENTATION**.

**STOP.**
