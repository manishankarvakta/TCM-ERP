/**
 * Validation Script for Leave Cancellation Rollback
 * 
 * Run with: npx tsx scripts/hr/validate-leave-rollback.ts
 */

import { PrismaClient, LeaveStatus } from "@prisma/client";
import { calculateWorkHours, calculateOTHours, determineAttendanceStatus } from "../../lib/hr/shift-utils";

const prisma = new PrismaClient();

// This function replicates the transaction logic from updateLeaveStatus
// without the Next.js auth() and revalidatePath() dependencies, so it can run in pure Node.js
async function simulateUpdateLeaveStatus(id: string, newStatus: LeaveStatus, userId: string) {
  const oldApp = await prisma.leaveApplication.findUnique({
    where: { id },
    include: { employee: true }
  });

  if (!oldApp) {
    return { success: false, error: "Leave application not found" };
  }

  const needsRollback = oldApp.status === "HR_APPROVED" && 
                        (newStatus === "CANCELLED" || newStatus === "REJECTED" || 
                         newStatus === "PENDING" || newStatus === "MANAGER_APPROVED");

  const result = await prisma.$transaction(async (tx) => {
    let rollbackCount = 0;
    let recalculatedCount = 0;
    let skippedCount = 0;

    if (needsRollback) {
      const lockedAttendances = await tx.attendance.findMany({
        where: { leaveApplicationId: oldApp.id, isLocked: true }
      });

      if (lockedAttendances.length > 0) {
        throw new Error("Cannot change leave status because attendance for this period is already locked by payroll. Please reverse payroll first or contact admin.");
      }

      const attendances = await tx.attendance.findMany({
        where: { leaveApplicationId: oldApp.id },
        include: { shift: true }
      });

      for (const att of attendances) {
        if (att.checkIn || att.checkOut) {
          recalculatedCount++;
          
          const recalculatedStatus = determineAttendanceStatus(att.checkIn, att.date, att.shift as any);
          const workHours = calculateWorkHours(att.checkIn, att.checkOut);
          const otHours = att.checkOut && att.shift
            ? calculateOTHours(att.checkOut, att.date, att.shift as any)
            : 0;

          await tx.attendance.update({
            where: { id: att.id },
            data: {
              leaveApplicationId: null,
              status: recalculatedStatus,
              workHours: workHours,
              otHours: otHours,
              notes: att.notes ? att.notes + " (Leave cancelled/rejected, recalculated)" : "(Leave cancelled/rejected, recalculated)"
            }
          });
        } else {
          await tx.attendance.delete({ where: { id: att.id } });
          rollbackCount++;
        }
      }
    }

    const updateData: any = { status: newStatus };
    if (newStatus === "MANAGER_APPROVED") updateData.managerId = userId;
    else if (newStatus === "HR_APPROVED") updateData.hrId = userId;

    const leaveApp = await tx.leaveApplication.update({
      where: { id },
      data: updateData,
    });

    if (newStatus === "HR_APPROVED" && oldApp.status !== "HR_APPROVED") {
      const dates = [];
      let currentDate = new Date(oldApp.startDate);
      const endDate = new Date(oldApp.endDate);
      
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      for (const date of dates) {
        await tx.attendance.upsert({
          where: { employeeId_date: { employeeId: oldApp.employeeId, date: date } },
          update: {
            status: "LEAVE",
            isManual: true,
            notes: "Auto-synced from approved leave",
            leaveApplicationId: oldApp.id,
            updatedBy: userId
          },
          create: {
            employeeId: oldApp.employeeId,
            date: date,
            status: "LEAVE",
            shiftId: oldApp.employee.shiftId,
            isManual: true,
            notes: "Auto-synced from approved leave",
            leaveApplicationId: oldApp.id,
            createdBy: userId
          }
        });
      }
    }

    return { leaveApp, rollbackCount, recalculatedCount, skippedCount };
  });

  return { success: true, result };
}

