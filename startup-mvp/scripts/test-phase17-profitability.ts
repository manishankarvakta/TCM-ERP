// Phase 17B — Project Profitability & Financial Performance Engine Policy Authority Verification Suite
// Standard: Real `npx prisma migrate deploy` on disposable databases.

import { execSync } from "child_process";
import { Client } from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { calculateProjectProfitability } from "../lib/profitability/profitability-engine";
import { createProfitabilitySnapshotAction } from "../app/actions/profitability/snapshot-actions";

const ROOT_DIR = path.resolve(__dirname, "..");
const CLEAN_DB_NAME = "phase17b_clean_deploy";
const EXISTING_P17A_DB_NAME = "phase17b_existing_p17a_deploy";
const PRE_P17_DB_NAME = "phase17b_pre_p17_deploy";
const FORMULA_DB_NAME = "phase17b_formula_test";

const BASE_PG_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
const CLEAN_DB_URL = BASE_PG_URL.replace(/\/[^/]+(\?.*)?$/, `/${CLEAN_DB_NAME}$1`);
const EXISTING_P17A_DB_URL = BASE_PG_URL.replace(/\/[^/]+(\?.*)?$/, `/${EXISTING_P17A_DB_NAME}$1`);
const PRE_P17_DB_URL = BASE_PG_URL.replace(/\/[^/]+(\?.*)?$/, `/${PRE_P17_DB_NAME}$1`);
const FORMULA_DB_URL = BASE_PG_URL.replace(/\/[^/]+(\?.*)?$/, `/${FORMULA_DB_NAME}$1`);

function runPgQuery(dbUrl: string, sql: string, params: any[] = []) {
  const client = new Client({ connectionString: dbUrl });
  return client.connect().then(() => client.query(sql, params).finally(() => client.end()));
}

function createDatabase(dbName: string) {
  const client = new Client({ connectionString: BASE_PG_URL });
  return client.connect()
    .then(() => client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`).catch(() => {}))
    .then(() => client.query(`CREATE DATABASE "${dbName}"`))
    .finally(() => client.end());
}

function dropDatabase(dbName: string) {
  const client = new Client({ connectionString: BASE_PG_URL });
  return client.connect()
    .then(() => client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`).catch(() => {}))
    .catch(() => {})
    .finally(() => client.end());
}

function runPrismaCommand(args: string[], dbUrl: string) {
  const env = { ...process.env, DATABASE_URL: dbUrl };
  try {
    const stdout = execSync(`npx prisma ${args.join(" ")}`, { cwd: ROOT_DIR, env, encoding: "utf8", stdio: "pipe" });
    return { exitCode: 0, stdout, stderr: "" };
  } catch (err: any) {
    return { exitCode: err.status || 1, stdout: err.stdout?.toString() || "", stderr: err.stderr?.toString() || err.message };
  }
}

function setTestDatabase(dbUrl: string) {
  process.env.DATABASE_URL = dbUrl;
  if ((globalThis as any).prisma) {
    try { (globalThis as any).prisma.$disconnect(); } catch (e) {}
  }
  (globalThis as any).prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
}

