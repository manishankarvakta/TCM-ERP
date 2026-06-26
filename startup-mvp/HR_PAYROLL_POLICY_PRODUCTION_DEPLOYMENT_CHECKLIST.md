# HR & Payroll Policy System: Production Deployment Checklist

This document details the verification status, deployment commands, seed validations, and rollback strategies for launching the policy-driven HR & Payroll system (Phases 1–7) into production.

---

## 1. Commands Run during Validation
The following commands were executed to verify codebase integrity, database structures, and mathematical core engines:

```bash
# 1. Rebuild client and verify typecheck for all application routes
npx prisma generate
npm run build

# 2. Run the general ERP business flow pre-validation (Sales, Purchases, Production, Accounting)
npx tsx scripts/pre-deployment-validation.ts

# 3. Compare schema.prisma on disk with remote origin/main baseline schema
npx prisma migrate diff --from-schema-datamodel tmp/schema_base.prisma --to-schema-datamodel prisma/schema.prisma --script > tmp/migration_policies.sql

# 4. Resolve the newly generated migration locally since tables already exist locally
npx prisma migrate resolve --applied 20260626000000_add_hr_payroll_policies

# 5. Run the HR & Payroll verification tests
npx tsx scratch/verify-hr-payroll-policy-system.ts
npx tsx scratch/test-policy-calculation.ts
npx tsx scratch/test-attendance-policy.ts
npx tsx scratch/test-payroll-integration.ts
```

---

## 2. Build & Typecheck Results
- **Prisma Client Generation**: Rebuilt client successfully.
- **Production Next.js Build**: Completed successfully with **zero compilation or type errors** in any client/server route.
- **Static Page Generation**: 35/35 static pages generated successfully.
- **Typecheck Status**: All core application modules compile cleanly. Minor pre-existing warnings are isolated to unedited legacy biometric hardware sync scripts (e.g. `devices/[id]/page.tsx`, redis connectors in `queue.ts`/`worker.ts`), which are unaffected by the HR & Payroll upgrade.
- **Decimal Safety**: Hydration and server-to-client component boundary warnings are completely eliminated. All Decimal structures returned by actions are stringified/mapped recursively using the safe utility `serializeDecimalAndDate` before page render.

---

## 3. Migration Status
- **Issue Discovered**: Development tables created during Phases 1–7 were applied locally using `db push`, meaning no Prisma migration scripts existed for the new tables and altered fields.
- **Resolution**: Generated a clean, safe, and non-destructive migration representing the delta between `origin/main` (legacy baseline) and the current datamodel.
- **Migration Created**: `prisma/migrations/20260626000000_add_hr_payroll_policies/migration.sql`
- **Actions Performed**:
  - Registered the new migration locally using `prisma migrate resolve --applied 20260626000000_add_hr_payroll_policies`.
  - Verified local sync status using `npx prisma migrate status`.
- **Database Status**: **Database schema is up to date!** (4 migrations total).
- **Production Action Required**: Run `npx prisma migrate deploy` on the production server to automatically create the new tables and add the new columns.

---

## 4. Default Seed Verification
- **Seed Script**: `prisma/seed-payroll-defaults.ts`
- **Idempotency**: Checked. The script uses fixed database IDs (e.g. `default-salary-structure`, `default-attendance-policy`) and `upsert` queries. Repeated execution updates existing settings without duplicating policy templates.
- **Default Salary Structure Split**: Confirmed.
  - Basic: **55.00%**
  - House Rent: **26.00%**
  - Medical: **5.00%**
  - Transport: **4.00%**
  - Food: **10.00%**
  - Total: **100.00%** (mathematically blocked from saving if total is not 100).

---

## 5. Test Suite Verification Results
All policy calculations, attendance processing, and payroll integrations are fully operational:
- **`scratch/test-policy-calculation.ts`**: **100% PASS**. Confirmed overtime rates, overnight shifts, tiffin eligibility thresholds, and conversion day lates.
- **`scratch/test-attendance-policy.ts`**: **100% PASS**. Confirmed daily attendance calculation updates (`calculatedOvertimeAmount`, `nightBillAmount`, `holidayBillAmount`, etc.).
- **`scratch/test-payroll-integration.ts`**: **100% PASS**. Confirmed monthly aggregation divisor fallbacks (divisor 30 vs. 40) and net pay calculations.
- **`scratch/verify-hr-payroll-policy-system.ts`**: **100% PASS**. Checked database constraints, active totals, valid mapping foreign keys, and positive rates.
- **`scripts/pre-deployment-validation.ts`**: **100% PASS**. Checked that Sales, Purchases, Production, Stock Ledgers, and double-entry COA ledger posts are 100% intact.

---

## 6. UI Routes Verification
All pages have been compiled and verified:
- `[x] Mappings & Policy Forms`: `/dashboard/settings?section=payroll`
- `[x] Daily Attendance Audit`: `/dashboard/hr/attendance`
- `[x] Monthly Aggregations Dashboard`: `/dashboard/hr/payroll`
- `[x] 14-Column Ledger Run Details`: `/dashboard/hr/payroll/[id]`
- `[x] Printable Detailed Section Payslip`: `/dashboard/hr/payroll/[id]/payslips/[itemId]`
- `[x] 26-Field CSV Exporter Route`: `/dashboard/hr/payroll/[id]/export`

---

## 7. Accounting & Ledger Verification
Double-entry accounting balances perfectly:
- **Accrual Post Validation**: Debit Salary Expense equals sum of Credit Net Salary Payable + Credit Loan Repayment + Credit Tax + Credit PF + Credit Festival Bonus.
- **Disbursement Post Validation**: Debit Net Salary Payable matches Credit Cash/Bank Asset Account.
- **Voucher Balance**: All voucher lines post with **Total Debits = Total Credits** (tested and verified with Check 7 of the verification script).
- **Immutability Safeguard**: Reprocessing attendance skips locked days, and approved, posted, or paid payroll documents cannot be modified or re-generated.

---

## 8. Backup Instructions (Pre-Deployment)
Perform a full database backup before running migrations:

```bash
# 1. Identify the container name if running inside Docker:
docker ps

# 2. Export the database dump:
pg_dump -h localhost -U postgres -d startup_mvp -F c -b -v -f /tmp/pre_deploy_payroll_backup.dump

# 3. Copy the dump out of the docker environment (if applicable):
docker cp <container_id>:/tmp/pre_deploy_payroll_backup.dump ./backups/
```

---

## 9. Rollback Plan
If database migrations fail or production errors occur post-migration:

### Step 1: Restore Database to Pre-Deployment State
```bash
# 1. Terminate active database connections
pg_restore -h localhost -U postgres -d postgres --clean --create /tmp/pre_deploy_payroll_backup.dump
```

### Step 2: Revert Code to Base Commit
```bash
# 1. Rollback code to origin/main commit
git reset --hard b69d7eb

# 2. Re-generate Prisma Client
npx prisma generate

# 3. Rebuild application
npm run build
```

---

## 10. Final Production Readiness Verdict
### **VERDICT: GO**
The system is fully prepared for production deployment. The migration script has been safely created and registered, all integration engines pass with 100% success, and the core ERP ledger balancing rules have been validated. 
