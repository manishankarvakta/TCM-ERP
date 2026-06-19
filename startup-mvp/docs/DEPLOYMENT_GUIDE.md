# Deployment Guide

This guide details the steps and assumptions for deploying the Ferrari Fashion  ERP system.

## 1. Database Synchronization

The system uses Prisma for database management. Before starting the application in production, migrations must be applied.

### Deployment Commands
```bash
# Apply pending migrations
npx prisma migrate deploy

# Seed/Update permissions and templates
npx tsx prisma/seed-permissions.ts
```

*Note: The `docker/entrypoint.sh` script automatically runs `prisma migrate deploy` on startup.*

## 2. Environment Variables

Ensure the following environment variables are correctly set in your deployment environment (e.g., Dokploy):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Secret for session encryption |
| `NEXTAUTH_URL` | Base URL of the application |
| `UPLOAD_DIR` | Path for file uploads (e.g., /app/uploads) |

## 3. Core Accounting Assumptions

The system relies on specific Chart of Account (COA) codes for automated integration. These accounts must exist and be active:

| Code | Account Name | Usage |
|------|--------------|-------|
| `1620` | Raw Material Inventory | Purchases and Production input |
| `1630` | Ready Products Inventory | Production output and Sales COGS |
| `1640` | Retail Inventory | Direct retail sales |
| `1410` | Accounts Receivable | Sales revenue tracking |
| `2110` | Accounts Payable | Supplier balances tracking |
| `4110` | Sales Revenue | Income from sales |
| `5110` | Cost of Goods Sold | Expense recognition during sales |

## 4. Operational Flows

### Purchase Flow
1. Create a Purchase order.
2. Mark as `RECEIVED`.
3. System automatically:
   - Increments Stock.
   - Records Stock Ledger (Type: `IN`, Ref: `PURCHASE`).
   - Creates a posted Journal Entry (Debit: Inventory, Credit: Accounts Payable).

### Production Flow
1. Create a BOM (Bill of Materials) for a Ready Product.
2. Create a Production Order and mark as `COMPLETED`.
3. System automatically:
   - Decrements Raw Material Stock.
   - Increments Ready Product Stock.
   - Records Stock Ledgers (Type: `OUT` for RM, `IN` for FG).
   - Creates a posted Journal Entry (Debit: FG Inventory, Credit: RM Inventory).

### Sales Flow
1. Create a Sale and mark as `COMPLETED`.
2. System automatically:
   - Decrements Stock.
   - Records Stock Ledger (Type: `OUT`, Ref: `SALE`).
   - Creates a posted Journal Entry (Debit: AR, Credit: Sales Revenue).
   - Records COGS Entry (Debit: COGS, Credit: Inventory).

## 5. Pre-Deployment Validation

A validation script is provided to verify these flows end-to-end:
```bash
npx tsx scripts/pre-deployment-validation.ts
```
This script should be run after migrations and seeding to ensure the environment is correctly configured.
