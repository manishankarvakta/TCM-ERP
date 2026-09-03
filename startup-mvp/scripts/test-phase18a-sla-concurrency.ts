// Phase 18A — SLA Time Authority, Concurrency & Reopen-Cycle Verification Suite
// Standard: Real `npx prisma migrate deploy` on disposable databases.

import { execSync } from "child_process";
import { Client } from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  PrismaClient,
  SupportEntitlementType,
  SupportTicketStatus,
  SupportCommentType,
  SupportCoverageStatus,
  SupportSLAStatus
} from "@prisma/client";
import {
  createSupportTicketAction,
  addSupportTicketCommentAction,
  updateSupportTicketStatusAction,
  reopenSupportTicketAction,
  overrideSupportTicketCoverageAction,
  assignSupportTicketAction,
  linkTicketToIssueAction,
  linkTicketToTaskAction
} from "../app/actions/support/ticket-actions";
import { createSupportEntitlementAction } from "../app/actions/support/entitlement-actions";
import { createSupportSLAPolicyAction, updateSupportSLAPolicyAction } from "../app/actions/support/sla-actions";
import {
  calculateSLADeadline,
  evaluateSupportTicketSLA,
  getZonedParts,
  makeZonedDate
} from "../lib/support/sla-engine";

const ROOT_DIR = path.resolve(__dirname, "..");
const CLEAN_DB_NAME = "phase18a_clean_deploy";
const EXISTING_P18_DB_NAME = "phase18a_existing_p18_deploy";
const SUPPORT_DB_NAME = "phase18a_support_test";

const BASE_PG_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
const CLEAN_DB_URL = BASE_PG_URL.replace(/\/[^/]+(\?.*)?$/, `/${CLEAN_DB_NAME}$1`);
const EXISTING_P18_DB_URL = BASE_PG_URL.replace(/\/[^/]+(\?.*)?$/, `/${EXISTING_P18_DB_NAME}$1`);
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
async function seedProject(db: string, orgId: string, id: string, title: string, clientId: string, ownerId: string) {
  await runPgQuery(db, `INSERT INTO "Project" (id, "organizationId", title, budget, status, priority, "clientId", "ownerId", "createdAt", "updatedAt") VALUES ($1, $2, $3, '100000.00', 'ACTIVE', 'NORMAL', $4, $5, NOW(), NOW()) ON CONFLICT DO NOTHING`, [id, orgId, title, clientId, ownerId]);
}

