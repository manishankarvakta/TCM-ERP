import { differenceInMinutes, subMinutes, addMinutes, addDays, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { prisma } from "@/lib/prisma";

export interface ShiftPolicy {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  graceMinutes: number;
  lateAfter: number;
  halfDayAfter: number;
  otStartAfter: number;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  breakGraceMinutes?: number;
  breakLateAfter?: number;
  breakType?: string | null;
  breakDuration?: number;
}

export type AttendanceStatusType = "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT";

export let HR_BUSINESS_TIMEZONE = "Asia/Dhaka";
export const PUNCH_BUFFER_BEFORE_MINUTES = 240; // 4 hours
export const PUNCH_BUFFER_AFTER_MINUTES = 240; // 4 hours

export function setSystemTimezone(tz: string) {
  HR_BUSINESS_TIMEZONE = tz;
}

export async function syncTimezoneFromDb() {
  try {
    const setting = await prisma.settings.findFirst({
      where: {
        code: "preferences",
        userId: null,
        isGlobal: true,
        isActive: true,
      },
      select: {
        settings: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    if (setting?.settings && typeof setting.settings === "object") {
      const prefs = setting.settings as any;
      if (prefs.timezone) {
        HR_BUSINESS_TIMEZONE = prefs.timezone;
      }
    }
  } catch (e) {
    console.error("Failed to load global timezone preference:", e);
  }
}

/**
 * Standardize DB date storage explicit bounds based on a Timezone
 */
export function formatBusinessDateKey(date: Date, timezone: string = HR_BUSINESS_TIMEZONE): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

/**
 * Ensure `Attendance.date` is always exactly at midnight UTC,
 * representing the Business Calendar Day safely across environments.
 */
export function toBusinessDateOnly(date: Date, timezone: string = HR_BUSINESS_TIMEZONE): Date {
  const dateKey = formatBusinessDateKey(date, timezone);
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/**
 * Parse a local device timestamp string strictly into an accurate Date object.
 * e.g., "2026-06-18 22:05:00" mapped directly into Asia/Dhaka.
 */
export function parseBiometricLocalTimestamp(rawTimestamp: string, timezone: string = HR_BUSINESS_TIMEZONE): Date {
  return fromZonedTime(rawTimestamp, timezone);
}

/**
 * Helper to combine a normalized Date (midnight UTC) with a local time string ("HH:MM")
 * into an absolute Timezone-aware Date object.
 */
export function combineDateAndTime(date: Date, timeStr: string, timezone: string = HR_BUSINESS_TIMEZONE): Date {
  // Extract strictly the calendar format from the normalized UTC date
  const dateKey = formatInTimeZone(date, "UTC", "yyyy-MM-dd");
  return fromZonedTime(`${dateKey} ${timeStr}:00`, timezone);
}

/**
 * Detect if a shift crosses midnight.
 * e.g., 22:00 to 06:00
 */
export function isOvernightShift(shift: { startTime: string, endTime: string }): boolean {
  if (!shift || !shift.startTime || !shift.endTime) return false;
  return shift.endTime <= shift.startTime;
}

/**
 * Get exact boundaries for a shift given the normalized attendance date.
 */
export function getShiftWindow(attendanceDate: Date, shift: ShiftPolicy, timezone: string = HR_BUSINESS_TIMEZONE) {
  const isOvernight = isOvernightShift(shift);
  
  const shiftStartDateTime = combineDateAndTime(attendanceDate, shift.startTime, timezone);
  let shiftEndDateTime = combineDateAndTime(attendanceDate, shift.endTime, timezone);
  
  if (isOvernight) {
    shiftEndDateTime = addDays(shiftEndDateTime, 1);
  }

  const lateAfterDateTime = addMinutes(shiftStartDateTime, shift.lateAfter);
  const halfDayAfterDateTime = addMinutes(shiftStartDateTime, shift.halfDayAfter);
  const otStartAfterDateTime = addMinutes(shiftEndDateTime, shift.otStartAfter);

  // Break window calculations
  let breakStartDateTime: Date | null = null;
  let breakEndDateTime: Date | null = null;
  let breakLateAfterDateTime: Date | null = null;

  if (shift.breakStartTime && shift.breakEndTime) {
    breakStartDateTime = combineDateAndTime(attendanceDate, shift.breakStartTime, timezone);
    breakEndDateTime = combineDateAndTime(attendanceDate, shift.breakEndTime, timezone);

    if (isOvernight) {
      if (shift.breakStartTime < shift.startTime) {
        breakStartDateTime = addDays(breakStartDateTime, 1);
      }
      if (shift.breakEndTime < shift.startTime) {
        breakEndDateTime = addDays(breakEndDateTime, 1);
      }
    }

    const breakLateAfterVal = shift.breakLateAfter ?? 15;
    breakLateAfterDateTime = addMinutes(breakEndDateTime, breakLateAfterVal);
  }

  return {
    shiftStartDateTime,
    shiftEndDateTime,
    lateAfterDateTime,
    halfDayAfterDateTime,
    otStartAfterDateTime,
    breakStartDateTime,
    breakEndDateTime,
    breakLateAfterDateTime,
    isOvernight
  };
}

/**
 * Map a raw punch time back to the correct normalized attendance date
 * using strict Shift-Window candidate routing.
 */
export function resolveAttendanceDateForPunch(punchTime: Date, shiftPolicy: ShiftPolicy | null, timezone: string = HR_BUSINESS_TIMEZONE): Date {
  if (!shiftPolicy) {
    return toBusinessDateOnly(punchTime, timezone);
  }

  // Determine standard business calendar day for the punch
  const candidateADate = toBusinessDateOnly(punchTime, timezone);
  // Candidate B is the previous business calendar day
  const candidateBDate = subDays(candidateADate, 1);

  const windowB = getShiftWindow(candidateBDate, shiftPolicy, timezone);

  // Apply pre/post buffering parameters around Candidate B's window
  const windowBStart = subMinutes(windowB.shiftStartDateTime, PUNCH_BUFFER_BEFORE_MINUTES);
  const windowBEnd = addMinutes(windowB.shiftEndDateTime, PUNCH_BUFFER_AFTER_MINUTES);
  
  if (punchTime >= windowBStart && punchTime <= windowBEnd) {
    return candidateBDate; // Safe routing to previous day's shift
  }

  return candidateADate;
}

/**
 * Calculate total work hours between checkIn and checkOut
 */
export function calculateWorkHours(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const diffInMinutes = differenceInMinutes(checkOut, checkIn);
  if (diffInMinutes < 0) return 0;
  return Number((diffInMinutes / 60).toFixed(2));
}

/**
 * Calculate total work hours excluding lunch break
 */
export function calculateWorkHoursWithBreak(
  checkIn: Date | null,
  checkOut: Date | null,
  breakCheckOut: Date | null,
  breakCheckIn: Date | null,
  shiftBreakDurationMinutes: number = 0,
  breakType: string = "NONE"
): number {
  if (!checkIn || !checkOut) return 0;

  let totalMinutes = 0;
  const totalElapsed = differenceInMinutes(checkOut, checkIn);

  if (breakType === "NONE") {
    totalMinutes = totalElapsed;
  } else if (breakType === "FIXED") {
    totalMinutes = totalElapsed - shiftBreakDurationMinutes;
  } else if (breakType === "TRACKED") {
    if (breakCheckOut && breakCheckIn && breakCheckOut > checkIn && breakCheckIn < checkOut && breakCheckIn > breakCheckOut) {
      const firstHalf = differenceInMinutes(breakCheckOut, checkIn);
      const secondHalf = differenceInMinutes(checkOut, breakCheckIn);
      totalMinutes = Math.max(0, firstHalf) + Math.max(0, secondHalf);
    } else {
      totalMinutes = totalElapsed - shiftBreakDurationMinutes;
    }
  } else {
    // Backwards compatibility fallback
    if (breakCheckOut && breakCheckIn && breakCheckOut > checkIn && breakCheckIn < checkOut && breakCheckIn > breakCheckOut) {
      const firstHalf = differenceInMinutes(breakCheckOut, checkIn);
      const secondHalf = differenceInMinutes(checkOut, breakCheckIn);
      totalMinutes = Math.max(0, firstHalf) + Math.max(0, secondHalf);
    } else {
      totalMinutes = totalElapsed - shiftBreakDurationMinutes;
    }
  }

  return Number((Math.max(0, totalMinutes) / 60).toFixed(2));
}

/**
 * Determine late minutes
 */
export function calculateLateMinutes(checkIn: Date, attendanceDate: Date, shift: ShiftPolicy): number {
  const { shiftStartDateTime } = getShiftWindow(attendanceDate, shift);
  const diff = differenceInMinutes(checkIn, shiftStartDateTime);
  
  if (diff > shift.graceMinutes) {
    return diff;
  }
  return 0;
}

/**
 * Determine late minutes after break
 */
export function calculateBreakLateMinutes(
  breakCheckIn: Date | null,
  attendanceDate: Date,
  shift: ShiftPolicy,
  timezone: string = HR_BUSINESS_TIMEZONE
): { lateMinutes: number; lateCountValue: number } {
  if (shift.breakType && shift.breakType !== "TRACKED") {
    return { lateMinutes: 0, lateCountValue: 0 };
  }

  if (!breakCheckIn || !shift.breakEndTime) {
    return { lateMinutes: 0, lateCountValue: 0 };
  }

  const { breakEndDateTime } = getShiftWindow(attendanceDate, shift, timezone);
  if (!breakEndDateTime) {
    return { lateMinutes: 0, lateCountValue: 0 };
  }

  const diff = differenceInMinutes(breakCheckIn, breakEndDateTime);
  const breakGrace = shift.breakGraceMinutes ?? 0;
  const breakLateAfter = shift.breakLateAfter ?? 15;

  let lateMinutes = 0;
  let lateCountValue = 0;

  if (diff > breakGrace) {
    lateMinutes = diff;
    if (diff >= breakLateAfter) {
      lateCountValue = 1;
    }
  }

  return { lateMinutes, lateCountValue };
}

/**
 * Determine Overtime Hours
 */
export function calculateOTHours(checkOut: Date, attendanceDate: Date, shift: ShiftPolicy): number {
  const { shiftEndDateTime, otStartAfterDateTime } = getShiftWindow(attendanceDate, shift);
  const diffFromEnd = differenceInMinutes(checkOut, shiftEndDateTime);
  
  // Only grant OT if they stayed past the otStartAfter threshold
  if (checkOut >= otStartAfterDateTime) {
    return Number((diffFromEnd / 60).toFixed(2));
  }
  return 0;
}

/**
 * Determine the Attendance Status based on shift policies
 */
export function determineAttendanceStatus(
  checkIn: Date | null,
  attendanceDate: Date,
  shift: ShiftPolicy | null,
  breakCheckIn?: Date | null
): AttendanceStatusType {
  if (!checkIn) {
    return "ABSENT";
  }

  if (!shift) {
    return "PRESENT"; // Default to present if no shift assigned but checkIn exists
  }

  const lateMinutes = calculateLateMinutes(checkIn, attendanceDate, shift);

  let isBreakLate = false;
  if (breakCheckIn && shift.breakType === "TRACKED") {
    const breakLateRes = calculateBreakLateMinutes(breakCheckIn, attendanceDate, shift);
    if (breakLateRes.lateCountValue > 0) {
      isBreakLate = true;
    }
  }

  if (lateMinutes >= shift.halfDayAfter) {
    return "HALF_DAY";
  } else if (lateMinutes >= shift.lateAfter || isBreakLate) {
    return "LATE";
  }

  return "PRESENT";
}
