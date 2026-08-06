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
  getShiftWindow,
  formatBusinessDateKey,
  ShiftPolicy,
  calculateWorkHoursWithBreak,
  combineDateAndTime,
} from "@/lib/hr/shift-utils";
import { Prisma } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";
import { getPayrollSettings, isConfiguredWeekend } from "@/lib/payroll-settings";
import { applyDailyAttendancePolicyValues } from "@/lib/hr-payroll/attendance-policy-service";
import { syncTimezoneFromDb } from "@/lib/hr/shift-utils";

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
        source: source as any,
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
  breakCheckOut?: string | null;
  breakCheckIn?: string | null;
  notes?: string;
}) {
  try {
    await syncTimezoneFromDb();
    
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

    if (employee.status !== "active") {
      return { success: false, error: "Cannot process attendance for inactive or resigned employee" };
    }

    let checkInDate = input.checkIn ? new Date(input.checkIn) : null;
    let checkOutDate = input.checkOut ? new Date(input.checkOut) : null;
    let breakCheckOutDate = input.breakCheckOut ? new Date(input.breakCheckOut) : null;
    let breakCheckInDate = input.breakCheckIn ? new Date(input.breakCheckIn) : null;

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
      if (input.breakCheckOut === undefined) breakCheckOutDate = attendance.breakCheckOut;
      if (input.breakCheckIn === undefined) breakCheckInDate = attendance.breakCheckIn;
    }

    // Calculations
    const shiftPolicy: ShiftPolicy | null = employee.shift ? {
      startTime: employee.shift.startTime,
      endTime: employee.shift.endTime,
      graceMinutes: employee.shift.graceMinutes,
      lateAfter: employee.shift.lateAfter,
      halfDayAfter: employee.shift.halfDayAfter,
      otStartAfter: employee.shift.otStartAfter,
      breakStartTime: employee.shift.breakStartTime,
      breakEndTime: employee.shift.breakEndTime,
      breakGraceMinutes: employee.shift.breakGraceMinutes,
      breakLateAfter: employee.shift.breakLateAfter
    } : null;

    let breakDurationMins = 0;
    if (shiftPolicy?.breakStartTime && shiftPolicy?.breakEndTime) {
      const { breakStartDateTime, breakEndDateTime } = getShiftWindow(targetDate, shiftPolicy);
      if (breakStartDateTime && breakEndDateTime) {
        breakDurationMins = Math.abs(breakEndDateTime.getTime() - breakStartDateTime.getTime()) / 60000;
      } else {
        breakDurationMins = 60; // 1 hour fallback
      }
    }

    let workHours = calculateWorkHoursWithBreak(
      checkInDate,
      checkOutDate,
      breakCheckOutDate,
      breakCheckInDate,
      breakDurationMins
    );

    let otHours = 0;
    if (checkOutDate && shiftPolicy) {
      otHours = calculateOTHours(checkOutDate, targetDate, shiftPolicy as any, workHours);
    }

    const status = determineAttendanceStatus(checkInDate as any, targetDate, shiftPolicy as any, breakCheckInDate);

    if (attendance) {
      // Update
      const oldAttendance = { ...attendance };
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          breakCheckOut: breakCheckOutDate,
          breakCheckIn: breakCheckInDate,
          workHours,
          otHours,
          status,
          notes: input.notes !== undefined ? input.notes : attendance.notes,
          shiftId: employee.shiftId,
          updatedBy: session.user.id,
          isManual: true,
        }
      });
      await logItemUpdated(
        session.user.id, 
        "Attendance", 
        attendance.id, 
        [], 
        `Attendance for ${employee.name}`, 
        { old: oldAttendance, new: attendance }
      );
    } else {
      // Create
      attendance = await prisma.attendance.create({
        data: {
          employeeId: input.employeeId,
          date: targetDate,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          breakCheckOut: breakCheckOutDate,
          breakCheckIn: breakCheckInDate,
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

    // Apply policy calculations to this attendance record
    try {
      await applyDailyAttendancePolicyValues(attendance.id, { force: true });
      const reloaded = await prisma.attendance.findUnique({ where: { id: attendance.id } });
      if (reloaded) attendance = reloaded;
    } catch (err) {
      console.error(`Failed to apply policy to manual attendance ${attendance.id}:`, err);
    }

    revalidateBothPaths("hr/attendance");
    return { success: true, attendance };

  } catch (error) {
    console.error("processManualAttendance error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to process attendance" };
  }
}

/**
 * Fetch a single attendance record by employeeId and date
 */
export async function getAttendanceRecord(employeeId: string, date: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const targetDate = new Date(date);
    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: targetDate
        }
      }
    });

    return { success: true, record };
  } catch (error) {
    console.error("getAttendanceRecord error:", error);
    return { success: false, error: "Failed to fetch attendance record" };
  }
}

