import { 
  calculateWorkHoursWithBreak, 
  calculateBreakLateMinutes, 
  determineAttendanceStatus,
  ShiftPolicy,
  setSystemTimezone
} from "../lib/hr/shift-utils";

setSystemTimezone("UTC");

function assertEqual(actual: any, expected: any, message: string) {
  if (actual === expected) {
    console.log(`✅ [PASS] ${message}`);
  } else {
    console.error(`❌ [FAIL] ${message}. Expected: ${expected}, Got: ${actual}`);
    process.exit(1);
  }
}

console.log("🏃 Running Shift Break Logic Unit Tests...");

const attendanceDate = new Date("2026-06-18T00:00:00.000Z");
const checkIn = new Date("2026-06-18T09:00:00.000Z");
const breakOut = new Date("2026-06-18T13:00:00.000Z");
const breakIn = new Date("2026-06-18T14:00:00.000Z");
const checkOut = new Date("2026-06-18T18:00:00.000Z");

// ==========================================
// MODE 1: NONE (No break)
// ==========================================
console.log("\n--- Testing Break Mode: NONE ---");
const shiftNone: ShiftPolicy = {
  startTime: "09:00",
  endTime: "18:00",
  graceMinutes: 0,
  lateAfter: 15,
  halfDayAfter: 120,
  otStartAfter: 30,
  breakType: "NONE",
  breakDuration: 0,
};

// Even if they punch for break, break is ignored in work hours calculation
const hoursNoneWithPunches = calculateWorkHoursWithBreak(checkIn, checkOut, breakOut, breakIn, 0, "NONE");
assertEqual(hoursNoneWithPunches, 9.00, "NONE mode with break punches should yield full 9.00 hours");

const hoursNoneNoPunches = calculateWorkHoursWithBreak(checkIn, checkOut, null, null, 0, "NONE");
assertEqual(hoursNoneNoPunches, 9.00, "NONE mode without punches should yield full 9.00 hours");

const breakLateNone = calculateBreakLateMinutes(breakIn, attendanceDate, shiftNone, "UTC");
assertEqual(breakLateNone.lateMinutes, 0, "NONE mode should skip break late calculation (minutes = 0)");
assertEqual(breakLateNone.lateCountValue, 0, "NONE mode should skip break late calculation (count = 0)");

const statusNone = determineAttendanceStatus(checkIn, attendanceDate, shiftNone, breakIn);
assertEqual(statusNone, "PRESENT", "NONE mode status should be PRESENT");

// ==========================================
// MODE 2: FIXED (Fixed break deduction)
// ==========================================
console.log("\n--- Testing Break Mode: FIXED ---");
const shiftFixed: ShiftPolicy = {
  startTime: "09:00",
  endTime: "18:00",
  graceMinutes: 0,
  lateAfter: 15,
  halfDayAfter: 120,
  otStartAfter: 30,
  breakType: "FIXED",
  breakDuration: 60, // 60 minutes
};

// Auto-deduct fixed duration (60m = 1.00h) from 9.00 hours
const hoursFixedNoPunches = calculateWorkHoursWithBreak(checkIn, checkOut, null, null, 60, "FIXED");
assertEqual(hoursFixedNoPunches, 8.00, "FIXED mode without punches should auto-deduct duration (yields 8.00)");

const hoursFixedWithPunches = calculateWorkHoursWithBreak(checkIn, checkOut, breakOut, breakIn, 60, "FIXED");
assertEqual(hoursFixedWithPunches, 8.00, "FIXED mode with punches should still auto-deduct duration only (yields 8.00)");

const breakLateFixed = calculateBreakLateMinutes(breakIn, attendanceDate, shiftFixed, "UTC");
assertEqual(breakLateFixed.lateMinutes, 0, "FIXED mode should skip break late calculation (minutes = 0)");
assertEqual(breakLateFixed.lateCountValue, 0, "FIXED mode should skip break late calculation (count = 0)");

// ==========================================
// MODE 3: TRACKED (Tracked break punches & lateness)
// ==========================================
console.log("\n--- Testing Break Mode: TRACKED ---");
const shiftTracked: ShiftPolicy = {
  startTime: "09:00",
  endTime: "18:00",
  graceMinutes: 0,
  lateAfter: 15,
  halfDayAfter: 120,
  otStartAfter: 30,
  breakStartTime: "13:00",
  breakEndTime: "14:00",
  breakGraceMinutes: 5,
  breakLateAfter: 15,
  breakType: "TRACKED",
  breakDuration: 60,
};

// Case 3a: Standard 4 punches with perfect timings
const hoursTrackedPerfect = calculateWorkHoursWithBreak(checkIn, checkOut, breakOut, breakIn, 60, "TRACKED");
assertEqual(hoursTrackedPerfect, 8.00, "TRACKED mode with perfect punches should yield 8.00 hours");

const breakLateTrackedPerfect = calculateBreakLateMinutes(breakIn, attendanceDate, shiftTracked, "UTC");
assertEqual(breakLateTrackedPerfect.lateMinutes, 0, "TRACKED mode perfect punch should have 0 late minutes");

// Case 3b: Late re-entry after break (Checked in at 14:06 - grace is 5 mins, late after is 15 mins)
const breakInLateGrace = new Date("2026-06-18T14:06:00.000Z");
const breakLateGrace = calculateBreakLateMinutes(breakInLateGrace, attendanceDate, shiftTracked, "UTC");
assertEqual(breakLateGrace.lateMinutes, 6, "TRACKED mode break late of 6 mins (exceeds grace of 5)");
assertEqual(breakLateGrace.lateCountValue, 0, "TRACKED mode break late count should be 0 because 6 < 15 mins");

// Case 3c: Late count triggered after break (Checked in at 14:16)
const breakInLateCount = new Date("2026-06-18T14:16:00.000Z");
const breakLateCount = calculateBreakLateMinutes(breakInLateCount, attendanceDate, shiftTracked, "UTC");
assertEqual(breakLateCount.lateMinutes, 16, "TRACKED mode break late of 16 mins");
assertEqual(breakLateCount.lateCountValue, 1, "TRACKED mode break late count should be 1 because 16 >= 15 mins");

const statusTrackedLate = determineAttendanceStatus(checkIn, attendanceDate, shiftTracked, breakInLateCount);
assertEqual(statusTrackedLate, "LATE", "TRACKED mode status should be LATE for late break re-entry");

// Case 3d: No break punches (Fallback deduction)
const hoursTrackedFallback = calculateWorkHoursWithBreak(checkIn, checkOut, null, null, 60, "TRACKED");
assertEqual(hoursTrackedFallback, 8.00, "TRACKED mode fallback workHours should be 8.00");

console.log("\n🎉 All unit tests passed successfully!");
