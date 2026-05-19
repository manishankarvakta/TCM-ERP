import { differenceInMinutes, parse, startOfDay, addMinutes, differenceInHours } from "date-fns";

export interface ShiftPolicy {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  graceMinutes: number;
  lateAfter: number;
  halfDayAfter: number;
  otStartAfter: number;
}

export type AttendanceStatusType = "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT";

/**
 * Helper to combine a Date with a time string ("HH:MM")
 */
export function combineDateAndTime(date: Date, timeStr: string): Date {
  const baseDate = startOfDay(date);
  return parse(timeStr, "HH:mm", baseDate);
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
export function calculateLateMinutes(checkIn: Date, shiftStartTime: string, graceMinutes: number): number {
  const expectedStart = combineDateAndTime(checkIn, shiftStartTime);
  const diff = differenceInMinutes(checkIn, expectedStart);
  
  if (diff > graceMinutes) {
    return diff;
  }
  return 0;
}

/**
 * Determine Overtime Hours
 */
export function calculateOTHours(checkOut: Date, shiftEndTime: string, otStartAfter: number): number {
  const expectedEnd = combineDateAndTime(checkOut, shiftEndTime);
  const diff = differenceInMinutes(checkOut, expectedEnd);
  
  if (diff > otStartAfter) {
    return Number((diff / 60).toFixed(2));
  }
  return 0;
}

/**
 * Determine the Attendance Status based on shift policies
 */
export function determineAttendanceStatus(checkIn: Date | null, shift: ShiftPolicy | null): AttendanceStatusType {
  if (!checkIn) {
    return "ABSENT";
  }

  if (!shift) {
    return "PRESENT"; // Default to present if no shift assigned but checkIn exists
  }

  const lateMinutes = calculateLateMinutes(checkIn, shift.startTime, 0); // Raw late minutes

  if (lateMinutes >= shift.halfDayAfter) {
    return "HALF_DAY";
  } else if (lateMinutes >= shift.lateAfter) {
    return "LATE";
  }

  return "PRESENT";
}