/**
 * Fetch attendance records for a specific date range
 */
export async function getAttendances(startDate: Date, endDate: Date, employeeId?: string, warehouseId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", attendances: [] };

    // Format dates to YYYY-MM-DD using Business Timezone then parse as UTC to ensure precise matching
    // against Prisma's @db.Date without local timezone shift bleeding into the previous day
    const gteDate = new Date(formatBusinessDateKey(startDate) + "T00:00:00.000Z");
    const lteDate = new Date(formatBusinessDateKey(endDate) + "T00:00:00.000Z");

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
        shift: { select: { id: true, name: true, startTime: true, endTime: true, breakStartTime: true, breakEndTime: true, breakType: true, breakDuration: true } }
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
  const startTime = Date.now();
  try {
    await syncTimezoneFromDb();
    
    let session;
    try {
      session = await auth();
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        session = { user: { id: "cli-user" } };
      }
    }
    
    if (!session?.user) return { success: false, error: "Unauthorized" };

    let canEdit = true;
    try {
      if (session.user.id === "cli-user") {
        canEdit = true;
      } else {
        canEdit = await hasPermission(session.user.id, "hr.attendance", "edit");
      }
    } catch (e) {
      // fallback for CLI
    }
    if (!canEdit) return { success: false, error: "Permission denied" };

    // Date passed from UI is typical 'YYYY-MM-DD'. Map directly to UTC normalized constraint.
    const targetDate = new Date(`${date}T00:00:00.000Z`);
    
    // Check if it's a holiday
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: targetDate,
        status: "active",
        isTrash: false,
        OR: [
          { warehouseId: null },
          { warehouseId }
        ]
      }
    });

    const payrollSettings = await getPayrollSettings();
    const weekends = payrollSettings?.calculation?.weekends || [0, 6];

    let targetStatus: "HOLIDAY" | "WEEKEND" | "ABSENT" = "ABSENT";
    if (holiday) {
      targetStatus = "HOLIDAY";
    } else if (isConfiguredWeekend(targetDate, weekends)) {
      targetStatus = "WEEKEND";
    }
    
    // Find all active employees
    const whereClause: Prisma.EmployeeWhereInput = {
      status: "active"
    };
    
    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: { 
        id: true, 
        shiftId: true,
        shift: {
          select: {
            startTime: true,
            endTime: true,
            graceMinutes: true,
            lateAfter: true,
            halfDayAfter: true,
            otStartAfter: true
          }
        }
      }
    });

    if (employees.length === 0) {
      return { 
        success: true, count: 0, processedEmployees: 0, processedDates: 1, 
        createdCount: 0, durationMs: Date.now() - startTime 
      };
    }

    const employeeIds = employees.map(e => e.id);

    // Bulk prefetch existing attendances
    const existingAttendances = await prisma.attendance.findMany({
      where: {
        date: targetDate,
        employeeId: { in: employeeIds }
      },
      select: { employeeId: true }
    });

    const existingEmpIds = new Set(existingAttendances.map(a => a.employeeId));
    const missingEmployees = employees.filter(e => !existingEmpIds.has(e.id));

    if (missingEmployees.length === 0) {
      return { 
        success: true, count: 0, processedEmployees: employees.length, processedDates: 1, 
        createdCount: 0, durationMs: Date.now() - startTime 
      };
    }

    const creates = [];
    const now = new Date();

    for (const emp of missingEmployees) {
      // If it's an overnight shift, we must wait until the shift has actually ended (plus grace) 
      // before marking them ABSENT, to prevent falsely marking ongoing overnight shifts.
      if (emp.shift) {
        const { shiftEndDateTime } = getShiftWindow(targetDate, emp.shift as ShiftPolicy);
        const safeAbsenceMarkTime = new Date(shiftEndDateTime.getTime() + (emp.shift.graceMinutes * 60000));
        
        if (now < safeAbsenceMarkTime) {
          // It's too early to mark this person absent, their shift hasn't ended yet
          continue;
        }
      }

      creates.push({
        employeeId: emp.id,
        date: targetDate,
        status: targetStatus,
        shiftId: emp.shiftId,
        isManual: false,
        notes: "Auto-marked by system",
        createdBy: (session?.user?.id && session.user.id !== "cli-user") ? session.user.id : null
      });
    }

    // Safe Chunking
    const CHUNK_SIZE = 500;
    let createdCount = 0;

    for (let i = 0; i < creates.length; i += CHUNK_SIZE) {
      const chunk = creates.slice(i, i + CHUNK_SIZE);
      const res = await prisma.attendance.createMany({
        data: chunk,
        skipDuplicates: true
      });
      createdCount += res.count;
    }

    // Post-processing: Calculate and apply policy values for created bulk rows
    const empIds = creates.map(c => c.employeeId);
    const affectedAttendances = await prisma.attendance.findMany({
      where: {
        employeeId: { in: empIds },
        date: targetDate,
        isLocked: false,
      },
      select: { id: true }
    });

    for (const att of affectedAttendances) {
      try {
        await applyDailyAttendancePolicyValues(att.id);
      } catch (err) {
        console.error(`Failed to apply policy to bulk attendance ${att.id}:`, err);
      }
    }

    try {
      revalidateBothPaths("hr/attendance");
    } catch (e) {
      // ignore in CLI
    }
    return { 
      success: true, 
      count: createdCount, 
      processedEmployees: employees.length, 
      processedDates: 1, 
      createdCount, 
      durationMs: Date.now() - startTime 
    };
  } catch (error) {
    console.error("processBulkAttendance error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to process bulk attendance" };
  }
}