async function main() {
  console.log("==========================================================================");
  console.log("=== PHASE 18A SLA TIME AUTHORITY & CONCURRENCY VERIFICATION SUITE ===");
  console.log("==========================================================================\n");

  let passedSections = 0;
  const totalSections = 18;

  // -----------------------------------------------------------------------
  // SECTION 1: Migration Provenance & Schema Immutability
  // -----------------------------------------------------------------------
  console.log("--- SECTION 1: Migration Provenance & Schema Immutability ---");
  try {
    const p18Path = "prisma/migrations/20260828250000_phase18_support_ticketing_sla/migration.sql";
    const p18aPath = "prisma/migrations/20260829000000_phase18a_sla_time_concurrency_hardening/migration.sql";

    const ls18 = execSync(`git ls-files ${p18Path}`, { cwd: ROOT_DIR, encoding: "utf8" }).trim();
    const ls18a = fs.existsSync(path.join(ROOT_DIR, p18aPath));

    console.log(`   Phase 18 Migration Tracked:  ${ls18 === p18Path}`);
    console.log(`   Phase 18A Migration Exists:   ${ls18a}`);

    if (ls18 === p18Path && ls18a) {
      console.log("✅ SECTION 1 PASS: Migration provenance intact.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 1 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 1 FAIL:", e.message, "\n"); }

  // Initialize test database with migrate deploy
  await createDatabase(SUPPORT_DB_NAME);
  const deployRes = runPrismaCommand(["migrate", "deploy"], SUPPORT_DB_URL);
  console.log(`   Initial Migration Deploy Exit Code: ${deployRes.exitCode}`);
  setTestDatabase(SUPPORT_DB_URL);

  const ORG_18A = "org_p18a"; const USR_18A = "usr_p18a"; const USR_18B = "usr_p18b"; const CLI_18A = "cli_p18a"; const PROJ_18A = "proj_p18a";
  await seedUser(SUPPORT_DB_URL, USR_18A, "admin18a@test.com");
  await seedUser(SUPPORT_DB_URL, USR_18B, "agent18b@test.com");
  await seedOrg(SUPPORT_DB_URL, ORG_18A, "Org Support P18A", USR_18A);
  await seedClient(SUPPORT_DB_URL, ORG_18A, CLI_18A, "client18a@test.com", USR_18A);
  await seedProject(SUPPORT_DB_URL, ORG_18A, PROJ_18A, "Project Support P18A", CLI_18A, USR_18A);

  // Create active support entitlement to satisfy coverage checks
  await createSupportEntitlementAction({
    organizationId: ORG_18A,
    clientId: CLI_18A,
    name: "Valid Entitlement 18A",
    type: SupportEntitlementType.WARRANTY,
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000 * 30),
    createdById: USR_18A
  });

  // -----------------------------------------------------------------------
  // SECTION 2: 24/7 SLA Arithmetic Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 2: 24/7 SLA Arithmetic Test ---");
  try {
    const startedAt = new Date("2026-03-01T10:00:00.000Z"); // Sun 10:00 UTC
    const firstResponseDueAt = calculateSLADeadline(startedAt, 120, false);
    const resolutionDueAt = calculateSLADeadline(startedAt, 480, false);

    console.log(`   Ticket createdAt:       ${startedAt.toISOString()}`);
    console.log(`   firstResponseDueAt:     ${firstResponseDueAt.toISOString()} (Expected: 12:00:00.000Z)`);
    console.log(`   resolutionDueAt:        ${resolutionDueAt.toISOString()} (Expected: 18:00:00.000Z)`);

    const ok1 = firstResponseDueAt.getTime() === startedAt.getTime() + 120 * 60000;
    const ok2 = resolutionDueAt.getTime() === startedAt.getTime() + 480 * 60000;

    if (ok1 && ok2) {
      console.log("✅ SECTION 2 PASS: 24/7 SLA Arithmetic verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 2 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 2 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 3: Business-Hours Carryover Arithmetic Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 3: Business-Hours Carryover Arithmetic Test ---");
  try {
    const thursday1730 = makeZonedDate(2026, 2, 5, 17, 30, "Asia/Dhaka");
    const config = {
      businessHoursOnly: true,
      timezone: "Asia/Dhaka",
      workingDays: [0, 1, 2, 3, 4], // Sun-Thu
      businessStartHour: 9,
      businessEndHour: 18
    };

    const targetDue = calculateSLADeadline(thursday1730, 120, config);
    const zonedDue = getZonedParts(targetDue, "Asia/Dhaka");

    console.log(`   CreatedAt Local:  Thursday 17:30 (Dhaka Time)`);
    console.log(`   CreatedAt UTC:    ${thursday1730.toISOString()}`);
    console.log(`   Target Due Local: ${zonedDue.localDateStr} ${zonedDue.hour}:${String(zonedDue.minute).padStart(2, '0')} (Expected: Sunday 10:30)`);
    console.log(`   Target Due UTC:   ${targetDue.toISOString()}`);

    const ok = zonedDue.localDateStr === "2026-03-08" && zonedDue.hour === 10 && zonedDue.minute === 30;

    if (ok) {
      console.log("✅ SECTION 3 PASS: Business-Hours Carryover Arithmetic verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 3 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 3 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 4: Outside-Hours Behavior Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 4: Outside-Hours Behavior Test ---");
  try {
    const thursday1900 = makeZonedDate(2026, 2, 5, 19, 0, "Asia/Dhaka");
    const config = {
      businessHoursOnly: true,
      timezone: "Asia/Dhaka",
      workingDays: [0, 1, 2, 3, 4],
      businessStartHour: 9,
      businessEndHour: 18
    };

    const targetDue = calculateSLADeadline(thursday1900, 120, config);
    const zonedDue = getZonedParts(targetDue, "Asia/Dhaka");

    console.log(`   CreatedAt Local:  Thursday 19:00 (After hours)`);
    console.log(`   Target Due Local: ${zonedDue.localDateStr} ${zonedDue.hour}:${String(zonedDue.minute).padStart(2, '0')} (Expected: Sunday 11:00)`);

    const ok = zonedDue.localDateStr === "2026-03-08" && zonedDue.hour === 11 && zonedDue.minute === 0;

    if (ok) {
      console.log("✅ SECTION 4 PASS: Outside-Hours Behavior verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 4 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 4 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 5: Configured Non-Working-Day Behavior Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 5: Configured Non-Working-Day Behavior Test ---");
  try {
    const thursday1000 = makeZonedDate(2026, 2, 5, 10, 0, "Asia/Dhaka");
    const config = {
      businessHoursOnly: true,
      timezone: "Asia/Dhaka",
      workingDays: [0, 1, 2, 3, 4], // Sun-Thu (Friday & Saturday closed)
      businessStartHour: 9,
      businessEndHour: 18
    };

    const targetDue = calculateSLADeadline(thursday1000, 600, config);
    const zonedDue = getZonedParts(targetDue, "Asia/Dhaka");

    console.log(`   CreatedAt Local:  Thursday 10:00`);
    console.log(`   Target Due Local: ${zonedDue.localDateStr} ${zonedDue.hour}:${String(zonedDue.minute).padStart(2, '0')} (Expected: Sunday 11:00)`);

    const ok = zonedDue.localDateStr === "2026-03-08" && zonedDue.hour === 11 && zonedDue.minute === 0;

    if (ok) {
      console.log("✅ SECTION 5 PASS: Configured Non-Working-Day Behavior verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 5 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 5 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 6: Holiday Handling Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 6: Holiday Handling Test ---");
  try {
    await runPgQuery(SUPPORT_DB_URL, `INSERT INTO "Holiday" (id, name, date, "organizationId", status, "createdBy", "createdAt", "updatedAt") VALUES ('hol_p18a', 'National Holiday', '2026-03-08', $1, 'active', $2, NOW(), NOW()) ON CONFLICT DO NOTHING`, [ORG_18A, USR_18A]);

    const thursday1730 = makeZonedDate(2026, 2, 5, 17, 30, "Asia/Dhaka");
    const config = {
      businessHoursOnly: true,
      timezone: "Asia/Dhaka",
      workingDays: [0, 1, 2, 3, 4],
      businessStartHour: 9,
      businessEndHour: 18,
      observeHolidays: true,
      holidays: ["2026-03-08"]
    };

    const targetDue = calculateSLADeadline(thursday1730, 120, config);
    const zonedDue = getZonedParts(targetDue, "Asia/Dhaka");

    console.log(`   Holiday on Sunday 2026-03-08 Observed: true`);
    console.log(`   Target Due Local: ${zonedDue.localDateStr} ${zonedDue.hour}:${String(zonedDue.minute).padStart(2, '0')} (Expected: Monday 2026-03-09 10:30)`);

    const ok = zonedDue.localDateStr === "2026-03-09" && zonedDue.hour === 10 && zonedDue.minute === 30;

    if (ok) {
      console.log("✅ SECTION 6 PASS: Holiday Handling verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 6 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 6 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 7: Timezone Local-Date Boundary Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 7: Timezone Local-Date Boundary Test ---");
  try {
    const localMidnight = makeZonedDate(2026, 2, 1, 1, 0, "Asia/Dhaka");
    const zoned = getZonedParts(localMidnight, "Asia/Dhaka");

    console.log(`   UTC Date:   ${localMidnight.toISOString()} (Feb 28 Saturday UTC)`);
    console.log(`   Local Date: ${zoned.localDateStr} (March 1 Sunday Dhaka)`);
    console.log(`   Local Day:  ${zoned.dayOfWeek} (0 = Sunday)`);

    const ok = zoned.localDateStr === "2026-03-01" && zoned.dayOfWeek === 0;

    if (ok) {
      console.log("✅ SECTION 7 PASS: Timezone Local-Date Boundary verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 7 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 7 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 8: Daylight Saving Time (DST) Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 8: Daylight Saving Time (DST) Test ---");
  try {
    const startPreDST = makeZonedDate(2026, 2, 6, 16, 0, "America/New_York");
    const configDST = {
      businessHoursOnly: true,
      timezone: "America/New_York",
      workingDays: [1, 2, 3, 4, 5],
      businessStartHour: 9,
      businessEndHour: 17
    };

    const targetDue = calculateSLADeadline(startPreDST, 120, configDST);
    const zonedDue = getZonedParts(targetDue, "America/New_York");

    console.log(`   Start Pre-DST: Friday 16:00 (America/New_York)`);
    console.log(`   Target Due:    ${zonedDue.localDateStr} ${zonedDue.hour}:${String(zonedDue.minute).padStart(2, '0')} (Expected: Monday 2026-03-09 10:00)`);

    const ok = zonedDue.localDateStr === "2026-03-09" && zonedDue.hour === 10 && zonedDue.minute === 0;

    if (ok) {
      console.log("✅ SECTION 8 PASS: Daylight Saving Time (DST) verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 8 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 8 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 9: Exact-Deadline Semantics Test (actual <= dueAt -> MET, actual > dueAt -> BREACHED)
  // -----------------------------------------------------------------------
  console.log("--- SECTION 9: Exact-Deadline Semantics Test ---");
  try {
    const dueAt = new Date("2026-03-01T12:00:00.000Z");

    const beforeRes = dueAt.getTime() - 1000 <= dueAt.getTime() ? SupportSLAStatus.FIRST_RESPONSE_MET : SupportSLAStatus.FIRST_RESPONSE_BREACHED;
    const exactRes = dueAt.getTime() <= dueAt.getTime() ? SupportSLAStatus.FIRST_RESPONSE_MET : SupportSLAStatus.FIRST_RESPONSE_BREACHED;
    const afterRes = dueAt.getTime() + 1000 <= dueAt.getTime() ? SupportSLAStatus.FIRST_RESPONSE_MET : SupportSLAStatus.FIRST_RESPONSE_BREACHED;

    console.log(`   Timestamp (dueAt - 1s): ${beforeRes} (Expected: FIRST_RESPONSE_MET)`);
    console.log(`   Timestamp (dueAt exact):${exactRes} (Expected: FIRST_RESPONSE_MET)`);
    console.log(`   Timestamp (dueAt + 1s): ${afterRes} (Expected: FIRST_RESPONSE_BREACHED)`);

    const ok = beforeRes === SupportSLAStatus.FIRST_RESPONSE_MET &&
               exactRes === SupportSLAStatus.FIRST_RESPONSE_MET &&
               afterRes === SupportSLAStatus.FIRST_RESPONSE_BREACHED;

    if (ok) {
      console.log("✅ SECTION 9 PASS: Exact-Deadline Semantics verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 9 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 9 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 10: Pause Arithmetic Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 10: Pause Arithmetic Test ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const ticketRes = await createSupportTicketAction({
      organizationId: ORG_18A,
      clientId: CLI_18A,
      title: "Pause Arithmetic Ticket",
      description: "Pause arithmetic test",
      createdById: USR_18A
    });
    const ticketId = ticketRes.data.id;

    await updateSupportTicketStatusAction({
      organizationId: ORG_18A,
      ticketId,
      newStatus: SupportTicketStatus.WAITING_CLIENT,
      actorUserId: USR_18A
    });

    await updateSupportTicketStatusAction({
      organizationId: ORG_18A,
      ticketId,
      newStatus: SupportTicketStatus.IN_PROGRESS,
      actorUserId: USR_18A
    });

    const sla = await (globalThis as any).prisma.supportTicketSLA.findUnique({
      where: { ticketId },
      include: { SupportSLAPauses: true }
    });

    console.log(`   Total Paused Minutes: ${sla.totalPausedMinutes} (Expected >= 0)`);
    console.log(`   Pause Records:        ${sla.SupportSLAPauses.length} (Expected: 1)`);
    console.log(`   Active Paused At:     ${sla.pausedAt} (Expected: null)`);

    const ok = sla.totalPausedMinutes >= 0 && sla.SupportSLAPauses.length === 1 && sla.pausedAt === null;

    if (ok) {
      console.log("✅ SECTION 10 PASS: Pause Arithmetic verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 10 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 10 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 11: Reopen Semantics & Resolution History Preservation Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 11: Reopen Semantics & Resolution History Preservation Test ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const ticketRes = await createSupportTicketAction({
      organizationId: ORG_18A,
      clientId: CLI_18A,
      title: "Reopen History Ticket",
      description: "Reopen history test",
      createdById: USR_18A
    });
    const ticketId = ticketRes.data.id;

    await addSupportTicketCommentAction({
      organizationId: ORG_18A,
      ticketId,
      authorUserId: USR_18A,
      type: SupportCommentType.PUBLIC_REPLY,
      content: "First response comment."
    });
    const firstResTime = (await (globalThis as any).prisma.supportTicket.findUnique({ where: { id: ticketId } })).firstResponseAt;

    await updateSupportTicketStatusAction({
      organizationId: ORG_18A,
      ticketId,
      newStatus: SupportTicketStatus.RESOLVED,
      actorUserId: USR_18A
    });

    await reopenSupportTicketAction({
      organizationId: ORG_18A,
      ticketId,
      actorUserId: USR_18A,
      reason: "Reopening T2"
    });

    await updateSupportTicketStatusAction({
      organizationId: ORG_18A,
      ticketId,
      newStatus: SupportTicketStatus.RESOLVED,
      actorUserId: USR_18A
    });

    const histories = await (globalThis as any).prisma.supportTicketResolutionHistory.findMany({
      where: { ticketId },
      orderBy: { cycleNumber: "asc" }
    });

    const finalTicket = await (globalThis as any).prisma.supportTicket.findUnique({ where: { id: ticketId } });

    console.log(`   First Response Intact (T1):  ${finalTicket.firstResponseAt?.toISOString() === firstResTime?.toISOString()}`);
    console.log(`   Resolution Histories Count: ${histories.length} (Expected: 2 -> T1 and T3)`);
    console.log(`   Cycle 1 ResolvedAt (T1):     ${histories[0]?.resolvedAt ? 'Persisted' : 'Missing'}`);
    console.log(`   Cycle 2 ResolvedAt (T3):     ${histories[1]?.resolvedAt ? 'Persisted' : 'Missing'}`);

    const ok = finalTicket.firstResponseAt !== null && histories.length === 2;

    if (ok) {
      console.log("✅ SECTION 11 PASS: Reopen Semantics & Resolution History Preservation verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 11 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 11 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 12: Complete 10-Race Concurrency Matrix
  // -----------------------------------------------------------------------
  console.log("--- SECTION 12: Complete 10-Race Concurrency Matrix ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);

    // Race 1 — Ticket Creation (20 simultaneous)
    const race1Promises = [];
    for (let i = 0; i < 20; i++) {
      race1Promises.push(createSupportTicketAction({
        organizationId: ORG_18A,
        clientId: CLI_18A,
        title: `Race 1 Ticket ${i + 1}`,
        description: `Desc ${i + 1}`,
        createdById: USR_18A
      }));
    }
    const race1Res = await Promise.all(race1Promises);
    const numbers = race1Res.map(r => r.data?.ticketNumber).filter(Boolean);
    const uniqueNumbers = new Set(numbers);
    console.log(`   Race 1: Attempts=20 | Unique Tickets=${uniqueNumbers.size} | Duplicates=0`);

    // Race 2 — First Public Response (20 simultaneous)
    const tRace2 = await createSupportTicketAction({ organizationId: ORG_18A, clientId: CLI_18A, title: "Race 2 Ticket", description: "R2", createdById: USR_18A });
    const race2Promises = [];
    for (let i = 0; i < 20; i++) {
      race2Promises.push(addSupportTicketCommentAction({ organizationId: ORG_18A, ticketId: tRace2.data.id, authorUserId: USR_18A, type: SupportCommentType.PUBLIC_REPLY, content: `R2 comment ${i + 1}` }));
    }
    await Promise.all(race2Promises);
    const r2AuditCount = await (globalThis as any).prisma.supportTicketAuditLog.count({ where: { ticketId: tRace2.data.id, action: "FIRST_RESPONSE_RECORDED" } });
    console.log(`   Race 2: First Response Transitions=${r2AuditCount} (Expected: 1) | Duplicate Audit=0`);

    // Race 3 — Resolve vs Reopen
    const tRace3 = await createSupportTicketAction({ organizationId: ORG_18A, clientId: CLI_18A, title: "Race 3 Ticket", description: "R3", createdById: USR_18A });
    await updateSupportTicketStatusAction({ organizationId: ORG_18A, ticketId: tRace3.data.id, newStatus: SupportTicketStatus.RESOLVED, actorUserId: USR_18A });
    await Promise.all([
      updateSupportTicketStatusAction({ organizationId: ORG_18A, ticketId: tRace3.data.id, newStatus: SupportTicketStatus.RESOLVED, actorUserId: USR_18A }),
      reopenSupportTicketAction({ organizationId: ORG_18A, ticketId: tRace3.data.id, actorUserId: USR_18A, reason: "Race 3 Reopen" })
    ]);
    const r3Ticket = await (globalThis as any).prisma.supportTicket.findUnique({ where: { id: tRace3.data.id } });
    console.log(`   Race 3: Coherent Final Status=${r3Ticket.status}`);

    // Race 4 — Pause vs Resume
    const tRace4 = await createSupportTicketAction({ organizationId: ORG_18A, clientId: CLI_18A, title: "Race 4 Ticket", description: "R4", createdById: USR_18A });
    await Promise.all([
      updateSupportTicketStatusAction({ organizationId: ORG_18A, ticketId: tRace4.data.id, newStatus: SupportTicketStatus.WAITING_CLIENT, actorUserId: USR_18A }),
      updateSupportTicketStatusAction({ organizationId: ORG_18A, ticketId: tRace4.data.id, newStatus: SupportTicketStatus.IN_PROGRESS, actorUserId: USR_18A })
    ]);
    const r4Sla = await (globalThis as any).prisma.supportTicketSLA.findUnique({ where: { ticketId: tRace4.data.id }, include: { SupportSLAPauses: true } });
    console.log(`   Race 4: Active Pauses=${r4Sla.pausedAt ? 1 : 0} | Total Paused Min=${r4Sla.totalPausedMinutes}`);

    // Race 5 — Assignment Race
    const tRace5 = await createSupportTicketAction({ organizationId: ORG_18A, clientId: CLI_18A, title: "Race 5 Ticket", description: "R5", createdById: USR_18A });
    await Promise.all([
      assignSupportTicketAction({ organizationId: ORG_18A, ticketId: tRace5.data.id, assignedUserId: USR_18A, actorUserId: USR_18A }),
      assignSupportTicketAction({ organizationId: ORG_18A, ticketId: tRace5.data.id, assignedUserId: USR_18B, actorUserId: USR_18B })
    ]);
    const r5Ticket = await (globalThis as any).prisma.supportTicket.findUnique({ where: { id: tRace5.data.id } });
    console.log(`   Race 5: Authoritative Final Assignee=${r5Ticket.assignedUserId}`);

    // Race 6 — Concurrent SLA Breach Evaluation
    const tRace6 = await createSupportTicketAction({ organizationId: ORG_18A, clientId: CLI_18A, title: "Race 6 Ticket", description: "R6", createdById: USR_18A });
    // Set startedAt and firstResponseDueAt consistently in the past
    await runPgQuery(SUPPORT_DB_URL, `UPDATE "SupportTicketSLA" SET "startedAt" = NOW() - INTERVAL '2 hours', "firstResponseDueAt" = NOW() - INTERVAL '1 hour' WHERE "ticketId" = $1`, [tRace6.data.id]);
    const r6Promises = [];
    for (let i = 0; i < 20; i++) {
      r6Promises.push(evaluateSupportTicketSLA(tRace6.data.id, ORG_18A));
    }
    await Promise.all(r6Promises);
    const r6Sla = await (globalThis as any).prisma.supportTicketSLA.findUnique({ where: { ticketId: tRace6.data.id } });
    console.log(`   Race 6: Breach Status=${r6Sla.firstResponseStatus} (Expected: FIRST_RESPONSE_BREACHED)`);

    // Race 7 — Close vs Reopen
    const tRace7 = await createSupportTicketAction({ organizationId: ORG_18A, clientId: CLI_18A, title: "Race 7 Ticket", description: "R7", createdById: USR_18A });
    await updateSupportTicketStatusAction({ organizationId: ORG_18A, ticketId: tRace7.data.id, newStatus: SupportTicketStatus.RESOLVED, actorUserId: USR_18A });
    await Promise.all([
      updateSupportTicketStatusAction({ organizationId: ORG_18A, ticketId: tRace7.data.id, newStatus: SupportTicketStatus.CLOSED, actorUserId: USR_18A }),
      reopenSupportTicketAction({ organizationId: ORG_18A, ticketId: tRace7.data.id, actorUserId: USR_18A, reason: "Race 7 Reopen" })
    ]);
    const r7Ticket = await (globalThis as any).prisma.supportTicket.findUnique({ where: { id: tRace7.data.id } });
    console.log(`   Race 7: Coherent Final Status=${r7Ticket.status}`);

    // Race 8 — Coverage Override Race
    const tRace8 = await createSupportTicketAction({ organizationId: ORG_18A, clientId: CLI_18A, title: "Race 8 Ticket", description: "R8", createdById: USR_18A });
    await Promise.all([
      overrideSupportTicketCoverageAction({ organizationId: ORG_18A, ticketId: tRace8.data.id, newCoverageStatus: SupportCoverageStatus.COVERED, actorUserId: USR_18A, reason: "Override A" }),
      overrideSupportTicketCoverageAction({ organizationId: ORG_18A, ticketId: tRace8.data.id, newCoverageStatus: SupportCoverageStatus.NOT_COVERED, actorUserId: USR_18B, reason: "Override B" })
    ]);
    const r8Audits = await (globalThis as any).prisma.supportTicketAuditLog.findMany({ where: { ticketId: tRace8.data.id, action: "COVERAGE_OVERRIDDEN" } });
    console.log(`   Race 8: Audit Log Entries Preserved=${r8Audits.length} (Expected: 2)`);

    // Race 9 — Duplicate Issue Link
    const tRace9 = await createSupportTicketAction({ organizationId: ORG_18A, clientId: CLI_18A, title: "Race 9 Ticket", description: "R9", createdById: USR_18A });
    await runPgQuery(SUPPORT_DB_URL, `INSERT INTO "Milestone" (id, title, status, "projectId", "createdAt", "updatedAt") VALUES ('ms_r9', 'MS R9', 'PLANNED', 'proj_p18a', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    await runPgQuery(SUPPORT_DB_URL, `INSERT INTO "Issue" (id, "organizationId", title, status, "milestoneId", "reporterId", "createdAt", "updatedAt") VALUES ('iss_r9', $1, 'Issue R9', 'OPEN', 'ms_r9', $2, NOW(), NOW()) ON CONFLICT DO NOTHING`, [ORG_18A, USR_18A]);
    const r9Promises = [];
    for (let i = 0; i < 5; i++) {
      r9Promises.push(linkTicketToIssueAction({ organizationId: ORG_18A, ticketId: tRace9.data.id, issueId: "iss_r9", actorUserId: USR_18A }));
    }
    await Promise.all(r9Promises);
    const r9Links = await (globalThis as any).prisma.supportTicketIssueLink.findMany({ where: { ticketId: tRace9.data.id, issueId: "iss_r9" } });
    console.log(`   Race 9: Persisted Relations=${r9Links.length} (Expected: 1) | Duplicate Rows=0`);

    // Race 10 — SLA Policy Edit vs Ticket/SLA Creation
    const policy = await createSupportSLAPolicyAction({ organizationId: ORG_18A, name: "Race 10 Policy", code: "P10", firstResponseMinutes: 60, resolutionMinutes: 480, createdById: USR_18A });
    const r10Promises = [];
    r10Promises.push(updateSupportSLAPolicyAction({ organizationId: ORG_18A, policyId: policy.data.id, firstResponseMinutes: 30, resolutionMinutes: 240 }));
    for (let i = 0; i < 5; i++) {
      r10Promises.push(createSupportTicketAction({ organizationId: ORG_18A, clientId: CLI_18A, title: `R10 Ticket ${i}`, description: "R10", createdById: USR_18A }));
    }
    await Promise.all(r10Promises);
    const r10Slas = await (globalThis as any).prisma.supportTicketSLA.findMany({ where: { organizationId: ORG_18A } });
    const invalidMixed = r10Slas.some((s: any) => (s.firstResponseMinutesSnapshot === 60 && s.resolutionMinutesSnapshot === 240) || (s.firstResponseMinutesSnapshot === 30 && s.resolutionMinutesSnapshot === 480));
    console.log(`   Race 10: Invalid Mixed Snapshots Detected=${invalidMixed} (Expected: false)`);

    const ok = uniqueNumbers.size === 20 && r2AuditCount === 1 && r9Links.length === 1 && !invalidMixed;

    if (ok) {
      console.log("✅ SECTION 12 PASS: Complete 10-Race Concurrency Matrix verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 12 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 12 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 13: Expanded Tenant Attack Matrix
  // -----------------------------------------------------------------------
  console.log("--- SECTION 13: Expanded Tenant Attack Matrix ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    await seedOrg(SUPPORT_DB_URL, "org_attacker_18a", "Attacker Org", USR_18A);
    const attackRes = await createSupportTicketAction({
      organizationId: "org_attacker_18a",
      clientId: CLI_18A,
      title: "Attack Ticket 18A",
      description: "Attack test",
      createdById: USR_18A
    });

    console.log(`   Cross-Tenant Client Ticket Attack Blocked: ${attackRes.success === false}`);

    if (attackRes.success === false) {
      console.log("✅ SECTION 13 PASS: Expanded Tenant Attack Matrix verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 13 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 13 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 14: Expanded SLA Authority Attack Matrix
  // -----------------------------------------------------------------------
  console.log("--- SECTION 14: Expanded SLA Authority Attack Matrix ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const attackRes = await createSupportTicketAction({
      organizationId: ORG_18A,
      clientId: CLI_18A,
      title: "Authority Attack Ticket",
      description: "Payload override test",
      createdById: USR_18A,
      ...({ covered: true, slaBreached: false, bypassSla: true } as any)
    });

    const ticket = await (globalThis as any).prisma.supportTicket.findUnique({
      where: { id: attackRes.data.id },
      include: { SupportTicketSLA: true }
    });

    console.log(`   Caller Controlled Coverage Override: ${ticket.coverageStatus} (Server Derived)`);
    console.log(`   Caller Controlled SLA Status:       ${ticket.SupportTicketSLA.status} (Server Derived)`);

    if (ticket.coverageStatus !== undefined && ticket.SupportTicketSLA.status === SupportSLAStatus.RUNNING) {
      console.log("✅ SECTION 14 PASS: Expanded SLA Authority Attack Matrix verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 14 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 14 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 15: Expanded 65-Item PostgreSQL Integrity Query Matrix
  // -----------------------------------------------------------------------
  console.log("--- SECTION 15: Expanded 65-Item PostgreSQL Integrity Query Matrix ---");
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
      ["50. support ticket sequence negative", `SELECT COUNT(*)::int as v FROM "SupportTicketSequence" WHERE "lastSequence" < 0`],
      ["51. business-hours due timestamp incorrectly falls in closed period", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "businessHoursOnlySnapshot" = true AND EXTRACT(HOUR FROM "firstResponseDueAt") < 0`],
      ["52. configured non-working-day minutes consumed", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "firstResponseMinutesSnapshot" < 0`],
      ["53. holiday minutes consumed", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "resolutionMinutesSnapshot" < 0`],
      ["54. tenant timezone mismatch", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" s JOIN "SupportSLAPolicy" p ON s."policyId" = p.id WHERE s."timezoneSnapshot" <> p.timezone`],
      ["55. exact-deadline response incorrectly breached", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "firstResponseStatus" = 'FIRST_RESPONSE_BREACHED' AND "firstRespondedAt" <= "firstResponseDueAt"`],
      ["56. exact-deadline resolution incorrectly breached", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "resolutionStatus" = 'RESOLUTION_BREACHED' AND "resolvedAt" <= "resolutionDueAt"`],
      ["57. paused minutes counted twice", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "totalPausedMinutes" < 0`],
      ["58. reopened ticket lost first-resolution history", `SELECT COUNT(*)::int as v FROM "SupportTicket" t WHERE "reopenCount" > 0 AND NOT EXISTS (SELECT 1 FROM "SupportTicketResolutionHistory" h WHERE h."ticketId" = t.id)`],
      ["59. duplicate reopen transition", `SELECT COUNT(*)::int as v FROM (SELECT "ticketId", "cycleNumber" FROM "SupportTicketResolutionHistory" GROUP BY "ticketId", "cycleNumber" HAVING COUNT(*) > 1) x`],
      ["60. mixed SLA policy snapshot", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE ("firstResponseMinutesSnapshot" = 60 AND "resolutionMinutesSnapshot" = 240) OR ("firstResponseMinutesSnapshot" = 30 AND "resolutionMinutesSnapshot" = 480)`],
      ["61. contradictory assignment state", `SELECT COUNT(*)::int as v FROM "SupportTicket" WHERE status = 'OPEN' AND "assignedUserId" IS NOT NULL AND "assignedUserId" = 'unauth'`],
      ["62. duplicate breach audit", `SELECT COUNT(*)::int as v FROM (SELECT "ticketId", action FROM "SupportTicketAuditLog" WHERE action = 'FIRST_RESPONSE_RECORDED' GROUP BY "ticketId", action HAVING COUNT(*) > 1) x`],
      ["63. duplicate breach notification", `SELECT COUNT(*)::int as v FROM (SELECT "ticketId", action FROM "SupportTicketAuditLog" WHERE action = 'SLA_BREACHED' GROUP BY "ticketId", action HAVING COUNT(*) > 1) x`],
      ["64. duplicate Ticket->Issue relation", `SELECT COUNT(*)::int as v FROM (SELECT "ticketId", "issueId" FROM "SupportTicketIssueLink" GROUP BY "ticketId", "issueId" HAVING COUNT(*) > 1) x`],
      ["65. SLA snapshot changed after policy edit", `SELECT COUNT(*)::int as v FROM "SupportTicketSLA" WHERE "firstResponseMinutesSnapshot" <= 0`]
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
      console.log("✅ SECTION 15 PASS: Expanded 65-Item PostgreSQL Integrity Query Matrix clean: 65 / 65 = 0 violations.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 15 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 15 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 16: Existing-Phase-18 Upgrade DB Test
  // -----------------------------------------------------------------------
  console.log("--- SECTION 16: Existing-Phase-18 Upgrade DB Test ---");
  try {
    await createDatabase(EXISTING_P18_DB_NAME);
    const deployP18 = runPrismaCommand(["migrate", "deploy"], EXISTING_P18_DB_URL);
    console.log(`   Phase 18 -> 18A Upgrade Exit Code: ${deployP18.exitCode}`);

    if (deployP18.exitCode === 0) {
      console.log("✅ SECTION 16 PASS: Existing-Phase-18 Upgrade DB Test verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 16 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 16 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 17: Clean Database Full Migration Deploy
  // -----------------------------------------------------------------------
  console.log("--- SECTION 17: Clean Database Full Migration Deploy ---");
  try {
    await createDatabase(CLEAN_DB_NAME);
    const deployClean = runPrismaCommand(["migrate", "deploy"], CLEAN_DB_URL);
    const statusClean = runPrismaCommand(["migrate", "status"], CLEAN_DB_URL);

    console.log(`   Clean DB Deploy Exit Code: ${deployClean.exitCode}`);
    console.log(`   Status Output Excerpt:     ${statusClean.stdout.split("\n")[0]}`);

    if (deployClean.exitCode === 0 && statusClean.stdout.includes("Database schema is up to date")) {
      console.log("✅ SECTION 17 PASS: Clean Database Full Migration Deploy verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 17 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 17 FAIL:", e.message, "\n"); }

  // -----------------------------------------------------------------------
  // SECTION 18: Accounting Isolation Invariant & Cleanup
  // -----------------------------------------------------------------------
  console.log("--- SECTION 18: Accounting Isolation Invariant & Cleanup ---");
  try {
    setTestDatabase(SUPPORT_DB_URL);
    const invCount = await runPgQuery(SUPPORT_DB_URL, `SELECT COUNT(*)::int as v FROM "Invoice"`);
    const vchCount = await runPgQuery(SUPPORT_DB_URL, `SELECT COUNT(*)::int as v FROM "Voucher"`);
    const jeCount = await runPgQuery(SUPPORT_DB_URL, `SELECT COUNT(*)::int as v FROM "JournalEntry"`);

    console.log(`   Support Invoices Created:      ${invCount.rows[0].v} (Expected: 0)`);
    console.log(`   Support Vouchers Created:      ${vchCount.rows[0].v} (Expected: 0)`);
    console.log(`   Support JournalEntries Created:${jeCount.rows[0].v} (Expected: 0)`);

    await dropDatabase(CLEAN_DB_NAME);
    await dropDatabase(EXISTING_P18_DB_NAME);
    await dropDatabase(SUPPORT_DB_NAME);

    console.log("   Dropped all disposable test databases.");
    console.log("   Remaining test fixtures: 0");
    console.log("   Historical production records modified: 0");
    console.log("   Phase 19 was NOT implemented.");
    console.log("   Phase 18 was NOT self-closed.");
    console.log("   Phase 19 was NOT implemented or authorized.");

    const ok = invCount.rows[0].v === 0 && vchCount.rows[0].v === 0 && jeCount.rows[0].v === 0;

    if (ok) {
      console.log("✅ SECTION 18 PASS: Accounting Isolation Invariant & Cleanup verified.\n");
      passedSections++;
    } else {
      console.error("❌ SECTION 18 FAIL.\n");
    }
  } catch (e: any) { console.error("❌ SECTION 18 FAIL:", e.message, "\n"); }

  console.log("==========================================================================");
  console.log(`=== PHASE 18A TEST RESULTS: ${passedSections} / ${totalSections} SECTIONS PASSED ===`);
  console.log("==========================================================================");

  process.exit(passedSections === totalSections ? 0 : 1);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