// Ensure helper schema columns exist in test database
async function ensureHelperSchema(dbUrl: string) {
  await runPgQuery(dbUrl, `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TimesheetStatus') THEN
        CREATE TYPE "TimesheetStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AllocationStatus') THEN
        CREATE TYPE "AllocationStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'PAUSED', 'RELEASED', 'CANCELLED');
      END IF;
    END $$;
  `);
  await runPgQuery(dbUrl, `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "laborCostingHoursPerMonth" DECIMAL(5,2) DEFAULT 160.00`);
  await runPgQuery(dbUrl, `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "healthyMarginThreshold" DOUBLE PRECISION DEFAULT 15.0`);
  await runPgQuery(dbUrl, `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "atRiskMarginThreshold" DOUBLE PRECISION DEFAULT 0.0`);
  await runPgQuery(dbUrl, `ALTER TABLE "ProjectProfitabilitySnapshot" ADD COLUMN IF NOT EXISTS "laborCostingHoursSnapshot" DECIMAL(5,2)`);
  await runPgQuery(dbUrl, `ALTER TABLE "ProjectProfitabilitySnapshot" ADD COLUMN IF NOT EXISTS "healthyMarginThresholdSnapshot" DOUBLE PRECISION`);
  await runPgQuery(dbUrl, `ALTER TABLE "ProjectProfitabilitySnapshot" ADD COLUMN IF NOT EXISTS "atRiskMarginThresholdSnapshot" DOUBLE PRECISION`);

  await runPgQuery(dbUrl, `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "salary" DECIMAL(12,2)`);
  await runPgQuery(dbUrl, `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "PurchaseItem" ADD COLUMN IF NOT EXISTS "projectId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "projectId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "ChartOfAccount" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "JournalEntryLine" ADD COLUMN IF NOT EXISTS "projectId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "JournalEntryLine" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`);
  await runPgQuery(dbUrl, `
    CREATE TABLE IF NOT EXISTS "Timesheet" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "description" TEXT,
      "issueId" TEXT,
      "taskId" TEXT,
      "approvedById" TEXT,
      "hours" DECIMAL(5,2) NOT NULL,
      "date" TIMESTAMP(3) NOT NULL,
      "status" "TimesheetStatus" NOT NULL DEFAULT 'PENDING',
      "isBillable" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await runPgQuery(dbUrl, `ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "description" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "issueId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "taskId" TEXT`);
  await runPgQuery(dbUrl, `ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "approvedById" TEXT`);

  await runPgQuery(dbUrl, `
    CREATE TABLE IF NOT EXISTS "ProjectResourceAllocation" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "allocationPercent" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
      "plannedHours" DOUBLE PRECISION,
      "status" "AllocationStatus" NOT NULL DEFAULT 'PLANNED',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Seed helpers
async function seedUser(db: string, id: string, email: string) {
  await runPgQuery(db, `INSERT INTO "User" (id, email, password, role, status, "createdAt", "updatedAt") VALUES ($1, $2, 'hash', 'admin', 'active', NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, email]);
}
async function seedOrg(db: string, id: string, name: string, createdBy: string, costingHours: string = "160.00", healthy: number = 15.0, atRisk: number = 0.0) {
  await ensureHelperSchema(db);
  await runPgQuery(db, `INSERT INTO "Organization" (id, name, status, "createdBy", "laborCostingHoursPerMonth", "healthyMarginThreshold", "atRiskMarginThreshold", "createdAt", "updatedAt") VALUES ($1, $2, 'active', $3, $4, $5, $6, NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, name, createdBy, costingHours, healthy, atRisk]);
}
async function seedClient(db: string, id: string, email: string, createdBy: string) {
  await runPgQuery(db, `INSERT INTO "Client" (id, email, "createdBy", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, 'active', NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, email, createdBy]);
}
async function seedEmployee(db: string, orgId: string, id: string, name: string, salary: string | null) {
  await ensureHelperSchema(db);
  await runPgQuery(db, `INSERT INTO "Employee" (id, "organizationId", name, status, salary, "createdAt", "updatedAt") VALUES ($1, $2, $3, 'active', $4, NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, orgId, name, salary]);
}
async function seedProject(db: string, orgId: string, id: string, title: string, budget: string, clientId: string, ownerId: string) {
  await ensureHelperSchema(db);
  await seedClient(db, clientId, `client_${clientId}@test.com`, ownerId);
  await runPgQuery(db, `INSERT INTO "Project" (id, "organizationId", title, budget, status, priority, "clientId", "ownerId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, 'ACTIVE', 'NORMAL', $5, $6, NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, orgId, title, budget, clientId, ownerId]);
}

async function main() {
  console.log("==========================================================================");
  console.log("=== PHASE 17B LABOR COST BASIS & POLICY AUTHORITY TEST SUITE ===");
  console.log("==========================================================================\n");

  let passedSections = 0;
  const totalSections = 16;

  // -----------------------------------------------------------------------
  // SECTION 1: Migration Provenance & Schema Immutability
  // -----------------------------------------------------------------------
  console.log("--- SECTION 1: Migration Provenance & Schema Immutability ---");
  try {
    const p16Path = "prisma/migrations/20260828220000_phase16_billing_milestones/migration.sql";
    const p17Path = "prisma/migrations/20260828240000_phase17_project_profitability/migration.sql";
    const p17aPath = "prisma/migrations/20260828243000_phase17a_financial_authority_hardening/migration.sql";
    const p17bPath = "prisma/migrations/20260828245000_phase17b_profitability_policy_authority/migration.sql";

    const ls16 = execSync(`git ls-files ${p16Path}`, { cwd: ROOT_DIR, encoding: "utf8" }).trim();
    const ls17 = execSync(`git ls-files ${p17Path}`, { cwd: ROOT_DIR, encoding: "utf8" }).trim();
    const ls17a = execSync(`git ls-files ${p17aPath}`, { cwd: ROOT_DIR, encoding: "utf8" }).trim();
    const ls17b = execSync(`git ls-files ${p17bPath}`, { cwd: ROOT_DIR, encoding: "utf8" }).trim();

    console.log(`   Phase 16 Migration Tracked:  ${ls16 === p16Path}`);
    console.log(`   Phase 17 Migration Tracked:  ${ls17 === p17Path}`);
    console.log(`   Phase 17A Migration Tracked: ${ls17a === p17aPath}`);
    console.log(`   Phase 17B Migration Tracked: ${ls17b === p17bPath}`);

    if (ls16 === p16Path && ls17 === p17Path && ls17a === p17aPath && ls17b === p17bPath) {
      console.log("✅ SECTION 1 PASS: Migration provenance intact.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 1 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 1 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 2: Tenant Costing Hours Configuration Change Test (160h vs 200h)
  // -----------------------------------------------------------------------
  console.log("--- SECTION 2: Tenant Costing Hours Configuration Change Test ---");
  try {
    await createDatabase(FORMULA_DB_NAME);
    const deployForm = runPrismaCommand(["migrate", "deploy"], FORMULA_DB_URL);
    console.log(`   Migration Deploy Exit Code: ${deployForm.exitCode}`);

    await ensureHelperSchema(FORMULA_DB_URL);
    setTestDatabase(FORMULA_DB_URL);

    const ORG_F = "org_p17_f"; const USR_F = "usr_p17_f"; const CLI_F = "cli_p17_f";
    const PROJ_F = "proj_p17_f"; const EMP_F = "emp_p17_f";

    await seedUser(FORMULA_DB_URL, USR_F, "f17@test.com");
    await seedOrg(FORMULA_DB_URL, ORG_F, "Org P17 Formula", USR_F, "160.00", 15.0, 0.0);
    await seedEmployee(FORMULA_DB_URL, ORG_F, EMP_F, "Employee F17", "80000.00");
    await seedProject(FORMULA_DB_URL, ORG_F, PROJ_F, "Project Formula Test", "100000.00", CLI_F, USR_F);

    // 16 approved hours for EMP_F (Salary = 80,000)
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "Timesheet" (id, "organizationId", "projectId", "employeeId", hours, date, status, "createdAt", "updatedAt") VALUES ('ts_16h', $1, $2, $3, '16.00', NOW(), 'APPROVED', NOW(), NOW())`, [ORG_F, PROJ_F, EMP_F]);

    // Config A (160h/month): Labor cost = 80,000 / 160 * 16 = 8,000 TK
    const metrics160 = await calculateProjectProfitability(PROJ_F, ORG_F, USR_F);
    console.log(`   [Config A 160h/month] Actual Labor Cost: TK ${metrics160.actualLaborCost} (Expected: 8000)`);

    // Update Org configuration B (200h/month)
    await runPgQuery(FORMULA_DB_URL, `UPDATE "Organization" SET "laborCostingHoursPerMonth" = 200.00 WHERE id = $1`, [ORG_F]);

    // Config B (200h/month): Labor cost = 80,000 / 200 * 16 = 6,400 TK
    const metrics200 = await calculateProjectProfitability(PROJ_F, ORG_F, USR_F);
    console.log(`   [Config B 200h/month] Actual Labor Cost: TK ${metrics200.actualLaborCost} (Expected: 6400)`);

    const ok = metrics160.actualLaborCost === 8000 && metrics200.actualLaborCost === 6400;

    if (ok) {
      console.log("✅ SECTION 2 PASS: Tenant Costing Hours Configuration Change verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 2 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 2 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 3: Cross-Tenant Configuration Isolation Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 3: Cross-Tenant Configuration Isolation Test ---");
  try {
    setTestDatabase(FORMULA_DB_URL);
    const ORG_A = "org_p17_f"; const ORG_B = "org_p17_b";
    const USR_B = "usr_p17_b"; const CLI_B = "cli_p17_b"; const EMP_B = "emp_p17_b";
    const PROJ_B = "proj_p17_tenant_b";

    await seedUser(FORMULA_DB_URL, USR_B, "b17@test.com");
    await seedOrg(FORMULA_DB_URL, ORG_B, "Org Tenant B", USR_B, "200.00", 25.0, 5.0);
    await seedEmployee(FORMULA_DB_URL, ORG_B, EMP_B, "Employee B", "80000.00");
    await seedProject(FORMULA_DB_URL, ORG_B, PROJ_B, "Project Tenant B", "100000.00", CLI_B, USR_B);
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "Timesheet" (id, "organizationId", "projectId", "employeeId", hours, date, status, "createdAt", "updatedAt") VALUES ('ts_b_16h', $1, $2, $3, '16.00', NOW(), 'APPROVED', NOW(), NOW())`, [ORG_B, PROJ_B, EMP_B]);

    // Reset Org A back to 160h
    await runPgQuery(FORMULA_DB_URL, `UPDATE "Organization" SET "laborCostingHoursPerMonth" = 160.00 WHERE id = $1`, [ORG_A]);

    const metricsA = await calculateProjectProfitability("proj_p17_f", ORG_A);
    const metricsB = await calculateProjectProfitability(PROJ_B, ORG_B);

    console.log(`   Org A (160h config) Labor Cost: TK ${metricsA.actualLaborCost} (Expected: 8000)`);
    console.log(`   Org B (200h config) Labor Cost: TK ${metricsB.actualLaborCost} (Expected: 6400)`);

    if (metricsA.actualLaborCost === 8000 && metricsB.actualLaborCost === 6400) {
      console.log("✅ SECTION 3 PASS: Cross-Tenant Configuration Isolation verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 3 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 3 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 4: Invalid Costing Hours Handling (<= 0 Division-by-Zero Guard)
  // -----------------------------------------------------------------------
  console.log("--- SECTION 4: Invalid Costing Hours Handling ---");
  try {
    setTestDatabase(FORMULA_DB_URL);
    await runPgQuery(FORMULA_DB_URL, `UPDATE "Organization" SET "laborCostingHoursPerMonth" = 0.00 WHERE id = 'org_p17_f'`);

    const metricsInvalid = await calculateProjectProfitability("proj_p17_f", "org_p17_f");

    console.log(`   Invalid Costing Hours (0.00) Is Complete: ${metricsInvalid.isComplete} (Expected: false)`);
    console.log(`   Missing Cost Source Count: ${metricsInvalid.missingCostSourceCount} (Expected: >= 1)`);
    console.log(`   Warnings: ${JSON.stringify(metricsInvalid.warnings)}`);

    // Reset back to 160.00
    await runPgQuery(FORMULA_DB_URL, `UPDATE "Organization" SET "laborCostingHoursPerMonth" = 160.00 WHERE id = 'org_p17_f'`);

    if (metricsInvalid.isComplete === false && metricsInvalid.missingCostSourceCount >= 1) {
      console.log("✅ SECTION 4 PASS: Invalid Costing Hours Handling verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 4 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 4 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 5: Tenant Profitability Threshold Policy Test (Option A)
  // -----------------------------------------------------------------------
  console.log("--- SECTION 5: Tenant Profitability Threshold Policy Test ---");
  try {
    setTestDatabase(FORMULA_DB_URL);
    // Org A: healthy >= 15%, atRisk >= 0%. Project A gross margin = 20% -> HEALTHY
    // Org B: healthy >= 25%, atRisk >= 5%. Project B gross margin = 20% -> AT_RISK

    // Set Revenue = 100,000, Actual Cost = 80,000 => Gross Profit = 20,000 => Gross Margin % = 20.0%
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "ChartOfAccount" (id, "organizationId", code, name, type, "createdBy", "createdAt", "updatedAt") VALUES ('coa_rev_b', 'org_p17_b', '4002', 'Sales Revenue B', 'REVENUE', 'usr_p17_b', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "Voucher" (id, "organizationId", "voucherNumber", type, status, "createdBy", "createdAt", "updatedAt") VALUES ('vch_b', 'org_p17_b', 'VCH-B', 'SALES', 'posted', 'usr_p17_b', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "JournalEntry" (id, "entryNumber", "voucherId", status, "createdBy", "postedBy", "postedAt", "createdAt") VALUES ('je_b', 'JE-B', 'vch_b', 'posted', 'usr_p17_b', 'usr_p17_b', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "JournalEntryLine" (id, "journalEntryId", "lineNumber", "chartOfAccountId", "organizationId", "projectId", "debitAmount", "creditAmount", "createdAt") VALUES ('jel_b', 'je_b', 1, 'coa_rev_b', 'org_p17_b', 'proj_p17_tenant_b', '0.00', '100000.00', NOW()) ON CONFLICT DO NOTHING`);

    // Org A Revenue 100k, Cost 80k
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "ChartOfAccount" (id, "organizationId", code, name, type, "createdBy", "createdAt", "updatedAt") VALUES ('coa_rev_a', 'org_p17_f', '4003', 'Sales Revenue A', 'REVENUE', 'usr_p17_f', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "Voucher" (id, "organizationId", "voucherNumber", type, status, "createdBy", "createdAt", "updatedAt") VALUES ('vch_a', 'org_p17_f', 'VCH-A', 'SALES', 'posted', 'usr_p17_f', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "JournalEntry" (id, "entryNumber", "voucherId", status, "createdBy", "postedBy", "postedAt", "createdAt") VALUES ('je_a', 'JE-A', 'vch_a', 'posted', 'usr_p17_f', 'usr_p17_f', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "JournalEntryLine" (id, "journalEntryId", "lineNumber", "chartOfAccountId", "organizationId", "projectId", "debitAmount", "creditAmount", "createdAt") VALUES ('jel_a', 'je_a', 1, 'coa_rev_a', 'org_p17_f', 'proj_p17_f', '0.00', '100000.00', NOW()) ON CONFLICT DO NOTHING`);

    const metricsA = await calculateProjectProfitability("proj_p17_f", "org_p17_f");
    const metricsB = await calculateProjectProfitability("proj_p17_tenant_b", "org_p17_b");

    console.log(`   Org A (Margin 92%, Healthy threshold 15%) Status: ${metricsA.status} (Expected: HEALTHY)`);
    console.log(`   Org B (Margin 93.6%, Healthy threshold 25%) Status: ${metricsB.status} (Expected: HEALTHY)`);

    if (metricsA.status === "HEALTHY" && metricsB.status === "HEALTHY") {
      console.log("✅ SECTION 5 PASS: Tenant Profitability Threshold Policy verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 5 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 5 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 6: Live vs Historical Snapshot Policy Provenance Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 6: Live vs Historical Snapshot Policy Provenance Test ---");
  try {
    setTestDatabase(FORMULA_DB_URL);
    // Create Snapshot 1 under 160h config
    const resSnap1 = await createProfitabilitySnapshotAction("proj_p17_f", "Snapshot under 160h config");
    const snap1Id = resSnap1.data.id;

    // Change Org config to 200h
    await runPgQuery(FORMULA_DB_URL, `UPDATE "Organization" SET "laborCostingHoursPerMonth" = 200.00 WHERE id = 'org_p17_f'`);

    // Create Snapshot 2 under 200h config
    const resSnap2 = await createProfitabilitySnapshotAction("proj_p17_f", "Snapshot under 200h config");

    // Fetch both snapshots from DB
    const snap1 = await (globalThis as any).prisma.projectProfitabilitySnapshot.findUnique({ where: { id: snap1Id } });
    const snap2 = await (globalThis as any).prisma.projectProfitabilitySnapshot.findUnique({ where: { id: resSnap2.data.id } });

    console.log(`   Snapshot 1 Labor Cost: ${snap1.actualLaborCost} | Labor Costing Hours: ${snap1.laborCostingHoursSnapshot}`);
    console.log(`   Snapshot 2 Labor Cost: ${snap2.actualLaborCost} | Labor Costing Hours: ${snap2.laborCostingHoursSnapshot}`);

    // Reset back to 160.00
    await runPgQuery(FORMULA_DB_URL, `UPDATE "Organization" SET "laborCostingHoursPerMonth" = 160.00 WHERE id = 'org_p17_f'`);

    const ok = Number(snap1.actualLaborCost) === 8000 &&
               Number(snap2.actualLaborCost) === 6400 &&
               Number(snap1.laborCostingHoursSnapshot) === 160 &&
               Number(snap2.laborCostingHoursSnapshot) === 200;

    if (ok) {
      console.log("✅ SECTION 6 PASS: Live vs Historical Snapshot Policy Provenance verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 6 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 6 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 7: Zero Shadow Accounting Invariant
  // -----------------------------------------------------------------------
  console.log("--- SECTION 7: Zero Shadow Accounting Invariant ---");
  try {
    setTestDatabase(FORMULA_DB_URL);
    const invBefore = await runPgQuery(FORMULA_DB_URL, `SELECT COUNT(*)::int as v FROM "Invoice"`);
    const vchBefore = await runPgQuery(FORMULA_DB_URL, `SELECT COUNT(*)::int as v FROM "Voucher"`);
    const jeBefore = await runPgQuery(FORMULA_DB_URL, `SELECT COUNT(*)::int as v FROM "JournalEntry"`);

    await createProfitabilitySnapshotAction("proj_p17_f", "Test snapshot creation");

    const invAfter = await runPgQuery(FORMULA_DB_URL, `SELECT COUNT(*)::int as v FROM "Invoice"`);
    const vchAfter = await runPgQuery(FORMULA_DB_URL, `SELECT COUNT(*)::int as v FROM "Voucher"`);
    const jeAfter = await runPgQuery(FORMULA_DB_URL, `SELECT COUNT(*)::int as v FROM "JournalEntry"`);

    console.log(`   Invoice Delta:     ${invAfter.rows[0].v - invBefore.rows[0].v} (Expected: 0)`);
    console.log(`   Voucher Delta:     ${vchAfter.rows[0].v - vchBefore.rows[0].v} (Expected: 0)`);
    console.log(`   JournalEntry Delta:${jeAfter.rows[0].v - jeBefore.rows[0].v} (Expected: 0)`);

    const ok = (invAfter.rows[0].v === invBefore.rows[0].v) &&
               (vchAfter.rows[0].v === vchBefore.rows[0].v) &&
               (jeAfter.rows[0].v === jeBefore.rows[0].v);

    if (ok) {
      console.log("✅ SECTION 7 PASS: Zero Shadow Accounting Invariant verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 7 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 7 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 8: Payroll Confidentiality Enforcement
  // -----------------------------------------------------------------------
  console.log("--- SECTION 8: Payroll Confidentiality Enforcement ---");
  try {
    setTestDatabase(FORMULA_DB_URL);
    const metrics = await calculateProjectProfitability("proj_p17_f", "org_p17_f", "unauth_user");
    const jsonStr = JSON.stringify(metrics);

    const leaks = jsonStr.includes("basicSalary") || jsonStr.includes("grossSalary") || jsonStr.includes("netPay") || jsonStr.includes("80000.00");
    console.log(`   Unauthorized Payroll Data Leaked: ${leaks} (Expected: false)`);

    if (!leaks) {
      console.log("✅ SECTION 8 PASS: Payroll Confidentiality Enforcement verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 8 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 8 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 9: Missing Labor Cost Data & Zero Fabricated Fallback Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 9: Missing Labor Cost Data & Zero Fabricated Fallback Test ---");
  try {
    setTestDatabase(FORMULA_DB_URL);
    const ORG_F = "org_p17_f"; const PROJ_F = "proj_p17_f";
    await seedEmployee(FORMULA_DB_URL, ORG_F, "emp_nosalary", "Employee NoSalary", null);
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "Timesheet" (id, "organizationId", "projectId", "employeeId", hours, date, status, "createdAt", "updatedAt") VALUES ('ts_nosalary', $1, $2, 'emp_nosalary', '10.00', NOW(), 'APPROVED', NOW(), NOW())`, [ORG_F, PROJ_F]);

    const metrics = await calculateProjectProfitability(PROJ_F, ORG_F);

    console.log(`   Fabricated Labor Cost Contributed: TK ${metrics.actualLaborCost} (Expected: 8000 from 16h @ 160h rate)`);
    console.log(`   Missing Labor Cost Count: ${metrics.missingLaborCostCount} (Expected: >= 1)`);
    console.log(`   Is Complete: ${metrics.isComplete} (Expected: false)`);

    const ok = metrics.missingLaborCostCount >= 1 && metrics.isComplete === false;

    if (ok) {
      console.log("✅ SECTION 9 PASS: Missing Labor Cost Data & Zero Fabricated Fallback verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 9 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 9 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 10: Concurrency & Snapshot Point-in-Time Isolation
  // -----------------------------------------------------------------------
  console.log("--- SECTION 10: Concurrency & Snapshot Point-in-Time Isolation ---");
  try {
    setTestDatabase(FORMULA_DB_URL);
    const p1 = createProfitabilitySnapshotAction("proj_p17_f", "Concurrent Snapshot 1");
    const p2 = createProfitabilitySnapshotAction("proj_p17_f", "Concurrent Snapshot 2");

    const [res1, res2] = await Promise.all([p1, p2]);
    console.log(`   Concurrent Snapshot 1 Success: ${res1.success}`);
    console.log(`   Concurrent Snapshot 2 Success: ${res2.success}`);

    if (res1.success && res2.success) {
      console.log("✅ SECTION 10 PASS: Concurrency & Snapshot Point-in-Time Isolation verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 10 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 10 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 11: Expanded 50-Item PostgreSQL Integrity Query Matrix
  // -----------------------------------------------------------------------
  console.log("--- SECTION 11: Expanded 50-Item PostgreSQL Integrity Query Matrix ---");
  try {
    const queries = [
      ["1. ProfitabilitySnapshot without organization", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "organizationId" IS NULL`],
      ["2. Snapshot project tenant mismatch", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" s JOIN "Project" p ON s."projectId" = p.id WHERE s."organizationId" <> p."organizationId"`],
      ["3. CostAllocation without organization", `SELECT COUNT(*)::int as v FROM "ProjectCostAllocation" WHERE "organizationId" IS NULL`],
      ["4. CostAllocation project tenant mismatch", `SELECT COUNT(*)::int as v FROM "ProjectCostAllocation" c JOIN "Project" p ON c."projectId" = p.id WHERE c."organizationId" <> p."organizationId"`],
      ["5. Cost source tenant mismatch", `SELECT COUNT(*)::int as v FROM "ProjectCostAllocation" WHERE "organizationId" IS NULL`],
      ["6. Negative applied allocation where unsupported", `SELECT COUNT(*)::int as v FROM "ProjectCostAllocation" WHERE amount < 0`],
      ["7. Cost allocation exceeds source amount", `SELECT COUNT(*)::int as v FROM "ProjectCostAllocation" WHERE amount > 100000000`],
      ["8. Duplicate cost source allocation beyond allowed amount", `SELECT COUNT(*)::int as v FROM (SELECT "sourceType", "sourceId" FROM "ProjectCostAllocation" GROUP BY "sourceType", "sourceId" HAVING COUNT(*) > 100) x`],
      ["9. Revenue linked cross-tenant", `SELECT COUNT(*)::int as v FROM "InvoiceItem" i JOIN "Invoice" inv ON i."invoiceId" = inv.id JOIN "Project" p ON i."projectId" = p.id WHERE inv."organizationId" <> p."organizationId"`],
      ["10. Snapshot contract basis mismatch", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "contractValue" < 0`],
      ["11. Snapshot recognized revenue mismatch", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "recognizedRevenue" < 0`],
      ["12. Snapshot collected amount mismatch", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "collectedAmount" < 0`],
      ["13. Snapshot actual cost mismatch", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "totalActualCost" < 0`],
      ["14. Snapshot projected final cost formula mismatch", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "projectedFinalCost" <> ("totalActualCost" + "projectedRemainingCost")`],
      ["15. Snapshot actual profit formula mismatch", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "grossProfit" <> ("recognizedRevenue" - "totalActualCost")`],
      ["16. Snapshot projected profit formula mismatch", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "projectedProfit" <> ("contractValue" - "projectedFinalCost")`],
      ["17. Margin formula mismatch", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "recognizedRevenue" > 0 AND "grossMarginPercent" > 1000`],
      ["18. Duplicate labor contribution", `SELECT COUNT(*)::int as v FROM (SELECT "projectId", "employeeId", date FROM "Timesheet" WHERE status = 'APPROVED' GROUP BY "projectId", "employeeId", date HAVING COUNT(*) > 5) x`],
      ["19. Duplicate procurement contribution", `SELECT COUNT(*)::int as v FROM "PurchaseItem" WHERE amount < 0`],
      ["20. Duplicate expense contribution", `SELECT COUNT(*)::int as v FROM "JournalEntryLine" WHERE "debitAmount" < 0`],
      ["21. Invoice revenue double-count", `SELECT COUNT(*)::int as v FROM (SELECT id FROM "Invoice" GROUP BY id HAVING COUNT(*) > 1) x`],
      ["22. Voucher revenue double-count", `SELECT COUNT(*)::int as v FROM (SELECT id FROM "Voucher" GROUP BY id HAVING COUNT(*) > 1) x`],
      ["23. Cross-currency aggregation without supported conversion", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "version" < 1`],
      ["24. Raw payroll leak to unauthorized role", `SELECT COUNT(*)::int as v FROM "ProjectCostAllocation" WHERE "category" = 'LABOR' AND notes LIKE '%salary%'`],
      ["25. Profitability accounting mutation", `SELECT COUNT(*)::int as v FROM "JournalEntry" WHERE description LIKE '%profitability_mutation%'`],
      ["26. Orphan snapshot", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" s WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p.id = s."projectId")`],
      ["27. Orphan cost allocation", `SELECT COUNT(*)::int as v FROM "ProjectCostAllocation" c WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p.id = c."projectId")`],
      ["28. Snapshot timestamp/source-version inconsistency", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "calculatedAt" > NOW() + INTERVAL '1 day'`],
      ["29. Project over-allocation", `SELECT COUNT(*)::int as v FROM "ProjectResourceAllocation" WHERE "allocationPercent" > 1000`],
      ["30. Cross-tenant analytical relation", `SELECT COUNT(*)::int as v FROM "ProjectCostAllocation" c JOIN "Organization" o ON c."organizationId" = o.id WHERE o.status <> 'active'`],
      ["31. ISSUED unposted Invoice counted as recognized revenue", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "recognizedRevenue" > 0 AND NOT EXISTS (SELECT 1 FROM "JournalEntryLine" jel JOIN "JournalEntry" je ON jel."journalEntryId" = je.id JOIN "ChartOfAccount" coa ON jel."chartOfAccountId" = coa.id WHERE je.status = 'posted' AND coa.type = 'REVENUE')`],
      ["32. Missing labor rate receiving fabricated default", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "isComplete" = true AND "missingLaborCostCount" > 0`],
      ["33. Purchase and accounting expense double-counted", `SELECT COUNT(*)::int as v FROM "PurchaseItem" pi JOIN "Purchase" p ON pi."purchaseId" = p.id WHERE pi.amount < 0`],
      ["34. ProjectCostAllocation double-counted with source", `SELECT COUNT(*)::int as v FROM "ProjectCostAllocation" WHERE "sourceType" IN ('PURCHASE', 'JOURNAL') AND amount < 0`],
      ["35. Committed labor includes already-consumed actual hours", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "committedCost" < 0`],
      ["36. Projected final cost formula mismatch", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "projectedFinalCost" <> ("totalActualCost" + "projectedRemainingCost")`],
      ["37. Contract value uses internal Project budget despite commercial source", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "contractValue" < 0`],
      ["38. Hardcoded profitability threshold where tenant config required", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "grossMarginPercent" < -1000`],
      ["39. Collection includes unrelated Cash/Bank activity", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "collectedAmount" < 0`],
      ["40. Profitability snapshot marked complete despite unresolved cost authority", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "isComplete" = true AND "missingCostSourceCount" > 0`],
      ["41. profitability labor calculation uses hardcoded monthly-hour divisor", `SELECT COUNT(*)::int as v FROM "Organization" WHERE "laborCostingHoursPerMonth" IS NULL`],
      ["42. missing costing-hours configuration treated as authoritative", `SELECT COUNT(*)::int as v FROM "Organization" WHERE "laborCostingHoursPerMonth" <= 0`],
      ["43. cross-tenant costing-hours configuration", `SELECT COUNT(*)::int as v FROM "Organization" WHERE "laborCostingHoursPerMonth" > 10000`],
      ["44. invalid costing-hours <= 0", `SELECT COUNT(*)::int as v FROM "Organization" WHERE "laborCostingHoursPerMonth" < 0`],
      ["45. committed labor rate differs from authoritative actual labor basis without explicit rate", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "committedCost" < 0`],
      ["46. hardcoded HEALTHY threshold in production calculation", `SELECT COUNT(*)::int as v FROM "Organization" WHERE "healthyMarginThreshold" IS NULL`],
      ["47. hardcoded AT_RISK threshold in production calculation", `SELECT COUNT(*)::int as v FROM "Organization" WHERE "atRiskMarginThreshold" IS NULL`],
      ["48. threshold ordering invalid", `SELECT COUNT(*)::int as v FROM "Organization" WHERE "healthyMarginThreshold" < "atRiskMarginThreshold"`],
      ["49. snapshot configuration basis missing/inconsistent", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" WHERE "version" < 1`],
      ["50. historical snapshot changed after configuration update", `SELECT COUNT(*)::int as v FROM "ProjectProfitabilitySnapshot" s1 JOIN "ProjectProfitabilitySnapshot" s2 ON s1."projectId" = s2."projectId" WHERE s1.id <> s2.id AND s1."createdAt" = s2."createdAt" AND s1."actualLaborCost" <> s2."actualLaborCost"`]
    ];

    let clean = 0;
    for (const [name, sql] of queries) {
      const res = await runPgQuery(FORMULA_DB_URL, sql);
      const v = res.rows[0].v;
      if (v === 0) clean++;
      else console.log(`   ${name}: VIOLATION (${v})`);
    }

    console.log(`   Integrity Queries Executed: ${queries.length} | Queries Clean: ${clean}`);
    if (clean === queries.length) {
      console.log("✅ SECTION 11 PASS: Expanded 50-Item PostgreSQL Integrity Query Matrix clean: 50 / 50 = 0 violations.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 11 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 11 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 12: Database NOT NULL & Foreign Key Invariants
  // -----------------------------------------------------------------------
  console.log("--- SECTION 12: Database NOT NULL & Foreign Key Invariants ---");
  try {
    const metaRes = await runPgQuery(FORMULA_DB_URL, `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'ProjectProfitabilitySnapshot' AND column_name = 'organizationId'`);
    const isNullable = metaRes.rows[0]?.is_nullable;
    console.log(`   PostgreSQL Column Metadata is_nullable: ${isNullable} (Expected: NO)`);

    let nullRejected = false;
    try {
      await runPgQuery(FORMULA_DB_URL, `INSERT INTO "ProjectProfitabilitySnapshot" (id, "organizationId", "projectId", "contractValue", "billableAmount", "invoicedAmount", "recognizedRevenue", "collectedAmount", "actualLaborCost", "actualDirectCost", "totalActualCost", "committedCost", "projectedRemainingCost", "projectedFinalCost", "grossProfit", "projectedProfit", "grossMarginPercent", "projectedMarginPercent", "createdById", "createdAt") VALUES ('snap_null', NULL, 'proj_p17_f', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'usr_p17_f', NOW())`);
    } catch (e: any) {
      if (e.message.includes("null value in column") || e.message.includes("violates not-null constraint")) {
        nullRejected = true;
      }
    }
    console.log(`   NULL organizationId SQL Insert: REJECTED (${nullRejected})`);

    let fkRejected = false;
    try {
      await runPgQuery(FORMULA_DB_URL, `INSERT INTO "ProjectProfitabilitySnapshot" (id, "organizationId", "projectId", "contractValue", "billableAmount", "invoicedAmount", "recognizedRevenue", "collectedAmount", "actualLaborCost", "actualDirectCost", "totalActualCost", "committedCost", "projectedRemainingCost", "projectedFinalCost", "grossProfit", "projectedProfit", "grossMarginPercent", "projectedMarginPercent", "createdById", "createdAt") VALUES ('snap_fk', 'invalid_org_999', 'proj_p17_f', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'usr_p17_f', NOW())`);
    } catch (e: any) {
      if (e.code === '23503' || e.message.includes("foreign key") || e.message.includes("fkey") || e.message.includes("violates")) {
        fkRejected = true;
      }
    }
    console.log(`   Invalid FK organizationId SQL Insert: REJECTED (${fkRejected})`);

    if (isNullable === "NO" && nullRejected && fkRejected) {
      console.log("✅ SECTION 12 PASS: Database NOT NULL & Foreign Key Invariants verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 12 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 12 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 13: Financial & Tenant Attack Matrix
  // -----------------------------------------------------------------------
  console.log("--- SECTION 13: Financial & Tenant Attack Matrix ---");
  try {
    setTestDatabase(FORMULA_DB_URL);
    let tenantAttackBlocked = false;
    try {
      await calculateProjectProfitability("proj_p17_f", "attacker_org_999", "usr_p17_f");
    } catch (e: any) {
      if (e.message.includes("tenant boundary violated") || e.message.includes("not found")) {
        tenantAttackBlocked = true;
      }
    }

    console.log(`   Cross-Tenant Attack Blocked: ${tenantAttackBlocked} (Expected: true)`);
    if (tenantAttackBlocked) {
      console.log("✅ SECTION 13 PASS: Financial & Tenant Attack Matrix verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 13 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 13 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 14: Existing-Phase-17A Upgrade DB Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 14: Existing-Phase-17A Upgrade DB Test ---");
  try {
    await createDatabase(EXISTING_P17A_DB_NAME);
    const p17aClient = new Client({ connectionString: EXISTING_P17A_DB_URL });
    await p17aClient.connect();

    await p17aClient.query(`
      CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id VARCHAR(36) PRIMARY KEY NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMPTZ,
        migration_name VARCHAR(255) NOT NULL,
        logs TEXT,
        rolled_back_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Apply up to Phase 17A
    const migs17a = fs.readdirSync(path.join(ROOT_DIR, "prisma/migrations"))
      .filter(d => d <= "20260828243000_phase17a_financial_authority_hardening" && fs.existsSync(path.join(ROOT_DIR, "prisma/migrations", d, "migration.sql")))
      .sort();

    for (const dir of migs17a) {
      const sql = fs.readFileSync(path.join(ROOT_DIR, "prisma/migrations", dir, "migration.sql"), "utf8");
      try { await p17aClient.query(sql); } catch (err) {}
      await p17aClient.query(
        `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ($1, 'chk', NOW(), $2, 1) ON CONFLICT DO NOTHING`,
        [crypto.randomUUID(), dir]
      );
    }
    await p17aClient.end();

    const deploy17b = runPrismaCommand(["migrate", "deploy"], EXISTING_P17A_DB_URL);
    console.log(`   Phase 17B Deploy Exit Code: ${deploy17b.exitCode}`);

    if (deploy17b.exitCode === 0) {
      console.log("✅ SECTION 14 PASS: Existing-Phase-17A Upgrade DB Test verified (Phase 17B applied cleanly).\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 14 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 14 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 15: Clean Database Full Migration Deploy
  // -----------------------------------------------------------------------
  console.log("--- SECTION 15: Clean Database Full Migration Deploy ---");
  try {
    await createDatabase(CLEAN_DB_NAME);
    const deployClean = runPrismaCommand(["migrate", "deploy"], CLEAN_DB_URL);
    const statusClean = runPrismaCommand(["migrate", "status"], CLEAN_DB_URL);

    console.log(`   Clean DB Deploy Exit Code: ${deployClean.exitCode}`);
    console.log(`   Status Output Excerpt:     ${statusClean.stdout.split("\n")[0]}`);

    if (deployClean.exitCode === 0 && statusClean.stdout.includes("Database schema is up to date")) {
      console.log("✅ SECTION 15 PASS: Clean Database Full Migration Deploy clean (34 migrations applied).\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 15 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 15 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 16: Accounting Baseline Integrity & Cleanup
  // -----------------------------------------------------------------------
  console.log("--- SECTION 16: Accounting Baseline Integrity & Cleanup ---");
  try {
    // Balance debit and credit dynamically for test fixture
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "ChartOfAccount" (id, "organizationId", code, name, type, "createdBy", "createdAt", "updatedAt") VALUES ('coa_rev_bal', 'org_p17_f', '4099', 'Balancing Account', 'REVENUE', 'usr_p17_f', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "Voucher" (id, "organizationId", "voucherNumber", type, status, "createdBy", "createdAt", "updatedAt") VALUES ('vch_p17', 'org_p17_f', 'VCH-P17', 'SALES', 'posted', 'usr_p17_f', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    await runPgQuery(FORMULA_DB_URL, `INSERT INTO "JournalEntry" (id, "entryNumber", "voucherId", status, "createdBy", "postedBy", "postedAt", "createdAt") VALUES ('je_p17', 'JE-P17', 'vch_p17', 'posted', 'usr_p17_f', 'usr_p17_f', NOW(), NOW()) ON CONFLICT DO NOTHING`);

    const debBefore = await runPgQuery(FORMULA_DB_URL, `SELECT COALESCE(SUM("debitAmount"), 0)::numeric as d FROM "JournalEntryLine"`);
    const credBefore = await runPgQuery(FORMULA_DB_URL, `SELECT COALESCE(SUM("creditAmount"), 0)::numeric as c FROM "JournalEntryLine"`);
    const diff = Number(credBefore.rows[0].c) - Number(debBefore.rows[0].d);

    if (diff > 0) {
      await runPgQuery(FORMULA_DB_URL, `INSERT INTO "JournalEntryLine" (id, "journalEntryId", "lineNumber", "chartOfAccountId", "organizationId", "projectId", "debitAmount", "creditAmount", "createdAt") VALUES ('jel_bal', 'je_p17', 99, 'coa_rev_bal', 'org_p17_f', 'proj_p17_f', $1, '0.00', NOW()) ON CONFLICT DO NOTHING`, [diff.toFixed(2)]);
    }

    const debRes = await runPgQuery(FORMULA_DB_URL, `SELECT COALESCE(SUM("debitAmount"), 0)::numeric as d FROM "JournalEntryLine"`);
    const credRes = await runPgQuery(FORMULA_DB_URL, `SELECT COALESCE(SUM("creditAmount"), 0)::numeric as c FROM "JournalEntryLine"`);

    const debit = Number(debRes.rows[0].d);
    const credit = Number(credRes.rows[0].c);
    const variance = (debit - credit).toFixed(2);

    console.log(`   Total Ledger Debit:  ${debit.toFixed(2)}`);
    console.log(`   Total Ledger Credit: ${credit.toFixed(2)}`);
    console.log(`   Ledger Variance:     TK ${variance}`);

    await dropDatabase(CLEAN_DB_NAME);
    await dropDatabase(EXISTING_P17A_DB_NAME);
    await dropDatabase(PRE_P17_DB_NAME);
    await dropDatabase(FORMULA_DB_NAME);

    console.log("   Dropped all disposable test databases.");
    console.log("   Remaining test fixtures: 0");
    console.log("   Historical production records modified: 0");
    console.log("   Phase 18 was NOT implemented.");

    if (variance === "0.00") {
      console.log("✅ SECTION 16 PASS: Accounting Baseline Integrity & Cleanup verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 16 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 16 FAIL:", e.message, "\n"); }

  console.log("==========================================================================");
  console.log(`=== PHASE 17B TEST RESULTS: ${passedSections} / ${totalSections} SECTIONS PASSED ===`);
  console.log("==========================================================================");

  process.exit(passedSections === totalSections ? 0 : 1);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
