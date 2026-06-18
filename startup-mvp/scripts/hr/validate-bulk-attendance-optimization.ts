/**
 * Validation script for Bulk Attendance Optimization
 * Tests safety, batching, and performance.
 */
import { prisma } from "../../lib/prisma";
import { processBiometricAttendance } from "../../lib/hr/biometric/processor";
import { processBulkAttendance } from "../../app/(dashboard)/dashboard/hr/attendance/_actions/attendance.action";
import { startOfDay } from "date-fns";

async function runTests() {
  console.log("🧪 Starting Bulk Attendance Optimization Validation Tests\n");

  const today = startOfDay(new Date());

  // Use a transaction or test data that we will clean up
  // Get an employee
  const employee = await prisma.employee.findFirst({
    where: { status: "active" },
    include: { shift: true }
  });

  if (!employee) throw new Error("No active employee found for testing.");

  const sessionUser = await prisma.user.findFirst();
  if (!sessionUser) throw new Error("No user found.");

  // Test Case 1: New attendance creation
  console.log("==> Test Case 1: New attendance creation");
  
  // Clean up any existing logs/attendance for today for this employee
  await prisma.attendanceLog.deleteMany({
    where: { employeeId: employee.id, timestamp: { gte: today } }
  });
  await prisma.attendance.deleteMany({
    where: { employeeId: employee.id }
  });

  // Create a log
  await prisma.attendanceLog.create({
    data: {
      employeeId: employee.id,
      timestamp: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9:00 AM
      source: "BIOMETRIC"
    }
  });

  let tempLeaveId: string | null = null;
  let tempHolidayId: string | null = null;

  try {
    const res1 = await processBiometricAttendance(today, today, employee.id);
    if (!res1.success || res1.createdCount !== 1) {
      throw new Error(`Test 1 Failed: Expected 1 created, got ${JSON.stringify(res1)}`);
    }
  console.log("✅ Test Case 1 Passed: New attendance created correctly.");

  // Test Case 2: Existing attendance update
  console.log("\n==> Test Case 2: Existing attendance update");
  
  // Create checkout log
  await prisma.attendanceLog.create({
    data: {
      employeeId: employee.id,
      timestamp: new Date(today.getTime() + 18 * 60 * 60 * 1000), // 6:00 PM
      source: "BIOMETRIC"
    }
  });

  const res2 = await processBiometricAttendance(today, today, employee.id);
  if (!res2.success || res2.updatedCount !== 1) {
    throw new Error(`Test 2 Failed: Expected 1 updated, got ${JSON.stringify(res2)}`);
  }
  console.log("✅ Test Case 2 Passed: Existing attendance updated correctly.");

  // Test Case 3: Locked attendance protection
  console.log("\n==> Test Case 3: Locked attendance protection");
  
  // Lock the attendance
  await prisma.attendance.updateMany({
    where: { employeeId: employee.id },
    data: { isLocked: true }
  });

  // Try processing again
  const res3 = await processBiometricAttendance(today, today, employee.id);
  if (!res3.success || res3.skippedLockedCount !== 1 || res3.updatedCount !== 0) {
    throw new Error(`Test 3 Failed: Expected locked skip, got ${JSON.stringify(res3)}`);
  }
  console.log("✅ Test Case 3 Passed: Locked attendance was skipped.");

  // Test Case 4: Manual attendance protection
  console.log("\n==> Test Case 4: Manual attendance protection");
  
  // Unlock and mark manual
  await prisma.attendance.updateMany({
    where: { employeeId: employee.id },
    data: { isLocked: false, isManual: true }
  });

  const res4 = await processBiometricAttendance(today, today, employee.id);
  if (!res4.success || res4.skippedManualCount !== 1 || res4.updatedCount !== 0) {
    throw new Error(`Test 4 Failed: Expected manual skip, got ${JSON.stringify(res4)}`);
  }
  console.log("✅ Test Case 4 Passed: Manual attendance was preserved/skipped.");

  // Test Case 5: Payroll-posted attendance protection
  console.log("\n==> Test Case 5: Payroll-posted protection");
  // Set isLocked to true to simulate payroll posting
  await prisma.attendance.updateMany({
    where: { employeeId: employee.id },
    data: { isLocked: true, isManual: false }
  });
  const res5 = await processBiometricAttendance(today, today, employee.id);
  if (!res5.success || res5.skippedPayrollCount !== 1) {
    throw new Error(`Test 5 Failed: Expected payroll skip, got ${JSON.stringify(res5)}`);
  }
  console.log("✅ Test Case 5 Passed: Payroll-posted attendance was skipped.");

  // Clean up lock and manual for next test
  await prisma.attendance.deleteMany({
    where: { employeeId: employee.id }
  });

  // Create fake leave application
  const tempLeave = await prisma.leaveApplication.create({
    data: {
      employeeId: employee.id,
      startDate: today,
      endDate: today,
      status: "HR_APPROVED",
      reason: "Test",
      leaveTypeId: (await prisma.leaveType.findFirst())?.id || "fake",
      totalDays: 1,
      createdBy: sessionUser.id
    }
  }).catch(() => null);

  // Test Case 6: Approved leave with no punch
  console.log("\n==> Test Case 6: Approved leave with no punch");
  // Bulk attendance skips leave automatically because an attendance row exists
  await prisma.attendance.create({
    data: {
      employeeId: employee.id,
      date: today,
      status: "LEAVE",
      leaveApplicationId: tempLeave?.id,
      isManual: false
    }
  });
  
  const dateFormatted = today.toISOString().split('T')[0];
  const res6 = await processBulkAttendance(dateFormatted);
  // The bulk process shouldn't override existing rows
  const checkLeave = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } }
  });
  if (checkLeave?.status !== "LEAVE") {
    throw new Error(`Test 6 Failed: Leave was overwritten by bulk process.`);
  }
  console.log("✅ Test Case 6 Passed: Leave attendance remains LEAVE.");

  // Test Case 7: Approved leave with punch
  console.log("\n==> Test Case 7: Approved leave with punch");
  const res7 = await processBiometricAttendance(today, today, employee.id);
  // It shouldn't crash, and should increment conflictCount if tempLeave exists
  if (!res7.success || (tempLeave && res7.conflictCount !== 1)) {
    throw new Error(`Test 7 Failed: Expected conflict, got ${JSON.stringify(res7)}`);
  }
  console.log("✅ Test Case 7 Passed: Leave attendance with punch correctly tracked as conflict.");

  await prisma.attendance.deleteMany({
    where: { employeeId: employee.id }
  });
  if (tempLeave) {
    tempLeaveId = tempLeave.id;
  }

  // Test Case 8: Holiday with no punch
  console.log("\n==> Test Case 8: Holiday with no punch");
  // Create a temporary holiday
  const tempHoliday = await prisma.holiday.create({
    data: {
      name: "Test Holiday",
      date: today,
      createdBy: sessionUser.id
    }
  });
  const res8 = await processBulkAttendance(dateFormatted);
  const checkHoliday = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } }
  });
  if (checkHoliday?.status !== "HOLIDAY") {
    throw new Error(`Test 8 Failed: Holiday was not marked. Status is ${checkHoliday?.status}`);
  }
  console.log("✅ Test Case 8 Passed: Unpunched holiday correctly marked as HOLIDAY.");

  // Clean up holiday and attendance
  tempHolidayId = tempHoliday.id;
  await prisma.attendance.deleteMany({
    where: { employeeId: employee.id }
  });

  // Test Case 9: Weekend/off day with no punch
  console.log("\n==> Test Case 9: Weekend/off day with no punch");
  // Use a known weekend
  const weekendDateStr = "2026-06-13T00:00:00.000Z"; // A Saturday in the past
  const weekendFormatted = "2026-06-13";
  
  // Need to ensure the employee doesn't have existing attendance
  await prisma.attendance.deleteMany({
    where: { employeeId: employee.id }
  });
  

  
  const res9 = await processBulkAttendance(weekendFormatted);
  console.log("RES9", res9);
  const checkWeekend = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: new Date(weekendDateStr) } }
  });
  
  if (checkWeekend?.status !== "WEEKEND") {
    throw new Error(`Test 9 Failed: Weekend was not marked correctly. Got ${checkWeekend?.status}`);
  }
  console.log("✅ Test Case 9 Passed: Unpunched weekend correctly marked as WEEKEND.");

  } finally {
    // Cleanup
    if (tempLeaveId) await prisma.leaveApplication.deleteMany({ where: { id: tempLeaveId } });
    if (tempHolidayId) await prisma.holiday.deleteMany({ where: { id: tempHolidayId } });
    await prisma.attendance.deleteMany({
      where: { employeeId: employee.id }
    });
    await prisma.attendanceLog.deleteMany({
      where: { employeeId: employee.id, timestamp: { gte: today } }
    });
    console.log("\n🧹 Cleanup complete.");
  }
}

runTests().catch(e => {
  console.error("❌ Test Failed:", e);
  process.exit(1);
});