/**
 * Bulk process attendance for a DATE RANGE
 * Loops through every day from fromDate to toDate and marks un-punched employees as ABSENT.
 */
export async function processBulkAttendanceRange(fromDate: string, toDate: string, warehouseId?: string) {
  try {
    const start = new Date(`${fromDate}T00:00:00.000Z`);
    const end   = new Date(`${toDate}T00:00:00.000Z`);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return { success: false, error: "Invalid date range" };
    }

    // Limit to a maximum of 31 days to prevent runaway processing
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 31) {
      return { success: false, error: "Date range cannot exceed 31 days" };
    }

    let totalCreated   = 0;
    let totalProcessed = 0;
    const errors: string[] = [];

    // Walk through every day in the range
    const cursor = new Date(start);
    while (cursor <= end) {
      const dateStr = cursor.toISOString().split("T")[0]; // YYYY-MM-DD
      const result  = await processBulkAttendance(dateStr, warehouseId);

      if (result.success) {
        totalCreated   += result.createdCount  ?? 0;
        totalProcessed += result.processedEmployees ?? 0;
      } else {
        errors.push(`${dateStr}: ${result.error}`);
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (errors.length > 0 && totalCreated === 0) {
      return { success: false, error: errors.join("; ") };
    }

    return {
      success: true,
      count:   totalCreated,
      daysProcessed: diffDays,
      createdCount:  totalCreated,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("processBulkAttendanceRange error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to process bulk attendance range" };
  }
}

export async function getAttendanceRecordsPaginated({
  page = 1,
  limit = 10,
  search = "",
  warehouseId,
  deviceId,
  employeeId,
  fromDate,
  toDate,
  status,
}: {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: string;
  deviceId?: string;
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", attendances: [], pagination: null };

    const canView = await hasPermission(session.user.id, "hr.attendance", "view");
    if (!canView) return { success: false, error: "Permission denied", attendances: [], pagination: null };

    const where: Prisma.AttendanceWhereInput = {};

    // Date range
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate + "T00:00:00.000Z");
      if (toDate) where.date.lte = new Date(toDate + "T23:59:59.999Z");
    }

    // Filters
    if (employeeId) where.employeeId = employeeId;
    if (warehouseId && warehouseId !== "all") where.employee = { warehouseId };
    if (status && status !== "ALL") {
      if (status === "ON_DUTY") {
        where.checkIn = { not: null };
        where.checkOut = null;
      } else {
        where.status = status as any;
      }
    }

    // Search by employee name or code
    if (search) {
      where.employee = {
        ...((where.employee as any) || {}),
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { employeeCode: { contains: search, mode: "insensitive" } }
        ]
      };
    }

    // Pagination
    const skip = (page - 1) * limit;

    const [total, attendances] = await prisma.$transaction([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true, employeeCode: true, designation: true } },
          shift: { select: { id: true, name: true, startTime: true, endTime: true, breakStartTime: true, breakEndTime: true, breakType: true, breakDuration: true } }
        },
        orderBy: [{ date: 'desc' }, { employee: { name: 'asc' } }],
        skip,
        take: limit,
      })
    ]);

    return {
      success: true,
      attendances,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    };
  } catch (error: any) {
    console.error("getAttendanceRecordsPaginated error:", error);
    return { success: false, error: error.message || "Failed to fetch attendances", attendances: [], pagination: null };
  }
}

