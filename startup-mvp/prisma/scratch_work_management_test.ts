import { PrismaClient } from "@prisma/client";

let mockUserId = "";
let mockUserRole = "user";

// Configure global mock session getter
Object.defineProperty(global, "mockSession", {
  get: () => {
    if (!mockUserId) return null;
    return {
      user: {
        id: mockUserId,
        name: "Test User",
        email: "test_user_wm@example.com",
        role: mockUserRole,
      },
    };
  },
  configurable: true,
});

// Import the actions
import {
  startWorkSession,
  breakWorkSession,
  resumeWorkSession,
  endWorkSession,
  getCurrentWorkSession,
  getWorkSessionHistory,
} from "../app/actions/projects/work-session.action";

import {
  saveDailyUpdateDraft,
  submitDailyUpdate,
  getDailyUpdate,
  getDailyUpdateHistory,
} from "../app/actions/crm/activity-report.action";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=========================================");
  console.log("🧪 RUNNING WORK MANAGEMENT BACKEND TESTS");
  console.log("=========================================\n");

  // 1. Create a clean test user
  const email = "test_user_wm@example.com";
  await prisma.user.deleteMany({ where: { email } });
  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email,
      password: "password123",
      role: "user",
      status: "active",
    },
  });

  mockUserId = user.id;
  mockUserRole = "user";
  console.log(`✓ Created test user: ${user.name} (ID: ${user.id})`);

  // Ensure timesheets and sessions are clean for today
  const todayStr = new Date().toISOString().split("T")[0];
  console.log(`Today's normalized date: ${todayStr}`);

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: Work Session State Machine
    // ----------------------------------------------------
    console.log("\n--- TEST 1: Work Session State Machine ---");

    // Start session
    console.log("Starting work session...");
    let startRes = await startWorkSession();
    if (!startRes.success || !startRes.session) {
      throw new Error(`Failed to start session: ${startRes.error}`);
    }
    console.log(`✓ Started! Session ID: ${startRes.session.id}, Status: ${startRes.session.status}`);

    // Duplicate Start (Idempotency)
    console.log("Trying to start again (should fail)...");
    let dupStartRes = await startWorkSession();
    if (dupStartRes.success) {
      throw new Error("Duplicate start succeeded, expected failure!");
    }
    console.log(`✓ Duplicate start rejected as expected: "${dupStartRes.error}"`);

    // Take Break
    console.log("Taking break...");
    let breakRes = await breakWorkSession();
    if (!breakRes.success || !breakRes.session) {
      throw new Error(`Failed to take break: ${breakRes.error}`);
    }
    console.log(`✓ Paused! Status: ${breakRes.session.status}, Active duration: ${breakRes.session.totalActiveMs}ms`);

    // Duplicate Break
    console.log("Trying to take break again (should fail)...");
    let dupBreakRes = await breakWorkSession();
    if (dupBreakRes.success) {
      throw new Error("Duplicate break succeeded, expected failure!");
    }
    console.log(`✓ Duplicate break rejected as expected: "${dupBreakRes.error}"`);

    // Resume Session
    console.log("Resuming session...");
    let resumeRes = await resumeWorkSession();
    if (!resumeRes.success || !resumeRes.session) {
      throw new Error(`Failed to resume: ${resumeRes.error}`);
    }
    console.log(`✓ Resumed! Status: ${resumeRes.session.status}, Break duration: ${resumeRes.session.totalBreakMs}ms`);

    // Duplicate Resume
    console.log("Trying to resume again (should fail)...");
    let dupResumeRes = await resumeWorkSession();
    if (dupResumeRes.success) {
      throw new Error("Duplicate resume succeeded, expected failure!");
    }
    console.log(`✓ Duplicate resume rejected as expected: "${dupResumeRes.error}"`);

    // End Session
    console.log("Ending work session...");
    let endRes = await endWorkSession();
    if (!endRes.success || !endRes.session) {
      throw new Error(`Failed to end session: ${endRes.error}`);
    }
    console.log(`✓ Ended! Status: ${endRes.session.status}, Final Active: ${endRes.session.totalActiveMs}ms, Final Break: ${endRes.session.totalBreakMs}ms`);

    // Action on Completed Session
    console.log("Trying to pause a completed session (should fail)...");
    let endBreakRes = await breakWorkSession();
    if (endBreakRes.success) {
      throw new Error("Action on completed session succeeded, expected failure!");
    }
    console.log(`✓ Transition rejected as expected: "${endBreakRes.error}"`);

    // ----------------------------------------------------
    // TEST SUITE 2: Daily Update Immutability
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Daily Work Update Immutability ---");

    // Save Draft
    console.log("Saving daily update draft...");
    let draftRes = await saveDailyUpdateDraft(todayStr, {
      completed: "Task 1",
      pending: "Task 2",
      blocked: "None",
      newWork: "Task 3",
      summary: "Good progress today",
    });
    if (!draftRes.success || !draftRes.report) {
      throw new Error(`Failed to save draft: ${draftRes.error}`);
    }
    console.log(`✓ Draft saved! Status: ${draftRes.report.status}`);

    // Edit Draft
    console.log("Editing daily update draft...");
    let editDraftRes = await saveDailyUpdateDraft(todayStr, {
      completed: "Task 1, Task 1.5",
      summary: "Very good progress today",
    });
    if (!editDraftRes.success || !editDraftRes.report) {
      throw new Error(`Failed to edit draft: ${editDraftRes.error}`);
    }
    console.log(`✓ Draft edited successfully! Completed: "${editDraftRes.report.completed}"`);

    // Submit Daily Update
    console.log("Submitting daily update...");
    let submitRes = await submitDailyUpdate(todayStr, {
      completed: "Task 1, Task 1.5",
      pending: "Task 2",
      blocked: "None",
      newWork: "Task 3",
      summary: "Very good progress today",
    });
    if (!submitRes.success || !submitRes.report) {
      throw new Error(`Failed to submit daily update: ${submitRes.error}`);
    }
    console.log(`✓ Submitted successfully! Status: ${submitRes.report.status}`);

    // Try Editing Submitted Update (Should Fail)
    console.log("Trying to edit submitted report (should fail)...");
    let editSubRes = await saveDailyUpdateDraft(todayStr, {
      completed: "Trying to hijack text",
    });
    if (editSubRes.success) {
      throw new Error("Editing submitted update succeeded, expected failure!");
    }
    console.log(`✓ Edit attempt blocked as expected: "${editSubRes.error}"`);

    // Try Resubmitting Submitted Update (Should Fail)
    console.log("Trying to submit again (should fail)...");
    let resubRes = await submitDailyUpdate(todayStr, {
      completed: "Task 1, Task 1.5",
      pending: "Task 2",
      blocked: "None",
      newWork: "Task 3",
      summary: "Very good progress today",
    });
    if (resubRes.success) {
      throw new Error("Resubmission succeeded, expected failure!");
    }
    console.log(`✓ Resubmission blocked as expected: "${resubRes.error}"`);

    // ----------------------------------------------------
    // TEST SUITE 3: Unauthorized Access Checks
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Authorization Checks ---");

    mockUserId = ""; // Force unauthorized
    console.log("Checking actions with anonymous session...");
    let unauthRes = await getCurrentWorkSession();
    if (unauthRes.success) {
      throw new Error("Anonymous session fetched work session, expected failure!");
    }
    console.log(`✓ Anonymous check blocked as expected: "${unauthRes.error}"`);

    console.log("\n=========================================");
    console.log("🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log("=========================================");

  } catch (error: any) {
    console.error("\n💥 TEST FAILURE:", error.message || error);
    process.exit(1);
  } finally {
    // Cleanup test data
    console.log("\nCleaning up test database records...");
    mockUserId = user.id;
    await prisma.workSessionLog.deleteMany({
      where: {
        WorkSession: { userId: user.id }
      }
    });
    await prisma.workSession.deleteMany({ where: { userId: user.id } });
    await prisma.activityReport.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log("✓ Cleanup finished.");
  }
}

runTests()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
