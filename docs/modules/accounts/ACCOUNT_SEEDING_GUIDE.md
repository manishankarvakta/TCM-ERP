# Chart of Accounts Seeding Guide

This guide explains how to seed the Chart of Accounts (COA) / Accounts Head into the database on live/production environments.

---

## 📌 Overview

To prevent data mismatch and ensure a clean environment, we extracted the static Chart of Accounts hierarchy directly from the database, filtered out dynamically generated user-specific/transactional heads, and generated a standalone, production-safe seed script.

- **Seed File Location**: [seed-chart-of-accounts-live.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/seed-chart-of-accounts-live.ts)
- **Scope**: Creates the base 66 static ledger groups and control accounts.

---

## 🗂️ Account Classification & Exclusions

The seed script defines the core structural ledger. It explicitly excludes all **dynamic accounts** because those are managed automatically by the application code when creating master data:

1. **Accounts Receivable (`AR-xxxx`)**: Managed dynamically under `[1410] Accounts Receivable` when new customers are registered.
2. **Accounts Payable (`AP-xxxx`)**: Managed dynamically under `[2110] Accounts Payable` when new suppliers are registered.
3. **Salaries Payable (`SP-xxxx`)**: Managed dynamically under `[2130] Salaries Payable` when new employees are added to the payroll module.

### Seeding Statistics
- **Asset Accounts**: 32
- **Liability Accounts**: 7
- **Equity Accounts**: 4
- **Revenue Accounts**: 6
- **Expense Accounts**: 17
- **Total Static Accounts**: 66

---

## 🚀 Execution Instructions

Follow these steps to run the seeding script on a live application server:

### 1. Prerequisite Checks
Before executing the script, make sure:
- The database is running and accessible.
- Environment variables in `startup-mvp/.env` (specifically `DATABASE_URL`) are pointing to your live database.
- You have at least one **admin** or **active user** in the `User` table of the database. The script needs a user ID to associate with the `createdBy` field on the accounts.

### 2. Run the Seed Script
Navigate to the `startup-mvp` directory in your terminal and run:

```bash
npx tsx prisma/seed-chart-of-accounts-live.ts
```

*Note: If `npx tsx` is not globally installed or fails, make sure node_modules are installed (`npm install`) and prisma client is generated (`npx prisma generate`).*

---

## 🛡️ Safety & Idempotency Design

The seed script is fully **idempotent** and production-safe:

- **Prisma `upsert`**: Each account is processed via Prisma's `upsert` mechanism. If an account with the specified code already exists, the script updates its basic details (name, type, description, control status) without altering its unique database identifier (`id`) or deleting existing transactions.
- **Two-Pass Hierarchy Linking**: 
  - **Pass 1**: All accounts are created/updated with `parentId: null`.
  - **Pass 2**: Parent-child relationships (linking accounts to their headers) are set **only for new accounts** where `parentId` is currently null. This prevents breaking custom modifications to existing hierarchies.
- **No Data Loss**: The script does not delete, wipe, or truncate any tables.

---

## 🔍 Verification

To verify that the Chart of Accounts has been successfully seeded, you can run:

```bash
npx tsx check-coa.ts
```

This will output the total count of accounts in the database along with a brief sample list of retrieved ledger heads.
