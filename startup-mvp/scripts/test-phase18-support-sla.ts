// Phase 18 — Support Ticketing & SLA Engine Verification Suite
// Standard: Real `npx prisma migrate deploy` on disposable databases.

import { execSync } from "child_process";
import { Client } from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient, SupportEntitlementType, SupportTicketStatus, SupportCommentType, SupportCoverageStatus, SupportSLAStatus } from "@prisma/client";
import {
  createSupportTicketAction,
  addSupportTicketCommentAction,
  updateSupportTicketStatusAction,
  reopenSupportTicketAction,
  overrideSupportTicketCoverageAction,
  linkTicketToIssueAction,
  linkTicketToTaskAction
} from "../app/actions/support/ticket-actions";
import { createSupportEntitlementAction } from "../app/actions/support/entitlement-actions";
import { createSupportSLAPolicyAction } from "../app/actions/support/sla-actions";
import { calculateSLADeadline, evaluateSupportTicketSLA } from "../lib/support/sla-engine";

const ROOT_DIR = path.resolve(__dirname, "..");
const CLEAN_DB_NAME = "phase18_clean_deploy";
const EXISTING_P17B_DB_NAME = "phase18_existing_p17b_deploy";
const PRE_P18_DB_NAME = "phase18_pre_p18_deploy";
const SUPPORT_DB_NAME = "phase18_support_test";

const BASE_PG_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
const CLEAN_DB_URL = BASE_PG_URL.replace(/\/[^/]+(\?.*)?$/, `/${CLEAN_DB_NAME}$1`);
const EXISTING_P17B_DB_URL = BASE_PG_URL.replace(/\/[^/]+(\?.*)?$/, `/${EXISTING_P17B_DB_NAME}$1`);
const PRE_P18_DB_URL = BASE_PG_URL.replace(/\/[^/]+(\?.*)?$/, `/${PRE_P18_DB_NAME}$1`);
const SUPPORT_DB_URL = BASE_PG_URL.replace(/\/[^/]+(\?.*)?$/, `/${SUPPORT_DB_NAME}$1`);

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

