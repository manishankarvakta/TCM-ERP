# Ferrari Fashion  ERP - Final Developer Documentation

## 1. Project Overview
Ferrari Fashion  ERP is a comprehensive Enterprise Resource Planning system built for Ferrari Fashion  Biryani House. It manages the entire lifecycle of food production, from raw material procurement to kitchen production and final sales, integrated with a robust double-entry accounting system.

### Key Business Flows:
- **Procurement**: Purchase raw materials from suppliers -> Increase stock -> Create Accounts Payable.
- **Production**: Convert raw materials to finished goods based on BOM (Bill of Materials) -> Deduct RM stock, Increase FG stock -> Journal entries for inventory movement.
- **Sales**: Sell finished goods or retail items -> Deduct stock -> Create Accounts Receivable & Revenue -> Record COGS (Cost of Goods Sold).

---

## 2. Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **File Storage**: Local Persistent Storage (Docker Volumes)
- **Caching/Queue**: Redis
- **Styling**: Tailwind CSS & Shadcn UI
- **Deployment**: Docker & Dokploy

---

## 3. Architecture & Modular Design

The application is organized into several core modules, each with its own set of components, server actions, and database models.

### 3.1 Accounts & Financials
- **Chart of Accounts (COA)**: Standardized accounting codes (e.g., 1620 for Raw Materials, 4110 for Sales Revenue).
- **Vouchers**: Documents recording financial transactions (Payment, Receipt, Journal, Contra, Sales, Purchase).
- **Journal Entries**: The low-level double-entry records generated from vouchers.
- **Reports**: Real-time generation of Trial Balance, Balance Sheet, Profit & Loss, and AR/AP summaries.

### 3.2 Inventory & Warehousing
- **Stock Tracking**: Real-time tracking of items across multiple warehouses.
- **Stock Ledger**: Detailed history of every stock movement (IN, OUT, ADJUSTMENT).
- **Item Management**: Categorization by type (RAW_MATERIAL, READY_PRODUCT, RETAIL).

### 3.3 Production (Manufacturing)
- **BOM (Bill of Materials)**: Recipes defining the raw materials required for each finished good.
- **Production Orders**: Tracking the execution of production in the kitchen, including wastage calculation.

### 3.4 Sales & Purchases
- **Purchase Orders**: Managing procurement from suppliers.
- **Sales Transactions**: Managing customer orders, including POS (Point of Sale) integration.

---

## 4. Permission System (RBAC)

The system uses a highly granular Role-Based Access Control system.

### 4.1 Permission Structure
Permissions are defined in `types/permissions.ts` and seeded via `prisma/seed-permissions.ts`.
- **Permission Templates**: Pre-defined roles (Manager, Accountant, Sales Executive, etc.) with specific access levels.
- **Module Operations**: Specific actions within a module (view, create, edit, approve, move-to-trash, etc.).

### 4.2 Dynamic Navigation
The sidebar navigation is built dynamically based on the user's permissions using the `buildFilteredMenu` utility in `lib/navigation-builder.ts`.

### 4.3 Page Guards
Frontend protection is implemented using the `PageGuard` component:
```tsx
<PageGuard permissionKey="sales.sales" requiredOperation="view">
  <SalesContent />
</PageGuard>
```

---

## 5. Core Data Flows

### 5.1 Purchase Flow
1. **Action**: Purchase order marked as `RECEIVED`.
2. **Inventory**: Stock increases for items; Stock Ledger records `IN`.
3. **Accounting**: Voucher created -> Journal Entry:
   - Debit: Inventory (1620/1630/1640)
   - Credit: Accounts Payable (2110)

### 5.2 Production Flow
1. **Action**: Production Order marked as `COMPLETED`.
2. **Inventory**: 
   - Raw Materials: Stock decreases; Stock Ledger records `OUT`.
   - Ready Products: Stock increases; Stock Ledger records `IN`.
3. **Accounting**: Journal Entry:
   - Debit: Ready Products Inventory (1630)
   - Credit: Raw Material Inventory (1620)

### 5.3 Sales Flow
1. **Action**: Sale marked as `COMPLETED`.
2. **Inventory**: Stock decreases; Stock Ledger records `OUT`.
3. **Accounting**: Journal Entries:
   - **Revenue**: Debit AR (1410), Credit Revenue (4110).
   - **COGS**: Debit COGS (5110), Credit Inventory (1630).

---

## 6. Development & Maintenance

### 6.1 Database Commands
- **Sync Schema**: `npx prisma db push` (Development) or `npx prisma migrate deploy` (Production).
- **Generate Client**: `npx prisma generate`.
- **Seed Data**: `npx tsx prisma/seed.ts` (Master data) and `npx tsx prisma/seed-permissions.ts` (Permissions).

### 6.2 Pre-Deployment Validation
A comprehensive validation script is available at `scripts/pre-deployment-validation.ts`. This script tests the entire Purchase -> Production -> Sale lifecycle programmatically to ensure all accounting and inventory integrations are working correctly.

```bash
npx tsx scripts/pre-deployment-validation.ts
```

Integrated backup system that handles database exports and local file storage synchronization.

---

## 7. Deployment (Docker/Dokploy)

The system is containerized using Docker. The `Dockerfile` and `docker-compose-dokploy.yml` define the production environment.

### Environment Variables:
- `DATABASE_URL`: Connection string for PostgreSQL.
- `NEXTAUTH_SECRET`: Secret for session security.
- `UPLOAD_DIR`: Path for local file storage (e.g., /app/uploads).
- `REDIS_URL`: Connection string for Redis.

---

## 8. Documentation Index
For more detailed information, refer to the specific module docs:
- [Accounts Developer Documentation](ACCOUNTS_DEVELOPER_DOCUMENTATION.md)
- [Production Module Docs](production/README.md)
- [Sales Module Docs](sales/README.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
