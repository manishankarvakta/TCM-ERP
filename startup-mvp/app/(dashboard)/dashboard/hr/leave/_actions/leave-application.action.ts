"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, LeaveStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { calculateWorkHours, calculateOTHours, determineAttendanceStatus } from "@/lib/hr/shift-utils";

/**
 * Get Paginated Leave Applications
 */
export async function getLeaveApplications(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: LeaveStatus | "ALL" | "TRASH" = "ALL",
  employeeId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", leaveApplications: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.LeaveApplicationWhereInput = {};

    if (search) {
      where.employee = {
        name: { contains: search, mode: "insensitive" }
      };
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status === "TRASH") {
      where.isTrash = true;
    } else {
      where.isTrash = false;
      if (status !== "ALL") {
        where.status = status;
      }
    }

    const total = await prisma.leaveApplication.count({ where });
    const leaveApplications = await prisma.leaveApplication.findMany({
      where,
      skip,
      take: limit,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, designation: true } },
        leaveType: { select: { id: true, name: true, isPaid: true } },
        manager: { select: { id: true, name: true } },
        hr: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      leaveApplications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getLeaveApplications error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch leave applications",
      leaveApplications: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

/**
 * Get leave balances for an employee
 */
export async function getEmployeeLeaveBalances(employeeId: string) {
  try {
    // 1. Fetch all active leave types
    const leaveTypes = await prisma.leaveType.findMany({
      where: { status: "active", isTrash: false }
    });

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    // 2. Fetch approved leaves for the current year for this employee
    const approvedLeaves = await prisma.leaveApplication.findMany({
      where: {
        employeeId,
        status: "HR_APPROVED",
        isTrash: false,
        startDate: { gte: startOfYear },
        endDate: { lte: endOfYear }
      }
    });

    // 3. Calculate balances
    const balances = leaveTypes.map(lt => {
      const usedDays = approvedLeaves
        .filter(app => app.leaveTypeId === lt.id)
        .reduce((sum, app) => sum + app.totalDays, 0);

      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        isPaid: lt.isPaid,
        totalDays: lt.defaultDays,
        usedDays,
        remainingDays: lt.defaultDays - usedDays
      };
    });

    return { success: true, balances };
  } catch (error) {
    console.error("getEmployeeLeaveBalances error:", error);
    return { success: false, error: "Failed to calculate leave balances", balances: [] };
  }
}

/**
 * Apply for Leave (Employee)
 */
export async function applyForLeave(input: {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const leaveApp = await prisma.leaveApplication.create({
      data: {
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        totalDays: input.totalDays,
        reason: input.reason,
        status: "PENDING",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "LeaveApplication", leaveApp.id, "Leave Application Submitted", leaveApp);
    revalidateBothPaths("hr/leave");

    return { success: true, leaveApplication: leaveApp };
  } catch (error) {
    console.error("applyForLeave error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to apply for leave" };
  }
}

/**
 * Update Leave Application Status (Manager / HR)
 */
export async function updateLeaveStatus(id: string, newStatus: LeaveStatus) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Require hr.leave edit permission to approve/reject
    const canEdit = await hasPermission(session.user.id, "hr.leave", "edit");
    if (!canEdit) {
      return { success: false, error: "You don't have permission to update leave status" };
    }

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
        // 1. Check if any attendance is locked
        const lockedAttendances = await tx.attendance.findMany({
          where: {
            leaveApplicationId: oldApp.id,
            isLocked: true
          }
        });

        if (lockedAttendances.length > 0) {
          throw new Error("Cannot change leave status because attendance for this period is already locked by payroll. Please reverse payroll first or contact admin.");
        }

        // 2. Perform safe rollback
        const attendances = await tx.attendance.findMany({
          where: { leaveApplicationId: oldApp.id },
          include: { shift: true }
        });

        for (const att of attendances) {
          // Check for manual or biometric data (checkIn / checkOut)
          if (att.checkIn || att.checkOut) {
            recalculatedCount++;
            
            const recalculatedStatus = determineAttendanceStatus(att.checkIn as any, att.checkOut as any, att.shift as any);
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
            // No real punch data, delete the auto-generated row
            await tx.attendance.delete({
              where: { id: att.id }
            });
            rollbackCount++;
          }
        }
      }

      const updateData: any = { status: newStatus };

      if (newStatus === "MANAGER_APPROVED") {
        updateData.managerId = session.user.id;
      } else if (newStatus === "HR_APPROVED") {
        updateData.hrId = session.user.id;
      } else if (newStatus === "REJECTED") {
        // Could be rejected by either manager or HR, just setting status
      }

      const leaveApp = await tx.leaveApplication.update({
        where: { id },
        data: updateData,
      });

      // If newly approved, generate attendance
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
            where: {
              employeeId_date: {
                employeeId: oldApp.employeeId,
                date: date
              }
            },
            update: {
              status: "LEAVE",
              isManual: true,
              notes: "Auto-synced from approved leave",
              leaveApplicationId: oldApp.id,
              updatedBy: session.user.id
            },
            create: {
              employeeId: oldApp.employeeId,
              date: date,
              status: "LEAVE",
              shiftId: oldApp.employee.shiftId,
              isManual: true,
              notes: "Auto-synced from approved leave",
              leaveApplicationId: oldApp.id,
              createdBy: session.user.id
            }
          });
        }
      }

      return { leaveApp, rollbackCount, recalculatedCount, skippedCount };
    });

    await logItemUpdated(session.user.id, "LeaveApplication", result.leaveApp.id, [`Status changed to ${newStatus}`], oldApp as any, result.leaveApp as any);

    revalidateBothPaths("hr/leave");
    revalidateBothPaths("hr/attendance");

    let message = "Leave status updated successfully.";
    if (needsRollback) {
       message = `Leave ${newStatus.toLowerCase()}. ${result.rollbackCount} generated attendance records were reverted.`;
       if (result.recalculatedCount > 0) {
         message += ` ${result.recalculatedCount} records were recalculated and preserved because they contain punch data.`;
       }
    }

    return { success: true, leaveApplication: result.leaveApp, message };
  } catch (error) {
    console.error("updateLeaveStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update leave status" };
  }
}

/**
 * Get a single leave application by ID
 */
export async function getLeaveApplicationById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const leaveApplication = await prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
            department: true,
            photo: true,
          }
        },
        leaveType: true,
        manager: { select: { id: true, name: true } },
        hr: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    if (!leaveApplication) return { success: false, error: "Leave application not found" };

    return { success: true, leaveApplication };
  } catch (error) {
    console.error("getLeaveApplicationById error:", error);
    return { success: false, error: "Failed to fetch leave application details" };
  }
}