export async function closeShiftBulk(attendanceIds: string[]) {
  try {
    await syncTimezoneFromDb();
    
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canEdit = await hasPermission(session.user.id, "hr.attendance", "edit");
    if (!canEdit) return { success: false, error: "Permission denied" };

    if (!attendanceIds || attendanceIds.length === 0) {
      return { success: false, error: "No attendances selected" };
    }

    const attendances = await prisma.attendance.findMany({
      where: { id: { in: attendanceIds } },
      include: {
        employee: {
          include: { shift: true }
        }
      }
    });

    let successCount = 0;
    const errors: string[] = [];

    for (let att of attendances) {
      if (att.isLocked) {
        errors.push(`Attendance for employee ${att.employee.name} on ${att.date.toISOString().split("T")[0]} is locked.`);
        continue;
      }

      if (!att.checkIn) {
        errors.push(`Employee ${att.employee.name} has no check-in on ${att.date.toISOString().split("T")[0]}.`);
        continue;
      }

      const employee = att.employee;
      const shift = employee.shift;

      if (!shift) {
        errors.push(`Employee ${employee.name} has no shift assigned.`);
        continue;
      }

      const shiftPolicy: ShiftPolicy = {
        startTime: shift.startTime,
        endTime: shift.endTime,
        graceMinutes: shift.graceMinutes,
        lateAfter: shift.lateAfter,
        halfDayAfter: shift.halfDayAfter,
        otStartAfter: shift.otStartAfter,
        breakStartTime: shift.breakStartTime,
        breakEndTime: shift.breakEndTime,
        breakGraceMinutes: shift.breakGraceMinutes,
        breakLateAfter: shift.breakLateAfter
      };

      const checkOutDate = combineDateAndTime(att.date, shift.endTime);

      let breakDurationMins = 0;
      if (shiftPolicy.breakStartTime && shiftPolicy.breakEndTime) {
        const { breakStartDateTime, breakEndDateTime } = getShiftWindow(att.date, shiftPolicy);
        if (breakStartDateTime && breakEndDateTime) {
          breakDurationMins = Math.abs(breakEndDateTime.getTime() - breakStartDateTime.getTime()) / 60000;
        } else {
          breakDurationMins = 60;
        }
      }

      const workHours = calculateWorkHoursWithBreak(
        att.checkIn,
        checkOutDate,
        att.breakCheckOut,
        att.breakCheckIn,
        breakDurationMins
      );

      const otHours = calculateOTHours(checkOutDate, att.date, shiftPolicy as any, workHours);
      const status = determineAttendanceStatus(att.checkIn, att.date, shiftPolicy as any, att.breakCheckIn);

      const oldAttendance = { ...att };

      const updated = await prisma.attendance.update({
        where: { id: att.id },
        data: {
          checkOut: checkOutDate,
          workHours,
          otHours,
          status,
          shiftId: shift.id,
          updatedBy: session.user.id,
          isManual: true
        }
      });

      await logItemUpdated(
        session.user.id,
        "Attendance",
        att.id,
        [],
        `Shift closed for ${employee.name}`,
        { old: oldAttendance, new: updated }
      );

      try {
        await applyDailyAttendancePolicyValues(updated.id, { force: true });
      } catch (err) {
        console.error(`Failed to apply policy to closed shift ${updated.id}:`, err);
      }

      successCount++;
    }

    revalidateBothPaths("hr/attendance");

    if (errors.length > 0) {
      return { 
        success: true, 
        message: `Successfully closed ${successCount} shift(s).`,
        warnings: errors
      };
    }

    return { success: true, message: `Successfully closed all ${successCount} shift(s).` };

  } catch (error) {
    console.error("closeShiftBulk error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to close shifts" };
  }
}

