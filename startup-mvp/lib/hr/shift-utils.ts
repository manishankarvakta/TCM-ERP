import { differenceInMinutes, subMinutes, addMinutes, addDays, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export interface ShiftPolicy {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  graceMinutes: number;
  lateAfter: number;
  halfDayAfter: number;
  otStartAfter: number;
}

export type AttendanceStatusType = "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT";

export const HR_BUSINESS_TIMEZONE = "Asia/Dhaka";
export const PUNCH_BUFFER_BEFORE_MINUTES = 240; // 4 hours
export const PUNCH_BUFFER_AFTER_MINUTES = 240; // 4 hours

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

  return {
    shiftStartDateTime,
    shiftEndDateTime,
    lateAfterDateTime,
    halfDayAfterDateTime,
    otStartAfterDateTime,
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
export function determineAttendanceStatus(checkIn: Date | null, attendanceDate: Date, shift: ShiftPolicy | null): AttendanceStatusType {
  if (!checkIn) {
    return "ABSENT";
  }

  if (!shift) {
    return "PRESENT"; // Default to present if no shift assigned but checkIn exists
  }

  const lateMinutes = calculateLateMinutes(checkIn, attendanceDate, shift);

  if (lateMinutes >= shift.halfDayAfter) {
    return "HALF_DAY";
  } else if (lateMinutes >= shift.lateAfter) {
    return "LATE";
  }

  return "PRESENT";
}
