/**
 * HRM Regression Suite Runner
 * 
 * Runs all validation scripts sequentially, capturing pass/fail,
 * and ensuring basic CI test data is present.
 */

import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SCRIPTS = [
  { name: "Leave Rollback", path: "scripts/hr/validate-leave-rollback.ts" },
  { name: "Payroll Settings Guard", path: "scripts/hr/validate-payroll-settings-guard.ts" },
  { name: "Bulk Attendance", path: "scripts/hr/validate-bulk-attendance-optimization.ts" },
  { name: "Overnight Shifts", path: "scripts/hr/validate-overnight-shift-support.ts" },
  { name: "Payroll Export", path: "scripts/hr/validate-payroll-export-payslip.ts" },
  { name: "MB360 Command Queue", path: "scripts/biometric/validate-mb360-command-queue-hardening.ts" },
  { name: "MB360 ACK Hardening", path: "scripts/biometric/validate-mb360-devicecmd-ack-hardening.ts" }
];

async function setupTestFixtures() {
  console.log("🛠 Setting up HRM regression fixtures...");
  
  // 1. Create a dummy user
  let user = await prisma.user.findFirst({ where: { email: "ci_hrm_test@example.com" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "CI Tester",
        email: "ci_hrm_test@example.com",
        password: "hashed_password",
        role: "admin",
        status: "active"
      }
    });
  }

  // 2. Create a Leave Type
  let leaveType = await prisma.leaveType.findFirst({ where: { name: "TEST_ANNUAL" } });
  if (!leaveType) {
    leaveType = await prisma.leaveType.create({
      data: {
        name: "TEST_ANNUAL",
        category: "ANNUAL",
        defaultDays: 10,
        isPaid: true,
        createdBy: user.id
      }
    });
  }

  // 3. Create a Shift
  let shift = await prisma.shift.findFirst({ where: { name: "TEST_SHIFT" } });
  if (!shift) {
    shift = await prisma.shift.create({
      data: {
        name: "TEST_SHIFT",
        startTime: "09:00",
        endTime: "18:00",
        createdBy: user.id
      }
    });
  }

  // 4. Create an Employee
  let employee = await prisma.employee.findFirst({ where: { employeeCode: "TEST_EMP_001" } });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        name: "John Doe",
        employeeCode: "TEST_EMP_001",
        email: "johndoe_test@example.com",
        phone: "1234567890",
        department: "Engineering",
        designation: "Software Engineer",
        joiningDate: new Date("2020-01-01"),
        salary: 50000,
        status: "active",
        shift: { connect: { id: shift.id } }
      }
    });
  }

  console.log("✅ Fixtures ready.\n");
  return { user, leaveType, shift, employee };
}

async function cleanupTestFixtures() {
  console.log("\n🧹 Cleaning up HRM regression fixtures...");
  await prisma.employee.deleteMany({ where: { employeeCode: "TEST_EMP_001" } });
  await prisma.shift.deleteMany({ where: { name: "TEST_SHIFT" } });
  await prisma.leaveType.deleteMany({ where: { name: "TEST_ANNUAL" } });
  await prisma.user.deleteMany({ where: { email: "ci_hrm_test@example.com" } });
  console.log("✅ Cleanup complete.");
}

async function runSuite() {
  console.log("==========================================");
  console.log("     HRM Regression Test Suite");
  console.log("==========================================\n");

  let setupSuccess = false;
  try {
    await setupTestFixtures();
    setupSuccess = true;
  } catch (err) {
    console.error("❌ Failed to setup test fixtures:", err);
    process.exit(1);
  }

  const results: { name: string; passed: boolean; duration: number }[] = [];
  let allPassed = true;

  for (const script of SCRIPTS) {
    console.log(`▶ Running: ${script.name}...`);
    const startTime = Date.now();
    try {
      // Execute the script synchronously. 
      // tsx is used to run TypeScript files directly.
      execSync(`npx tsx ${script.path}`, { stdio: "inherit" });
      const duration = Date.now() - startTime;
      results.push({ name: script.name, passed: true, duration });
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`\n❌ ${script.name} FAILED!`);
      results.push({ name: script.name, passed: false, duration });
      allPassed = false;
    }
  }

  // Cleanup
  if (setupSuccess) {
    await cleanupTestFixtures();
  }

  // Summary Report
  console.log("\n==========================================");
  console.log("     HRM Regression Suite Summary");
  console.log("==========================================");
  
  for (const res of results) {
    const icon = res.passed ? "✅" : "❌";
    const status = res.passed ? "Passed" : "Failed";
    console.log(`${icon} ${res.name.padEnd(25, " ")} — ${status} (${res.duration}ms)`);
  }

  console.log("\nFinal Result: " + (allPassed ? "PASSED" : "FAILED"));

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error("Unhandled error in test runner:", err);
  process.exit(1);
});
