# Complete Application Developer Documentation

## Table of Contents
1. [Technology Stack & Core Infrastructure](#technology-stack--core-infrastructure)
2. [High-Level Modular Architecture](#high-level-modular-architecture)
3. [Application Workflows & Data Flow](#application-workflows--data-flow)
4. [Core Utility Systems](#core-utility-systems)
5. [Deployment & Configuration](#deployment--configuration)

---

## Technology Stack & Core Infrastructure

The application is built on a modern, robust tech stack designed for high performance, scalability, and maintainability.

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: TailwindCSS v4 with components from Shadcn UI & Radix UI primitives.
- **Animations**: Framer Motion for complex micro-interactions.
- **State Management**: Redux Toolkit for complex global state, combined with `redux-persist` for local caching.

### Backend & Database
- **Server**: Next.js Server Actions and Route Handlers API.
- **ORM**: Prisma (v6) for type-safe database interaction.
- **Database**: PostgreSQL 16+.

### Services & Integrations
- **Caching**: Redis (via `ioredis`) for high-speed caching and rate limiting.
- **File Storage**: MinIO for S3-compatible, secure self-hosted file management.
- **Email**: Nodemailer for transactional emails.
- **Authentication**: NextAuth v5 (Auth.js) implementing secure, session-based access.

---

## High-Level Modular Architecture

The application is an integrated ERP (Enterprise Resource Planning) platform divided into distinct, deeply connected modules located under `app/(dashboard)/dashboard/`.

### 1. Master Data (`/master`)
The foundational layer holding definitions used across all other modules.
- **Items, Categories, & Units**: Definitions for products and raw materials.
- **Warehouses**: Storage locations for inventory management.

### 2. Accounts (`/accounts`)
A comprehensive double-entry accounting ledger system.
- Manages **Chart of Accounts (COA)**.
- Tracks all financial movements via **Vouchers** (Receipt, Payment, Journal, Contra, Sales, Purchase).
- Generates real-time financial reports: Trial Balance, Profit & Loss, Balance Sheet, Ledgers.

### 3. Inventory & Production (`/inventory`, `/production`)
- **Inventory**: Tracks stock quantities, manages automated stock ledgers, and handles manual stock adjustments.
- **Production**: Manages Bill of Materials (BOM) and Production Orders, automatically linking raw material consumption and finished good output to inventory and accounting ledgers.

### 4. Sales & Purchases (`/sales`, `/purchases`)
- **Purchasing**: Manages supplier procurement, raising purchase orders, and logging supplier invoices (which auto-generate Accounts Payable).
- **Sales**: Point of Sale (POS) interface, generating sales invoices, managing client billing, and tracking Accounts Receivable.

### 5. People (`/peoples`)
- Consolidates **Employees**, **Users**, **Clients**, and **Suppliers**.
- Deeply integrates with the accounting module (e.g., auto-provisioning employee salary and advance accounts).

---

## Application Workflows & Data Flow

### Next.js Architecture: Client vs. Server
- **Client Components (`"use client"`):** Used exclusively for interactive UI states (e.g., forms using `react-hook-form` + `zod`, dropdowns, modals).
- **Server Actions (`app/_actions`):** The primary mutation method. Client components invoke server actions for CRUD operations, offloading security, validation, and database queries to the server.
- **Server Components:** Used for fetching read-only data directly via Prisma in page layouts and views, preventing large client-side bundles.

### Database Access Pattern
The application uses Prisma extensively. Most complex mutations (like Posting a Voucher or processing a Sale) are wrapped in **Prisma Transactions** (`prisma.$transaction`). This ensures that dependent operations (e.g., deducting stock, generating a journal entry, and updating a ledger) succeed or fail atomically, guaranteeing financial data integrity.

---

## Core Utility Systems

The `lib/` directory houses several critical, standalone utility systems that power the backend.

### 1. Role-Based Permissions Engine (`lib/permissions.ts`)
A dynamic engine that evaluates user roles to selectively display UI elements (via `navigation-builder.ts`) and guard server actions against unauthorized execution.

### 2. Secure Backup System (`lib/backup.ts`)
An automated mechanism that creates full PostgreSQL database dumps.
- **Encryption**: Backups are encrypted at rest using AES-256-CBC (`backup-encryption.ts`).
- **Metadata**: Tracks completion status, file sizes, and restoration logs.

### 3. Accounting & Workflow Integrity (`lib/accounting-settings-validation.ts`)
Validates that incoming financial data matches internal rules before committing to the database. It utilizes `system-vouchers.ts` to automatically format default journal entries triggered by system events (like Sales and Purchases).

### 4. User Audit Logging (`lib/user-log.ts`)
Tracks every critical action performed in the system, attributing it to a specific `UserId` for compliance and troubleshooting.

---

## Deployment & Configuration

### Environment Configuration (`.env`)
The system requires specific environment variables to function:
- **Database**: `DATABASE_URL` connecting to PostgreSQL.
- **NextAuth**: `NEXTAUTH_SECRET` and `NEXTAUTH_URL` for secure session hashing.
- **Redis**: `REDIS_URL` and `REDIS_PASSWORD`.
- **MinIO**: Complete connection string including Access Key, Secret Key, and Bucket Name.
- **Backup Security**: `BACKUP_ENCRYPTION_KEY` (must be a 64-character hex string) and `BACKUP_ENCRYPTION_ENABLED`.

### Initialization
Before initial deployment or after major updates:
1. `npm run build` runs `prisma generate` to build the ORM client.
2. The `scripts/pre-deployment-validation.ts` should be executed to verify database connections, MinIO buckets, and Redis reachability.
3. Prisma Seed scripts (`prisma/seed.ts`) populate the database with default Chart of Accounts, Super Admin users, and Master Data to bootstrap a fresh instance.