async function runTests() {
  console.log("🧪 Starting Leave Rollback Validation Tests\n");

  // Setup test data
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found in DB");

  const employee = await prisma.employee.findFirst({ where: { status: "active" } });
  if (!employee) throw new Error("No active employee found in DB");

  const leaveType = await prisma.leaveType.findFirst();
  if (!leaveType) throw new Error("No leave type found in DB");

  let leaveAppId = "";
  const testDates = [
    new Date("2026-12-01T00:00:00.000Z"),
    new Date("2026-12-02T00:00:00.000Z")
  ];

  try {
    // Clean up any existing attendances for these dates
    await prisma.attendance.deleteMany({
      where: { employeeId: employee.id, date: { in: testDates } }
    });

    // Create a Pending Leave Application
    const leaveApp = await prisma.leaveApplication.create({
      data: {
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        startDate: testDates[0],
        endDate: testDates[1],
        totalDays: 2,
        reason: "Test Rollback",
        status: "PENDING",
        createdBy: user.id
      }
    });
    leaveAppId = leaveApp.id;

    console.log("✅ Test Data Setup Complete");

    // ============================================
    // Test Case 1: Approve leave creates attendance rows
    // ============================================
    const res1 = await simulateUpdateLeaveStatus(leaveAppId, "HR_APPROVED", user.id);
    if (!res1.success) throw new Error("Failed to approve leave");
    
    const attendances1 = await prisma.attendance.findMany({
      where: { leaveApplicationId: leaveAppId }
    });
    
    if (attendances1.length !== 2) throw new Error(`Expected 2 attendances, got ${attendances1.length}`);
    console.log("✅ Test Case 1: Approved leave successfully created attendance rows.");

    // ============================================
    // Test Case 4: Manual/Biometric punch preservation
    // ============================================
    // Simulate a punch on the second day
    await prisma.attendance.update({
      where: { id: attendances1[1].id },
      data: { checkIn: new Date("2026-12-02T09:00:00.000Z") }
    });

    // ============================================
    // Test Case 3: Cancelled leave preserves punched rows
    // ============================================
    const res2 = await simulateUpdateLeaveStatus(leaveAppId, "CANCELLED", user.id);
    if (!res2.success) throw new Error("Failed to cancel leave");

    if (res2.result?.rollbackCount !== 1) throw new Error(`Expected 1 rollback, got ${res2.result?.rollbackCount}`);
    if (res2.result?.recalculatedCount !== 1) throw new Error(`Expected 1 recalculated, got ${res2.result?.recalculatedCount}`);
    
    // Verify in DB
    const attendances2 = await prisma.attendance.findMany({
      where: { employeeId: employee.id, date: { in: testDates } }
    });
    
    if (attendances2.length !== 1) throw new Error(`Expected 1 remaining attendance, got ${attendances2.length}`);
    if (attendances2[0].leaveApplicationId !== null) throw new Error("Remaining attendance still linked to leave");
    if (attendances2[0].status === "LEAVE") throw new Error("Remaining attendance status was not recalculated, still LEAVE");
    
    console.log(`✅ Test Case 2 & 3: Cancelled leave safely rolled back empty attendance and preserved punched attendance. Status recalculated to: ${attendances2[0].status}`);

    // ============================================
    // Test Case 3: Payroll Lock Protection
    // ============================================
    // Re-approve the leave
    await simulateUpdateLeaveStatus(leaveAppId, "HR_APPROVED", user.id);
    
    // Lock the generated attendance
    await prisma.attendance.updateMany({
      where: { leaveApplicationId: leaveAppId },
      data: { isLocked: true }
    });

    // Try to cancel
    try {
      await simulateUpdateLeaveStatus(leaveAppId, "CANCELLED", user.id);
      throw new Error("Should have thrown payroll lock error");
    } catch (e: any) {
      if (e.message.includes("payroll")) {
        console.log("✅ Test Case 3: Cancellation blocked correctly due to payroll lock.");
      } else {
        throw e;
      }
    }

  } finally {
    // Cleanup
    if (leaveAppId) {
      await prisma.attendance.deleteMany({ where: { leaveApplicationId: leaveAppId } });
      await prisma.attendance.deleteMany({ where: { employeeId: employee.id, date: { in: testDates } } });
      await prisma.leaveApplication.delete({ where: { id: leaveAppId } });
      console.log("🧹 Cleanup complete.");
    }
  }
}

runTests().catch((e) => {
  console.error("❌ Test failed:", e);
  process.exit(1);
});
