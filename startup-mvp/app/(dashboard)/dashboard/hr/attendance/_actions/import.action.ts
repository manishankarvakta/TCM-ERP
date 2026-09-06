"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import {
  ShiftPolicy,
  combineDateAndTime,
  calculateWorkHoursWithBreak,
  calculateOTHours,
  determineAttendanceStatus,
  getShiftWindow,
  syncTimezoneFromDb,
  AttendanceStatusType,
} from "@/lib/hr/shift-utils";
import { applyDailyAttendancePolicyValues } from "@/lib/hr-payroll/attendance-policy-service";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";

export interface DirectAttendanceImportRow {
  employeeCode: string;
  date: string; // YYYY-MM-DD
  checkIn?: string | null; // HH:MM or HH:MM:SS or full ISO string
  checkOut?: string | null; // HH:MM or HH:MM:SS or full ISO string
  status?: string | null; // Optional: PRESENT, LATE, HALF_DAY, ABSENT
  notes?: string | null;
}

export async function importDirectAttendanceAction(rows: DirectAttendanceImportRow[]) {
  try {
    await syncTimezoneFromDb();

    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canEdit = await hasPermission(session.user.id, "hr.attendance", "edit");
    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "No attendance rows provided for import" };
    }

    // Collect all unique employee codes
    const codeSet = new Set<string>();
    rows.forEach((r) => {
      if (r.employeeCode) codeSet.add(r.employeeCode.trim());
    });

    // Bulk pre-fetch matching active employees
    const employees = await prisma.employee.findMany({
      where: {
        employeeCode: { in: Array.from(codeSet), mode: "insensitive" },
      },
      include: {
        shift: true,
      },
    });

    const employeeByCodeMap = new Map<string, typeof employees[0]>();
    employees.forEach((emp) => {
      if (emp.employeeCode) {
        employeeByCodeMap.set(emp.employeeCode.toLowerCase(), emp);
      }
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedLocked = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rawCode = row.employeeCode?.trim();
      const rawDate = row.date?.trim();

      if (!rawCode || !rawDate) {
        failedCount++;
        errors.push(`Row ${i + 1}: Employee code and Date are required.`);
        continue;
      }

      const emp = employeeByCodeMap.get(rawCode.toLowerCase());
      if (!emp) {
        failedCount++;
        errors.push(`Row ${i + 1}: Employee with code "${rawCode}" not found.`);
        continue;
      }

      if (emp.status !== "active") {
        failedCount++;
        errors.push(`Row ${i + 1}: Employee "${emp.name}" (${rawCode}) is inactive or resigned.`);
        continue;
      }

      // Parse normalized target date (supports YYYY-MM-DD, M/D/YY, MM/DD/YYYY, etc.)
      const parseFlexibleDateToUtcMidnight = (rawDateStr: string): Date | null => {
        if (!rawDateStr) return null;
        const str = rawDateStr.trim().split("T")[0].split(" ")[0];
        if (!str) return null;

        // 1. YYYY-MM-DD or YYYY/MM/DD
        const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (isoMatch) {
          const yyyy = isoMatch[1];
          const mm = isoMatch[2].padStart(2, "0");
          const dd = isoMatch[3].padStart(2, "0");
          const parsed = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
          return isNaN(parsed.getTime()) ? null : parsed;
        }

        // 2. M/D/YY, MM/DD/YY, M/D/YYYY, MM/DD/YYYY (e.g. 9/7/26, 09/07/2026)
        const slashMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
        if (slashMatch) {
          let p1 = parseInt(slashMatch[1], 10);
          let p2 = parseInt(slashMatch[2], 10);
          let yr = parseInt(slashMatch[3], 10);

          if (yr < 100) {
            yr = yr >= 70 ? 1900 + yr : 2000 + yr;
          }

          let month = p1;
          let day = p2;
          if (month > 12 && day <= 12) {
            month = p2;
            day = p1;
          }

          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const mm = String(month).padStart(2, "0");
            const dd = String(day).padStart(2, "0");
            const yyyy = String(yr);
            const parsed = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
            return isNaN(parsed.getTime()) ? null : parsed;
          }
        }

        // 3. Fallback Date parse
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
          const dd = String(d.getUTCDate()).padStart(2, "0");
          return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
        }

        return null;
      };

      const targetDate = parseFlexibleDateToUtcMidnight(rawDate);

      if (!targetDate || isNaN(targetDate.getTime())) {
        failedCount++;
        errors.push(`Row ${i + 1}: Invalid date format "${rawDate}". Use YYYY-MM-DD (e.g., 2026-09-07).`);
        continue;
      }

      // Helper to parse time strings (HH:MM or HH:MM:SS or full ISO)
      const parseTimeString = (timeVal?: string | null): Date | null => {
        if (!timeVal) return null;
        const str = timeVal.trim();
        if (!str) return null;

        // If it's already a full ISO string or valid timestamp string
        if (str.includes("T") || str.includes("-")) {
          const d = new Date(str);
          if (!isNaN(d.getTime())) return d;
        }

        // If it's HH:MM or HH:MM:SS format
        const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (timeMatch) {
          const hh = timeMatch[1].padStart(2, "0");
          const mm = timeMatch[2];
          return combineDateAndTime(targetDate, `${hh}:${mm}`);
        }

        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      };

      const checkInDate = parseTimeString(row.checkIn);
      const checkOutDate = parseTimeString(row.checkOut);

      // Fetch existing attendance record
      const existing = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: targetDate,
          },
        },
      });

      if (existing?.isLocked) {
        skippedLocked++;
        errors.push(`Row ${i + 1}: Attendance for "${emp.name}" on ${rawDate} is locked for payroll.`);
        continue;
      }

      // Shift policy
      const shiftPolicy: ShiftPolicy | null = emp.shift
        ? {
            startTime: emp.shift.startTime,
            endTime: emp.shift.endTime,
            graceMinutes: emp.shift.graceMinutes,
            lateAfter: emp.shift.lateAfter,
            halfDayAfter: emp.shift.halfDayAfter,
            otStartAfter: emp.shift.otStartAfter,
            breakStartTime: emp.shift.breakStartTime,
            breakEndTime: emp.shift.breakEndTime,
            breakGraceMinutes: emp.shift.breakGraceMinutes,
            breakLateAfter: emp.shift.breakLateAfter,
            breakType: emp.shift.breakType,
            breakDuration: emp.shift.breakDuration,
          }
        : null;

      // Status logic: Use user-provided status if valid, else AUTO-CALCULATE
      let status: AttendanceStatusType = "PRESENT";
      const userStatus = row.status?.trim().toUpperCase();
      const validStatuses = ["PRESENT", "LATE", "HALF_DAY", "ABSENT", "HOLIDAY", "WEEKEND"];

      if (userStatus && validStatuses.includes(userStatus)) {
        status = userStatus as AttendanceStatusType;
      } else {
        // Automatic calculation based on check-in and shift policy
        status = determineAttendanceStatus(checkInDate, targetDate, shiftPolicy);
      }

      // Work hours & overtime calculation
      let breakDurationMins = 0;
      if (shiftPolicy) {
        if (shiftPolicy.breakType === "FIXED") {
          breakDurationMins = shiftPolicy.breakDuration ?? 0;
        } else if (shiftPolicy.breakStartTime && shiftPolicy.breakEndTime) {
          const { breakStartDateTime, breakEndDateTime } = getShiftWindow(targetDate, shiftPolicy);
          if (breakStartDateTime && breakEndDateTime) {
            breakDurationMins = Math.abs(breakEndDateTime.getTime() - breakStartDateTime.getTime()) / 60000;
          } else {
            breakDurationMins = shiftPolicy.breakDuration ?? 60;
          }
        }
      }

      const workHours = calculateWorkHoursWithBreak(
        checkInDate,
        checkOutDate,
        null,
        null,
        breakDurationMins,
        shiftPolicy?.breakType || "NONE"
      );

      let otHours = 0;
      if (checkOutDate && shiftPolicy) {
        otHours = calculateOTHours(checkOutDate, targetDate, shiftPolicy, workHours);
      }

      let attendanceId = "";

      if (existing) {
        const updated = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkIn: checkInDate,
            checkOut: checkOutDate,
            workHours,
            otHours,
            status,
            notes: row.notes !== undefined ? row.notes : existing.notes,
            shiftId: emp.shiftId,
            updatedBy: session.user.id,
            isManual: true,
          },
        });
        attendanceId = updated.id;
        updatedCount++;
        await logItemUpdated(session.user.id, "Attendance", updated.id, [], `CSV Import for ${emp.name}`, {
          old: existing,
          new: updated,
        });
      } else {
        const created = await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            date: targetDate,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            workHours,
            otHours,
            status,
            notes: row.notes || "Imported via CSV",
            shiftId: emp.shiftId,
            createdBy: session.user.id,
            isManual: true,
          },
        });
        attendanceId = created.id;
        createdCount++;
        await logItemCreated(session.user.id, "Attendance", created.id, `CSV Import for ${emp.name}`, created);
      }

      // Apply policy calculations (Tiffin, Night, Holiday allowances)
      try {
        await applyDailyAttendancePolicyValues(attendanceId, { force: true });
      } catch (err) {
        console.error(`Failed to apply policy to imported attendance ${attendanceId}:`, err);
      }
    }

    revalidateBothPaths("hr/attendance");

    return {
      success: true,
      summary: {
        totalRows: rows.length,
        createdCount,
        updatedCount,
        skippedLocked,
        failedCount,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
      },
    };
  } catch (error) {
    console.error("importDirectAttendanceAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import attendance records",
    };
  }
}
