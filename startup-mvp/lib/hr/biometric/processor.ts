import { prisma } from "@/lib/prisma";
import { 
  calculateWorkHours, 
  calculateOTHours, 
  determineAttendanceStatus,
  resolveAttendanceDateForPunch,
  formatBusinessDateKey,
  toBusinessDateOnly,
  ShiftPolicy
} from "@/lib/hr/shift-utils";
import { applyDailyAttendancePolicyValues } from "@/lib/hr-payroll/attendance-policy-service";
import { startOfDay, endOfDay } from "date-fns";
import { syncTimezoneFromDb } from "../shift-utils";

/**
 * Attendance Processor Service
 * Converts raw AttendanceLogs into processed Attendance records
 */
export async function processBiometricAttendance(startDate: Date, endDate: Date, employeeId?: string) {
  try {
    await syncTimezoneFromDb();
    
    console.log("⚙️ [PROCESS] Operation triggered for date range:", startDate, "-", endDate);
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
      console.log("⚠️ [PROCESS] Finish Result. No raw logs found for this date range.");
      return { success: true, processedCount: 0, message: "No logs found to process" };
    }
    
    console.log("📥 [PROCESS] Raw Logs fetched from database:");
    console.log(JSON.stringify(logs, null, 2));

    // Extract unique employee IDs and target dates
    const empIdsFromLogs = Array.from(new Set(logs.map(l => l.employeeId)));
    // Bulk prefetch employees
    const employees = await prisma.employee.findMany({
      where: { id: { in: empIdsFromLogs } },
      include: { shift: true }
    });
    const employeeById = new Map<string, typeof employees[0]>(employees.map(e => [e.id, e]));

    // We fetch potential candidate dates based on Business Bounds, correctly routing through shift logic first
    const resolvedDateSet = new Set<string>();
    logs.forEach(log => {
      const employee = employeeById.get(log.employeeId);
      const shiftPolicy: ShiftPolicy | null = employee?.shift ? {
        startTime: employee.shift.startTime,
        endTime: employee.shift.endTime,
        graceMinutes: employee.shift.graceMinutes,
        lateAfter: employee.shift.lateAfter,
        halfDayAfter: employee.shift.halfDayAfter,
        otStartAfter: employee.shift.otStartAfter
      } : null;
      
      const attendanceDate = resolveAttendanceDateForPunch(log.timestamp, shiftPolicy);
      resolvedDateSet.add(formatBusinessDateKey(attendanceDate));
    });
    
    const targetDates = Array.from(resolvedDateSet).map(d => new Date(`${d}T00:00:00.000Z`));

    // Bulk prefetch existing attendances
    const existingAttendances = await prisma.attendance.findMany({
      where: {
        employeeId: { in: empIdsFromLogs },
        date: { in: targetDates }
      },
      select: { id: true, employeeId: true, date: true, isLocked: true, isManual: true, leaveApplicationId: true }
    });

    const existingMap = new Map<string, typeof existingAttendances[0]>();
    for (const att of existingAttendances) {
      existingMap.set(`${att.employeeId}_${formatBusinessDateKey(att.date)}`, att);
    }

    // Group logs by employee and resolved attendance date
    const groupedLogs: Record<string, Record<string, Date[]>> = {};
    logs.forEach((log) => {
      const employee = employeeById.get(log.employeeId);
      const shiftPolicy: ShiftPolicy | null = employee?.shift ? {
        startTime: employee.shift.startTime,
        endTime: employee.shift.endTime,
        graceMinutes: employee.shift.graceMinutes,
        lateAfter: employee.shift.lateAfter,
        halfDayAfter: employee.shift.halfDayAfter,
        otStartAfter: employee.shift.otStartAfter
      } : null;

      // Import update: Need resolveAttendanceDateForPunch
      const attendanceDate = resolveAttendanceDateForPunch(log.timestamp, shiftPolicy);
      const dateKey = formatBusinessDateKey(attendanceDate);
      
      if (!groupedLogs[log.employeeId]) groupedLogs[log.employeeId] = {};
      if (!groupedLogs[log.employeeId][dateKey]) groupedLogs[log.employeeId][dateKey] = [];
      groupedLogs[log.employeeId][dateKey].push(log.timestamp);
    });

    const creates: any[] = [];
    const updates: any[] = [];
    
    let processedEmployees = new Set<string>();
    let processedDates = new Set<string>();
    let skippedLockedCount = 0;
    let skippedManualCount = 0;
    let skippedPayrollCount = 0;
    let skippedLeaveCount = 0;
    let conflictCount = 0;

    for (const empId in groupedLogs) {
      const employee = employeeById.get(empId);
      if (!employee || employee.status !== "active") continue;

      processedEmployees.add(empId);

      const shiftPolicy: ShiftPolicy | null = employee.shift ? {
        startTime: employee.shift.startTime,
        endTime: employee.shift.endTime,
        graceMinutes: employee.shift.graceMinutes,
        lateAfter: employee.shift.lateAfter,
        halfDayAfter: employee.shift.halfDayAfter,
        otStartAfter: employee.shift.otStartAfter
      } : null;

      for (const dateKey in groupedLogs[empId]) {
        processedDates.add(dateKey);
        const timestamps = groupedLogs[empId][dateKey];
        // Ensure timestamps are sorted
        timestamps.sort((a, b) => a.getTime() - b.getTime());
        
        // Normalize UTC representation back out of the dateKey
        const date = new Date(`${dateKey}T00:00:00.000Z`);
        const checkIn = timestamps[0];
        const checkOut = timestamps.length > 1 ? timestamps[timestamps.length - 1] : null;

        const workHours = calculateWorkHours(checkIn, checkOut);
        let otHours = 0;
        if (checkOut && shiftPolicy) {
          otHours = calculateOTHours(checkOut, date, shiftPolicy);
        }
        const status = determineAttendanceStatus(checkIn, date, shiftPolicy);

        const existingKey = `${empId}_${dateKey}`;
        const existing = existingMap.get(existingKey);

        // Payroll-posted attendance naturally inherits `isLocked = true` when posted.
        // We explicitly log this for payroll protection metrics.
        if (existing?.isLocked) {
          skippedLockedCount++;
          skippedPayrollCount++;
          continue;
        }

        if (existing?.isManual) {
          skippedManualCount++;
          continue; // Preserve manual corrections
        }

        // Leave tracking logic
        if (existing?.leaveApplicationId) {
          // Employee has an approved leave but generated a punch!
          // We follow existing behavior which overrides status to PRESENT,
          // but we increment the conflict count for tracking.
          conflictCount++;
        }

        const data = {
          checkIn,
          checkOut,
          workHours,
          otHours,
          status,
          shiftId: employee.shiftId,
          isManual: false,
        };

        if (existing) {
          updates.push({ id: existing.id, data });
        } else {
          creates.push({
            employeeId: empId,
            date,
            ...data
          });
        }
      }
    }

    const startTimeExec = Date.now();
    const CHUNK_SIZE = 100;
    
    let createdCount = 0;
    let updatedCount = 0;

    // Batched creations
    for (let i = 0; i < creates.length; i += CHUNK_SIZE) {
      const chunk = creates.slice(i, i + CHUNK_SIZE);
      const res = await prisma.attendance.createMany({
        data: chunk,
        skipDuplicates: true
      });
      createdCount += res.count;
    }

    // Batched updates (Prisma doesn't have updateMany with varying data, so we use transactions)
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      await prisma.$transaction(
        chunk.map(update => prisma.attendance.update({
          where: { id: update.id },
          data: update.data
        }))
      );
      updatedCount += chunk.length;
    }

    // Post-processing: Calculate and apply policy values for affected rows
    const affectedAttendances = await prisma.attendance.findMany({
      where: {
        employeeId: { in: empIdsFromLogs },
        date: { in: targetDates },
        isLocked: false,
      },
      select: { id: true }
    });

    console.log(`🔄 [PROCESS] Applying policy calculations to ${affectedAttendances.length} attendance records...`);
    for (const att of affectedAttendances) {
      try {
        await applyDailyAttendancePolicyValues(att.id);
      } catch (err) {
        console.error(`Failed to apply policy to attendance ${att.id}:`, err);
      }
    }

    const durationMs = Date.now() - startTimeExec;
    console.log(`✅ [PROCESS] Generated ${createdCount} new, Updated ${updatedCount} existing records in ${durationMs}ms`);

    return { 
      success: true, 
      processedEmployees: processedEmployees.size,
      processedDates: processedDates.size,
      createdCount,
      updatedCount,
      skippedLockedCount,
      skippedManualCount,
      skippedPayrollCount,
      skippedLeaveCount,
      conflictCount,
      errorCount: 0,
      durationMs
    };
  } catch (error) {
    console.error("processBiometricAttendance error:", error);
    return { success: false, error: "Failed to process logs into attendance" };
  }
}
