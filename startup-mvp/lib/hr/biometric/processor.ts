import { prisma } from "@/lib/prisma";
import { 
  calculateWorkHours, 
  calculateOTHours, 
  determineAttendanceStatus,
  ShiftPolicy
} from "@/lib/hr/shift-utils";
import { startOfDay, endOfDay } from "date-fns";

/**
 * Attendance Processor Service
 * Converts raw AttendanceLogs into processed Attendance records
 */
export async function processBiometricAttendance(startDate: Date, endDate: Date, employeeId?: string) {
  try {
    const where: any = {
      timestamp: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    // Get raw logs
    const logs = await prisma.attendanceLog.findMany({
      where,
      orderBy: { timestamp: "asc" },
    });

    if (logs.length === 0) {
      return { success: true, processedCount: 0, message: "No logs found to process" };
    }

    // Group logs by employee and date
    const groupedLogs: Record<string, Record<string, Date[]>> = {};

    logs.forEach((log) => {
      const dateStr = startOfDay(log.timestamp).toISOString();
      if (!groupedLogs[log.employeeId]) groupedLogs[log.employeeId] = {};
      if (!groupedLogs[log.employeeId][dateStr]) groupedLogs[log.employeeId][dateStr] = [];
      groupedLogs[log.employeeId][dateStr].push(log.timestamp);
    });

    let processedCount = 0;

    for (const empId in groupedLogs) {
      const employee = await prisma.employee.findUnique({
        where: { id: empId },
        include: { shift: true },
      });

      if (!employee) continue;

      const shiftPolicy: ShiftPolicy | null = employee.shift ? {
        startTime: employee.shift.startTime,
        endTime: employee.shift.endTime,
        graceMinutes: employee.shift.graceMinutes,
        lateAfter: employee.shift.lateAfter,
        halfDayAfter: employee.shift.halfDayAfter,
        otStartAfter: employee.shift.otStartAfter
      } : null;

      for (const dateStr in groupedLogs[empId]) {
        const timestamps = groupedLogs[empId][dateStr];
        const date = new Date(dateStr);
        
        // Earliest punch = Check-In
        const checkIn = timestamps[0];
        
        // Latest punch = Check-Out (only if multiple punches exist)
        const checkOut = timestamps.length > 1 ? timestamps[timestamps.length - 1] : null;

        // Calculations
        const workHours = calculateWorkHours(checkIn, checkOut);
        let otHours = 0;
        if (checkOut && shiftPolicy) {
          otHours = calculateOTHours(checkOut, shiftPolicy.endTime, shiftPolicy.otStartAfter);
        }
        const status = determineAttendanceStatus(checkIn, shiftPolicy);

        // Skip if attendance is already locked by payroll
        const existing = await prisma.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: empId,
              date: date,
            },
          },
          select: { isLocked: true },
        });

        if (existing?.isLocked) {
          console.log(`Skipping locked attendance for employee ${empId} on ${dateStr}`);
          continue;
        }

        // Upsert processed attendance
        await prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: empId,
              date: date,
            },
          },
          update: {
            checkIn,
            checkOut,
            workHours,
            otHours,
            status,
            shiftId: employee.shiftId,
            isManual: false,
          },
          create: {
            employeeId: empId,
            date: date,
            checkIn,
            checkOut,
            workHours,
            otHours,
            status,
            shiftId: employee.shiftId,
            isManual: false,
            createdBy: null,
          },
        });

        processedCount++;
      }
    }

    return { success: true, processedCount };
  } catch (error) {
    console.error("processBiometricAttendance error:", error);
    return { success: false, error: "Failed to process logs into attendance" };
  }
}
