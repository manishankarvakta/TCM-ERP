"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { hasPermission } from "@/lib/permissions";
import { 
  calculateWorkHours, 
  calculateOTHours, 
  determineAttendanceStatus,
  ShiftPolicy
} from "@/lib/hr/shift-utils";
import { Prisma } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";

/**
 * Log raw biometric/manual attendance punch
 */
export async function logAttendancePunch(employeeId: string, timestamp: Date, source: "BIOMETRIC" | "MANUAL" | "APP", deviceId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canPunch = await hasPermission(session.user.id, "hr.attendance", "create");
    if (!canPunch) return { success: false, error: "Permission denied" };

    const log = await prisma.attendanceLog.create({
      data: {
        employeeId,
        timestamp,
        source,
        deviceId,
      }
    });

    return { success: true, log };
  } catch (error) {
    console.error("logAttendancePunch error:", error);
    return { success: false, error: "Failed to log punch" };
  }
}

/**
 * Process a check-in or check-out event, calculating times and status
 */
export async function processManualAttendance(input: {
  employeeId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canEdit = await hasPermission(session.user.id, "hr.attendance", "edit");
    if (!canEdit) return { success: false, error: "Permission denied" };

    const targetDate = new Date(input.date);
    
    // Fetch employee and their assigned shift
    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      include: { shift: true }
    });

    if (!employee) return { success: false, error: "Employee not found" };

    let checkInDate = input.checkIn ? new Date(input.checkIn) : null;
    let checkOutDate = input.checkOut ? new Date(input.checkOut) : null;

    // Fetch existing attendance record for this date
    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: input.employeeId,
          date: targetDate
        }
      }
    });

    if (attendance?.isLocked) {
      return { success: false, error: "Attendance is locked for payroll processing" };
    }

    // Merge with existing if only one side is provided
    if (attendance) {
      if (input.checkIn === undefined) checkInDate = attendance.checkIn;
      if (input.checkOut === undefined) checkOutDate = attendance.checkOut;
    }

    // Calculations
    const shiftPolicy: ShiftPolicy | null = employee.shift ? {
      startTime: employee.shift.startTime,
      endTime: employee.shift.endTime,
      graceMinutes: employee.shift.graceMinutes,
      lateAfter: employee.shift.lateAfter,
      halfDayAfter: employee.shift.halfDayAfter,
      otStartAfter: employee.shift.otStartAfter
    } : null;

    let workHours = calculateWorkHours(checkInDate, checkOutDate);
    let otHours = 0;
    
    if (checkOutDate && shiftPolicy) {
      otHours = calculateOTHours(checkOutDate, shiftPolicy.endTime, shiftPolicy.otStartAfter);
    }

    const status = determineAttendanceStatus(checkInDate, shiftPolicy);

    if (attendance) {
      // Update
      const oldAttendance = { ...attendance };
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          workHours,
          otHours,
          status,
          notes: input.notes !== undefined ? input.notes : attendance.notes,
          shiftId: employee.shiftId,
          updatedBy: session.user.id,
          isManual: true,
        }
      });
      await logItemUpdated(session.user.id, "Attendance", attendance.id, `Attendance for ${employee.name}`, oldAttendance, attendance);
    } else {
      // Create
      attendance = await prisma.attendance.create({
        data: {
          employeeId: input.employeeId,
          date: targetDate,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          workHours,
          otHours,
          status,
          notes: input.notes,
          shiftId: employee.shiftId,
          createdBy: session.user.id,
          isManual: true,
        }
      });
      await logItemCreated(session.user.id, "Attendance", attendance.id, `Attendance for ${employee.name}`, attendance);
    }

    revalidateBothPaths("hr/attendance");
    return { success: true, attendance };

  } catch (error) {
    console.error("processManualAttendance error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to process attendance" };
  }
}

/**
 * Fetch attendance records for a specific date range
 */
export async function getAttendances(startDate: Date, endDate: Date, employeeId?: string, warehouseId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", attendances: [] };

    // Format dates to YYYY-MM-DD then parse as UTC to ensure precise matching
    // against Prisma's @db.Date without local timezone shift bleeding into the previous day
    const { format } = require("date-fns");
    const gteDate = new Date(format(startDate, "yyyy-MM-dd") + "T00:00:00.000Z");
    const lteDate = new Date(format(endDate, "yyyy-MM-dd") + "T00:00:00.000Z");

    const where: Prisma.AttendanceWhereInput = {
      date: {
        gte: gteDate,
        lte: lteDate,
      }
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (warehouseId) {
      where.employee = { warehouseId };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, designation: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } }
      },
      orderBy: [{ date: 'desc' }, { employee: { name: 'asc' } }]
    });

    return { success: true, attendances };
  } catch (error) {
    console.error("getAttendances error:", error);
    return { success: false, error: "Failed to fetch attendances", attendances: [] };
  }
}

/**
 * Bulk process attendance for a specific date
 * (e.g., mark everyone who hasn't punched as ABSENT)
 */
export async function processBulkAttendance(date: string, warehouseId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canEdit = await hasPermission(session.user.id, "hr.attendance", "edit");
    if (!canEdit) return { success: false, error: "Permission denied" };

    const targetDate = startOfDay(new Date(date));
    
    // Find all active employees
    const whereClause: Prisma.EmployeeWhereInput = {
      status: "active"
    };
    
    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: { shift: true }
    });

    let processedCount = 0;

    for (const emp of employees) {
      // Check if attendance exists
      const existing = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: targetDate
          }
        }
      });

      if (!existing) {
        // If no attendance record, mark as ABSENT
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            date: targetDate,
            status: "ABSENT",
            shiftId: emp.shiftId,
            isManual: false,
            notes: "Auto-marked by system",
            createdBy: session.user.id
          }
        });
        processedCount++;
      }
    }

    revalidateBothPaths("hr/attendance");
    return { success: true, count: processedCount };
  } catch (error) {
    console.error("processBulkAttendance error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to process bulk attendance" };
  }
}