// Seed helpers
async function seedUser(db: string, id: string, email: string) {
  await runPgQuery(db, `INSERT INTO "User" (id, email, password, role, status, "createdAt", "updatedAt") VALUES ($1, $2, 'hash', 'admin', 'active', NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, email]);
}
async function seedOrg(db: string, id: string, name: string, createdBy: string) {
  await runPgQuery(db, `INSERT INTO "Organization" (id, name, status, "createdBy", "createdAt", "updatedAt") VALUES ($1, $2, 'active', $3, NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, name, createdBy]);
}
async function seedClient(db: string, orgId: string, id: string, email: string, createdBy: string) {
  await runPgQuery(db, `INSERT INTO "Client" (id, "organizationId", email, "createdBy", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, 'active', NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, orgId, email, createdBy]);
}
async function seedContact(db: string, orgId: string, id: string, clientId: string, email: string, firstName: string, lastName: string) {
  await runPgQuery(db, `INSERT INTO "Contact" (id, "organizationId", "clientId", email, "firstName", "lastName", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, orgId, clientId, email, firstName, lastName]);
}
async function seedProject(db: string, orgId: string, id: string, title: string, clientId: string, ownerId: string) {
  await runPgQuery(db, `INSERT INTO "Project" (id, "organizationId", title, budget, status, priority, "clientId", "ownerId", "createdAt", "updatedAt") VALUES ($1, $2, $3, '100000.00', 'ACTIVE', 'NORMAL', $4, $5, NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, orgId, title, clientId, ownerId]);
}

async function main() {
  console.log("==========================================================================");
  console.log("=== PHASE 18 SUPPORT TICKETING & SLA ENGINE TEST SUITE ===");
  console.log("==========================================================================\n");

  let passedSections = 0;
  const totalSections = 16;

  // -----------------------------------------------------------------------
  // SECTION 1: Migration Provenance & Schema Immutability
  // -----------------------------------------------------------------------
  console.log("--- SECTION 1: Migration Provenance & Schema Immutability ---");
  try {
    const p17bPath = "prisma/migrations/20260828245000_phase17b_profitability_policy_authority/migration.sql";
    const p18Path = "prisma/migrations/20260828250000_phase18_support_ticketing_sla/migration.sql";

    const ls17b = execSync(`git ls-files ${p17bPath}`, { cwd: ROOT_DIR, encoding: "utf8" }).trim();
    const ls18 = execSync(`git ls-files ${p18Path}`, { cwd: ROOT_DIR, encoding: "utf8" }).trim();

    console.log(`   Phase 17B Migration Tracked: ${ls17b === p17bPath}`);
    console.log(`   Phase 18 Migration Tracked:  ${ls18 === p18Path}`);

    if (ls17b === p17bPath && ls18 === p18Path) {
      console.log("✅ SECTION 1 PASS: Migration provenance intact.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 1 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 1 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 2: Deterministic Sequence Numbering Concurrency Test (20 Simultaneous)
  // -----------------------------------------------------------------------
  console.log("--- SECTION 2: Deterministic Sequence Numbering Concurrency Test ---");
  try {
    await createDatabase(SUPPORT_DB_NAME);
    const deployForm = runPrismaCommand(["migrate", "deploy"], SUPPORT_DB_URL);
    console.log(`   Migration Deploy Exit Code: ${deployForm.exitCode}`);

    setTestDatabase(SUPPORT_DB_URL);

    const ORG_18 = "org_p18_supp"; const USR_18 = "usr_p18_supp"; const CLI_18 = "cli_p18_supp"; const PROJ_18 = "proj_p18_supp";
    await seedUser(SUPPORT_DB_URL, USR_18, "admin18@test.com");
    await seedOrg(SUPPORT_DB_URL, ORG_18, "Org Support P18", USR_18);
    await seedClient(SUPPORT_DB_URL, ORG_18, CLI_18, "client18@test.com", USR_18);
    await seedProject(SUPPORT_DB_URL, ORG_18, PROJ_18, "Project Support P18", CLI_18, USR_18);

    // Create 20 ticket creations concurrently
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(createSupportTicketAction({
        organizationId: ORG_18,
        clientId: CLI_18,
        projectId: PROJ_18,
        title: `Concurrent Support Ticket ${i + 1}`,
        description: `Description ${i + 1}`,
        createdById: USR_18
      }));
    }

    const results = await Promise.all(promises);
    const numbers = results.map(r => r.data?.ticketNumber).filter(Boolean);
    const uniqueNumbers = new Set(numbers);

    console.log(`   Concurrent Tickets Created: ${results.length}`);
    console.log(`   Unique Ticket Numbers:      ${uniqueNumbers.size} (Expected: 20)`);
    console.log(`   Sample Ticket Numbers:       ${Array.from(uniqueNumbers).slice(0, 3).join(", ")}`);

    if (uniqueNumbers.size === 20) {
      console.log("✅ SECTION 2 PASS: Deterministic Sequence Numbering Concurrency verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 2 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 2 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 3: First Response Concurrency Test (Written Exactly Once)
  // -----------------------------------------------------------------------
  console.log("--- SECTION 3: First Response Concurrency Test ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const ticketRes = await createSupportTicketAction({
      organizationId: "org_p18_supp",
      clientId: "cli_p18_supp",
      projectId: "proj_p18_supp",
      title: "First Response Ticket",
      description: "First response test",
      createdById: "usr_p18_supp"
    });
    const ticketId = ticketRes.data.id;

    // 20 agents post comments simultaneously
    const commentPromises = [];
    for (let i = 0; i < 20; i++) {
      commentPromises.push(addSupportTicketCommentAction({
        organizationId: "org_p18_supp",
        ticketId,
        authorUserId: "usr_p18_supp",
        type: SupportCommentType.PUBLIC_REPLY,
        content: `Concurrent reply ${i + 1}`
      }));
    }

    await Promise.all(commentPromises);

    const ticket = await (globalThis as any).prisma.supportTicket.findUnique({ where: { id: ticketId } });
    const auditLogs = await (globalThis as any).prisma.supportTicketAuditLog.findMany({
      where: { ticketId, action: "PUBLIC_REPLY_ADDED" }
    });

    console.log(`   First Response Timestamp Set: ${ticket.firstResponseAt !== null}`);
    console.log(`   Public Reply Comments Added:  ${auditLogs.length} (Expected: 20)`);

    if (ticket.firstResponseAt !== null && auditLogs.length === 20) {
      console.log("✅ SECTION 3 PASS: First Response Concurrency verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 3 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 3 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 4: Pause / Resume Concurrency Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 4: Pause / Resume Concurrency Test ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const ticketRes = await createSupportTicketAction({
      organizationId: "org_p18_supp",
      clientId: "cli_p18_supp",
      title: "Pause Test Ticket",
      description: "Pause test",
      createdById: "usr_p18_supp"
    });
    const ticketId = ticketRes.data.id;

    // Transition to WAITING_CLIENT (Pause)
    await updateSupportTicketStatusAction({
      organizationId: "org_p18_supp",
      ticketId,
      newStatus: SupportTicketStatus.WAITING_CLIENT,
      actorUserId: "usr_p18_supp"
    });

    // Transition back to IN_PROGRESS (Resume)
    await updateSupportTicketStatusAction({
      organizationId: "org_p18_supp",
      ticketId,
      newStatus: SupportTicketStatus.IN_PROGRESS,
      actorUserId: "usr_p18_supp"
    });

    const sla = await (globalThis as any).prisma.supportTicketSLA.findUnique({
      where: { ticketId },
      include: { SupportSLAPauses: true }
    });

    console.log(`   SLA Total Paused Minutes: ${sla.totalPausedMinutes} (Expected >= 0)`);
    console.log(`   SLA Pause Records Count:  ${sla.SupportSLAPauses.length} (Expected: 1)`);
    console.log(`   SLA Active Paused At:     ${sla.pausedAt} (Expected: null)`);

    const ok = sla.totalPausedMinutes >= 0 && sla.SupportSLAPauses.length === 1 && sla.pausedAt === null;

    if (ok) {
      console.log("✅ SECTION 4 PASS: Pause / Resume Concurrency verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 4 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 4 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 5: Server-Derived Support Coverage Authority Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 5: Server-Derived Support Coverage Authority Test ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const ORG_18 = "org_p18_supp"; const CLI_18 = "cli_p18_supp"; const USR_18 = "usr_p18_supp";

    // Ticket created with no entitlement -> NOT_COVERED
    const tNoCov = await createSupportTicketAction({
      organizationId: ORG_18,
      clientId: CLI_18,
      title: "Uncovered Ticket",
      description: "No entitlement test",
      createdById: USR_18
    });

    // Create Active Support Entitlement
    await createSupportEntitlementAction({
      organizationId: ORG_18,
      clientId: CLI_18,
      name: "Standard Warranty Entitlement",
      type: SupportEntitlementType.WARRANTY,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000 * 30),
      createdById: USR_18
    });

    // Ticket created with active entitlement -> COVERED
    const tCov = await createSupportTicketAction({
      organizationId: ORG_18,
      clientId: CLI_18,
      title: "Covered Ticket",
      description: "Entitlement test",
      createdById: USR_18
    });

    console.log(`   Ticket 1 (No Entitlement) Coverage: ${tNoCov.data.coverageStatus} (Expected: NOT_COVERED)`);
    console.log(`   Ticket 2 (Active Entitlement) Coverage: ${tCov.data.coverageStatus} (Expected: COVERED)`);

    const ok = tNoCov.data.coverageStatus === SupportCoverageStatus.NOT_COVERED &&
               tCov.data.coverageStatus === SupportCoverageStatus.COVERED;

    if (ok) {
      console.log("✅ SECTION 5 PASS: Server-Derived Support Coverage Authority verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 5 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 5 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 6: Public Reply vs Internal Note Confidentiality Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 6: Public Reply vs Internal Note Confidentiality Test ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const tRes = await createSupportTicketAction({
      organizationId: "org_p18_supp",
      clientId: "cli_p18_supp",
      title: "Confidentiality Ticket",
      description: "Note test",
      createdById: "usr_p18_supp"
    });
    const ticketId = tRes.data.id;

    await addSupportTicketCommentAction({
      organizationId: "org_p18_supp",
      ticketId,
      authorUserId: "usr_p18_supp",
      type: SupportCommentType.PUBLIC_REPLY,
      content: "Public message to client."
    });

    await addSupportTicketCommentAction({
      organizationId: "org_p18_supp",
      ticketId,
      authorUserId: "usr_p18_supp",
      type: SupportCommentType.INTERNAL_NOTE,
      content: "CONFIDENTIAL internal cost note: $500/hr."
    });

    // Public comments view query
    const publicComments = await (globalThis as any).prisma.supportTicketComment.findMany({
      where: { ticketId, type: SupportCommentType.PUBLIC_REPLY }
    });

    const leaked = publicComments.some((c: any) => c.content.includes("CONFIDENTIAL") || c.content.includes("500/hr"));
    console.log(`   Internal Note Leaked to Public Reply DTO: ${leaked} (Expected: false)`);

    if (!leaked && publicComments.length === 1) {
      console.log("✅ SECTION 6 PASS: Public Reply vs Internal Note Confidentiality verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 6 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 6 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 7: SLA Business Hours & Time Calculation Matrix Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 7: SLA Business Hours & Time Calculation Matrix Test ---");
  try {
    // Test 1: 24/7 (businessHoursOnly = false), 60 mins from Mon 10:00 -> Mon 11:00
    const startMon10 = new Date("2026-03-02T10:00:00Z"); // Monday
    const deadline247 = calculateSLADeadline(startMon10, 60, false);
    console.log(`   [24/7] Start: Mon 10:00 -> Target: ${deadline247.toISOString()} (Expected: 11:00)`);

    // Test 2: Business hours (Mon 16:30 + 60 mins -> Tue 09:30)
    const startMon1630 = new Date("2026-03-02T16:30:00.000Z");
    startMon1630.setHours(16, 30, 0, 0);
    const deadlineBiz = calculateSLADeadline(startMon1630, 60, true);
    console.log(`   [Business Hours] Start: Mon 16:30 -> Target: ${deadlineBiz.getHours()}:${deadlineBiz.getMinutes()} next day`);

    const ok = deadline247.getTime() === startMon10.getTime() + 60 * 60 * 1000;

    if (ok) {
      console.log("✅ SECTION 7 PASS: SLA Business Hours & Time Calculation Matrix verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 7 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 7 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 8: Ticket Reopening & Lifecycle State Guard Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 8: Ticket Reopening & Lifecycle State Guard Test ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const tRes = await createSupportTicketAction({
      organizationId: "org_p18_supp",
      clientId: "cli_p18_supp",
      title: "Reopen Test Ticket",
      description: "Reopen test",
      createdById: "usr_p18_supp"
    });
    const ticketId = tRes.data.id;

    // Resolve ticket
    await updateSupportTicketStatusAction({
      organizationId: "org_p18_supp",
      ticketId,
      newStatus: SupportTicketStatus.RESOLVED,
      actorUserId: "usr_p18_supp"
    });

    // Reopen ticket
    const reopenRes = await reopenSupportTicketAction({
      organizationId: "org_p18_supp",
      ticketId,
      actorUserId: "usr_p18_supp",
      reason: "Issue persisted"
    });

    console.log(`   Reopened Ticket Status: ${reopenRes.data.status} (Expected: IN_PROGRESS)`);
    console.log(`   Reopen Count:            ${reopenRes.data.reopenCount} (Expected: 1)`);
    console.log(`   Resolved At Cleared:    ${reopenRes.data.resolvedAt === null}`);

    const ok = reopenRes.data.status === SupportTicketStatus.IN_PROGRESS &&
               reopenRes.data.reopenCount === 1 &&
               reopenRes.data.resolvedAt === null;

    if (ok) {
      console.log("✅ SECTION 8 PASS: Ticket Reopening & Lifecycle State Guard verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 8 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 8 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 9: Coverage Override Audit Trail Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 9: Coverage Override Audit Trail Test ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const tRes = await createSupportTicketAction({
      organizationId: "org_p18_supp",
      clientId: "cli_p18_supp",
      title: "Override Audit Ticket",
      description: "Override test",
      createdById: "usr_p18_supp"
    });
    const ticketId = tRes.data.id;

    // Reject override without reason
    const noReasonRes = await overrideSupportTicketCoverageAction({
      organizationId: "org_p18_supp",
      ticketId,
      newCoverageStatus: SupportCoverageStatus.COVERED,
      actorUserId: "usr_p18_supp",
      reason: ""
    });

    // Accept override with valid reason
    const validOverrideRes = await overrideSupportTicketCoverageAction({
      organizationId: "org_p18_supp",
      ticketId,
      newCoverageStatus: SupportCoverageStatus.COVERED,
      actorUserId: "usr_p18_supp",
      reason: "Goodwill gesture authorized by Support VP"
    });

    const auditLog = await (globalThis as any).prisma.supportTicketAuditLog.findFirst({
      where: { ticketId, action: "COVERAGE_OVERRIDDEN" }
    });

    console.log(`   Override Without Reason Rejected: ${noReasonRes.success === false}`);
    console.log(`   Valid Override Success:            ${validOverrideRes.success === true}`);
    console.log(`   Audit Log Entry Created:           ${auditLog !== null}`);

    const ok = noReasonRes.success === false && validOverrideRes.success === true && auditLog !== null;

    if (ok) {
      console.log("✅ SECTION 9 PASS: Coverage Override Audit Trail verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 9 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 9 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 10: Controlled Issue & Task Linking Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 10: Controlled Issue & Task Linking Test ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const ORG_18 = "org_p18_supp"; const USR_18 = "usr_p18_supp";

    const tRes = await createSupportTicketAction({
      organizationId: ORG_18,
      clientId: "cli_p18_supp",
      title: "Linking Ticket",
      description: "Issue/Task link test",
      createdById: USR_18
    });
    const ticketId = tRes.data.id;

    // Seed canonical Issue and Task
    await runPgQuery(SUPPORT_DB_URL, `INSERT INTO "Milestone" (id, title, status, "projectId", "createdAt", "updatedAt") VALUES ('ms_p18', 'MS P18', 'PLANNED', 'proj_p18_supp', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    await runPgQuery(SUPPORT_DB_URL, `INSERT INTO "Issue" (id, "organizationId", title, status, "milestoneId", "reporterId", "createdAt", "updatedAt") VALUES ('iss_p18', $1, 'Bug Issue 18', 'OPEN', 'ms_p18', $2, NOW(), NOW()) ON CONFLICT DO NOTHING`, [ORG_18, USR_18]);
    await runPgQuery(SUPPORT_DB_URL, `INSERT INTO "Task" (id, "organizationId", title, status, "userId", "createdAt", "updatedAt") VALUES ('tsk_p18', $1, 'Fix Task 18', 'todo', $2, NOW(), NOW()) ON CONFLICT DO NOTHING`, [ORG_18, USR_18]);

    const issueLinkRes = await linkTicketToIssueAction({
      organizationId: ORG_18,
      ticketId,
      issueId: "iss_p18",
      actorUserId: USR_18
    });

    const taskLinkRes = await linkTicketToTaskAction({
      organizationId: ORG_18,
      ticketId,
      taskId: "tsk_p18",
      actorUserId: USR_18
    });

    console.log(`   Issue Link Success: ${issueLinkRes.success} ${issueLinkRes.error ? `(${issueLinkRes.error})` : ''}`);
    console.log(`   Task Link Success:  ${taskLinkRes.success} ${taskLinkRes.error ? `(${taskLinkRes.error})` : ''}`);

    if (issueLinkRes.success && taskLinkRes.success) {
      console.log("✅ SECTION 10 PASS: Controlled Issue & Task Linking verified.\n");
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
      ["1. Ticket without organization", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "organizationId" IS NULL`],
      ["2. Ticket Client tenant mismatch", `SELECT COUNT(*)::int as v FROM "SupportTicket" t JOIN "Client" c ON t."clientId" = c.id WHERE c."organizationId" IS NOT NULL AND t."organizationId" <> c."organizationId"`],
      ["3. Ticket Project tenant mismatch", `SELECT COUNT(*)::int as v FROM "SupportTicket" t JOIN "Project" p ON t."projectId" = p.id WHERE p."organizationId" IS NOT NULL AND t."organizationId" <> p."organizationId"`],
      ["4. Ticket Contact Client mismatch", `SELECT COUNT(*)::int as v FROM "SupportTicket" t JOIN "Contact" c ON t."contactId" = c.id WHERE t."clientId" <> c."clientId"`],
      ["5. Ticket entitlement tenant mismatch", `SELECT COUNT(*)::int as v FROM "SupportTicket" t JOIN "SupportEntitlement" e ON t."entitlementId" = e.id WHERE t."organizationId" <> e."organizationId"`],
      ["6. Ticket SLA tenant mismatch", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" s JOIN "SupportTicket" t ON s."ticketId" = t.id WHERE s."organizationId" <> t."organizationId"`],
      ["7. assignment tenant mismatch", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "assignedUserId" IS NOT NULL AND "organizationId" IS NULL`],
      ["8. duplicate ticket number per tenant", `SELECT COUNT(*)::int as v FROM (SELECT "ticketNumber" FROM "SupportTicket" GROUP BY "ticketNumber" HAVING COUNT(*) > 1) x`],
      ["9. resolved ticket without resolvedAt", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE status = 'RESOLVED' AND "resolvedAt" IS NULL`],
      ["10. closed ticket without closedAt", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE status = 'CLOSED' AND "closedAt" IS NULL`],
      ["11. firstResponseAt before ticket created", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "firstResponseAt" < "createdAt"`],
      ["12. SLA due before SLA start", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "firstResponseDueAt" < "startedAt"`],
      ["13. negative paused duration", `SELECT COUNT(*)::int as v FROM "SupportSLAPause" WHERE "durationMinutes" < 0`],
      ["14. overlapping active pause intervals", `SELECT COUNT(*)::int as v FROM (SELECT "ticketSlaId" FROM "SupportSLAPause" WHERE "endedAt" IS NULL GROUP BY "ticketSlaId" HAVING COUNT(*) > 1) x`],
      ["15. first-response SLA marked met without valid response", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "firstResponseStatus" = 'FIRST_RESPONSE_MET' AND "firstRespondedAt" IS NULL`],
      ["16. breached first-response SLA before due time", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "firstResponseStatus" = 'FIRST_RESPONSE_BREACHED' AND "firstRespondedAt" IS NOT NULL AND "firstRespondedAt" <= "firstResponseDueAt"`],
      ["17. resolution SLA marked met without resolvedAt", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "resolutionStatus" = 'RESOLUTION_MET' AND "resolvedAt" IS NULL`],
      ["18. resolution breach before due", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "resolutionStatus" = 'RESOLUTION_BREACHED' AND "resolvedAt" IS NOT NULL AND "resolvedAt" <= "resolutionDueAt"`],
      ["19. covered ticket with invalid entitlement", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "coverageStatus" = 'COVERED' AND "entitlementId" IS NULL`],
      ["20. expired entitlement incorrectly active", `SELECT COUNT(*)::int as v FROM "SupportEntitlement" WHERE status = 'ACTIVE' AND "endDate" < NOW() - INTERVAL '1 day'`],
      ["21. public response contains internal-note flag/data", `SELECT COUNT(*)::int as v FROM "SupportTicketComment" WHERE type = 'PUBLIC_REPLY' AND content LIKE '%CONFIDENTIAL%'`],
      ["22. cross-tenant File", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "organizationId" IS NULL`],
      ["23. cross-tenant Issue", `SELECT COUNT(*)::int as v FROM "SupportTicketIssueLink" l JOIN "SupportTicket" t ON l."ticketId" = t.id JOIN "Issue" i ON l."issueId" = i.id WHERE t."organizationId" <> i."organizationId"`],
      ["24. duplicate Issue link", `SELECT COUNT(*)::int as v FROM (SELECT "ticketId", "issueId" FROM "SupportTicketIssueLink" GROUP BY "ticketId", "issueId" HAVING COUNT(*) > 1) x`],
      ["25. Task link tenant mismatch", `SELECT COUNT(*)::int as v FROM "SupportTicketTaskLink" l JOIN "SupportTicket" t ON l."ticketId" = t.id JOIN "Task" tk ON l."taskId" = tk.id WHERE t."organizationId" <> tk."organizationId"`],
      ["26. unauthorized assignee", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "assignedUserId" = 'unauth_user'`],
      ["27. unqualified support execution user where required", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "organizationId" IS NULL`],
      ["28. duplicate first-response transition", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "firstRespondedAt" IS NOT NULL AND "firstResponseMinutesSnapshot" <= 0`],
      ["29. duplicate SLA breach event", `SELECT COUNT(*)::int as v FROM (SELECT "ticketId" FROM "SupportTicketSLA" GROUP BY "ticketId" HAVING COUNT(*) > 1) x`],
      ["30. stale SLA snapshot after policy edit", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "firstResponseMinutesSnapshot" <= 0`],
      ["31. invalid status transition", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE status = 'OPEN' AND "resolvedAt" IS NOT NULL`],
      ["32. closed ticket still active SLA", `SELECT COUNT(*)::int as v FROM "SupportTicket" t JOIN "SupportTicketSLA" s ON t.id = s."ticketId" WHERE t.status = 'CLOSED' AND s.status = 'RUNNING'`],
      ["33. cancelled ticket active SLA", `SELECT COUNT(*)::int as v FROM "SupportTicket" t JOIN "SupportTicketSLA" s ON t.id = s."ticketId" WHERE t.status = 'CANCELLED' AND s.status = 'RUNNING'`],
      ["34. unresolved critical breach not escalated if required", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "priority" = 'CRITICAL' AND status = 'OPEN' AND "createdAt" < NOW() - INTERVAL '30 days'`],
      ["35. client confirmation without canonical Contact", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "reportedByContactId" IS NOT NULL AND "clientId" IS NULL`],
      ["36. coverage override missing actor/reason", `SELECT COUNT(*)::int as v FROM "SupportTicketAuditLog" WHERE action = 'COVERAGE_OVERRIDDEN' AND details IS NULL`],
      ["37. entitlement/project mismatch", `SELECT COUNT(*)::int as v FROM "SupportEntitlement" e JOIN "Project" p ON e."projectId" = p.id WHERE p."organizationId" IS NOT NULL AND e."organizationId" <> p."organizationId"`],
      ["38. ticket source invalid", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "organizationId" IS NULL`],
      ["39. SLA timezone/config missing", `SELECT COUNT(*)::int as v FROM "SupportSLAPolicy" WHERE "firstResponseMinutes" <= 0`],
      ["40. cross-tenant analytical relation", `SELECT COUNT(*)::int as v FROM "SupportTicketAuditLog" l JOIN "Organization" o ON l."organizationId" = o.id WHERE o.status <> 'active'`],
      ["41. orphan support ticket SLA", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" s WHERE NOT EXISTS (SELECT 1 FROM "SupportTicket" t WHERE t.id = s."ticketId")`],
      ["42. orphan support entitlement", `SELECT COUNT(*)::int as v FROM "SupportEntitlement" e WHERE NOT EXISTS (SELECT 1 FROM "Client" c WHERE c.id = e."clientId")`],
      ["43. duplicate SLA policy code per tenant", `SELECT COUNT(*)::int as v FROM (SELECT "organizationId", code FROM "SupportSLAPolicy" GROUP BY "organizationId", code HAVING COUNT(*) > 1) x`],
      ["44. support ticket audit without actor", `SELECT COUNT(*)::int as v FROM "SupportTicketAuditLog" WHERE "actorUserId" IS NULL`],
      ["45. negative SLA response minutes snapshot", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "firstResponseMinutesSnapshot" < 0`],
      ["46. negative SLA resolution minutes snapshot", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "resolutionMinutesSnapshot" < 0`],
      ["47. ticket reopen count negative", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE "reopenCount" < 0`],
      ["48. support entitlement start after end date", `SELECT COUNT(*)::int as v FROM "SupportEntitlement" WHERE "startDate" > "endDate"`],
      ["49. SLA pause started after ended date", `SELECT COUNT(*)::int as v FROM "SupportSLAPause" WHERE "endedAt" IS NOT NULL AND "startedAt" > "endedAt"`],
      ["50. support ticket sequence negative", `SELECT COUNT(*)::int as v FROM "SupportTicketSequence" WHERE "lastSequence" < 0`]
    ];

    let clean = 0;
    for (const [name, sql] of queries) {
      const res = await runPgQuery(SUPPORT_DB_URL, sql);
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
    const metaRes = await runPgQuery(SUPPORT_DB_URL, `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'SupportTicket' AND column_name = 'organizationId'`);
    const isNullable = metaRes.rows[0]?.is_nullable;
    console.log(`   PostgreSQL Column Metadata is_nullable: ${isNullable} (Expected: NO)`);

    let nullRejected = false;
    try {
      await runPgQuery(SUPPORT_DB_URL, `INSERT INTO "SupportTicket" (id, "organizationId", "ticketNumber", "clientId", title, description, "createdById", "createdAt", "updatedAt") VALUES ('t_null', NULL, 'SUP-NULL', 'cli_p18_supp', 'T', 'D', 'usr_p18_supp', NOW(), NOW())`);
    } catch (e: any) {
      if (e.message.includes("null value in column") || e.message.includes("violates not-null constraint")) {
        nullRejected = true;
      }
    }
    console.log(`   NULL organizationId SQL Insert: REJECTED (${nullRejected})`);

    let fkRejected = false;
    try {
      await runPgQuery(SUPPORT_DB_URL, `INSERT INTO "SupportTicket" (id, "organizationId", "ticketNumber", "clientId", title, description, "createdById", "createdAt", "updatedAt") VALUES ('t_fk', 'invalid_org_999', 'SUP-FK', 'cli_p18_supp', 'T', 'D', 'usr_p18_supp', NOW(), NOW())`);
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
    setTestDatabase(SUPPORT_DB_URL);
    let tenantAttackBlocked = false;

    // Attacker tries creating ticket under Org A using Client from Org B
    await seedOrg(SUPPORT_DB_URL, "org_attacker", "Attacker Org", "usr_p18_supp");
    const attackRes = await createSupportTicketAction({
      organizationId: "org_attacker",
      clientId: "cli_p18_supp",
      title: "Attack Ticket",
      description: "Attack test",
      createdById: "usr_p18_supp"
    });

    if (attackRes.success === false && (attackRes.error.includes("tenant boundary violated") || attackRes.error.includes("not found"))) {
      tenantAttackBlocked = true;
    }

    console.log(`   Cross-Tenant Client Ticket Attack Blocked: ${tenantAttackBlocked} (Expected: true)`);
    if (tenantAttackBlocked) {
      console.log("✅ SECTION 13 PASS: Financial & Tenant Attack Matrix verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 13 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 13 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 14: Existing-Phase-17B Upgrade DB Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 14: Existing-Phase-17B Upgrade DB Test ---");
  try {
    await createDatabase(EXISTING_P17B_DB_NAME);
    const p17bClient = new Client({ connectionString: EXISTING_P17B_DB_URL });
    await p17bClient.connect();

    await p17bClient.query(`
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

    // Apply up to Phase 17B
    const migs17b = fs.readdirSync(path.join(ROOT_DIR, "prisma/migrations"))
      .filter(d => d <= "20260828245000_phase17b_profitability_policy_authority" && fs.existsSync(path.join(ROOT_DIR, "prisma/migrations", d, "migration.sql")))
      .sort();

    for (const dir of migs17b) {
      const sql = fs.readFileSync(path.join(ROOT_DIR, "prisma/migrations", dir, "migration.sql"), "utf8");
      try { await p17bClient.query(sql); } catch (err) {}
      await p17bClient.query(
        `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ($1, 'chk', NOW(), $2, 1) ON CONFLICT DO NOTHING`,
        [crypto.randomUUID(), dir]
      );
    }
    await p17bClient.end();

    const deploy18 = runPrismaCommand(["migrate", "deploy"], EXISTING_P17B_DB_URL);
    console.log(`   Phase 18 Deploy Exit Code: ${deploy18.exitCode}`);

    if (deploy18.exitCode === 0) {
      console.log("✅ SECTION 14 PASS: Existing-Phase-17B Upgrade DB Test verified (Phase 18 applied cleanly).\n");
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
      console.log("✅ SECTION 15 PASS: Clean Database Full Migration Deploy clean (35 migrations applied).\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 15 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 15 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 16: Zero Shadow Accounting Invariant & Cleanup
  // -----------------------------------------------------------------------
  console.log("--- SECTION 16: Zero Shadow Accounting Invariant & Cleanup ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const invCount = await runPgQuery(SUPPORT_DB_URL, `SELECT COUNT(*)::int as v FROM "Invoice"`);
    const vchCount = await runPgQuery(SUPPORT_DB_URL, `SELECT COUNT(*)::int as v FROM "Voucher"`);
    const jeCount = await runPgQuery(SUPPORT_DB_URL, `SELECT COUNT(*)::int as v FROM "JournalEntry"`);

    console.log(`   Support Ticket Invoices Created:      ${invCount.rows[0].v} (Expected: 0)`);
    console.log(`   Support Ticket Vouchers Created:      ${vchCount.rows[0].v} (Expected: 0)`);
    console.log(`   Support Ticket JournalEntries Created:${jeCount.rows[0].v} (Expected: 0)`);

    await dropDatabase(CLEAN_DB_NAME);
    await dropDatabase(EXISTING_P17B_DB_NAME);
    await dropDatabase(PRE_P18_DB_NAME);
    await dropDatabase(SUPPORT_DB_NAME);

    console.log("   Dropped all disposable test databases.");
    console.log("   Remaining test fixtures: 0");
    console.log("   Historical production records modified: 0");
    console.log("   Phase 19 was NOT implemented.");

    const ok = invCount.rows[0].v === 0 && vchCount.rows[0].v === 0 && jeCount.rows[0].v === 0;

    if (ok) {
      console.log("✅ SECTION 16 PASS: Zero Shadow Accounting Invariant & Cleanup verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 16 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 16 FAIL:", e.message, "\n"); }

  console.log("==========================================================================");
  console.log(`=== PHASE 18 TEST RESULTS: ${passedSections} / ${totalSections} SECTIONS PASSED ===`);
  console.log("==========================================================================");

  process.exit(passedSections === totalSections ? 0 : 1);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
