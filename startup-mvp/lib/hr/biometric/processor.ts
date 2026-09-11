import { prisma } from "@/lib/prisma";
import { 
  calculateWorkHours, 
  calculateOTHours, 
  determineAttendanceStatus,
  ShiftPolicy
} from "@/lib/hr/shift-utils";
import { startOfDay, endOfDay } from "date-fns";
import { getEmployeePolicies } from "@/lib/hr/policy-evaluator";

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

        // Fetch policies for allowance calculation
        const policies = await getEmployeePolicies(employee.employeeTypeId, employee.organizationId);

        // Calculations
        const workHours = calculateWorkHours(checkIn, checkOut);
        let otHours = 0;
        if (checkOut && shiftPolicy && policies.overtime.isEligible) {
          otHours = calculateOTHours(checkOut, shiftPolicy.endTime, policies.overtime.minMinutes);
        }
        const status = determineAttendanceStatus(checkIn, shiftPolicy);

        // Calculate Shift Allowances (Tiffin, Night, Holiday)
        let tiffinBill = 0;
        let nightBill = 0;
        let holidayBill = 0;

        if (checkOut) {
          const checkOutHourStr = `${checkOut.getHours().toString().padStart(2, '0')}:${checkOut.getMinutes().toString().padStart(2, '0')}`;
          
          // Tiffin Bill Evaluation
          if (policies.tiffinBill.isEligible && checkOutHourStr >= policies.tiffinBill.cutoffTime) {
            tiffinBill = policies.tiffinBill.dailyAmount;
          }

          // Night Bill Evaluation (checkout between 10 PM and 6 AM or night shift)
          const hour = checkOut.getHours();
          if (policies.nightBill.isEligible && (employee.shift?.isNightShift || hour >= 22 || hour < 6)) {
            nightBill = policies.nightBill.dailyAmount;
          }

          // Holiday Bill Evaluation
          const isWeekendOrHoliday = date.getDay() === 5 || date.getDay() === 6; // Friday/Saturday or public holiday
          if (policies.holidayBill.isEligible && isWeekendOrHoliday) {
            holidayBill = policies.holidayBill.dailyAmount;
          }
        }

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
            tiffinBill,
            nightBill,
            holidayBill,
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
            tiffinBill,
            nightBill,
            holidayBill,
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
