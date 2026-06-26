import {
  calculateDailyAttendancePolicyValues,
} from "../lib/hr-payroll/attendance-policy-service";

console.log("==========================================");
console.log("RUNNING DAILY ATTENDANCE POLICY ENGINE TESTS");
console.log("==========================================\n");

const baseEmployee = {
  id: "emp-1",
  name: "Jane Doe",
  salary: 15000,
};

const baseShift = {
  startTime: "09:00",
  endTime: "17:00",
  graceMinutes: 15,
  lateAfter: 15,
  halfDayAfter: 120,
  otStartAfter: 30,
};

const employeeTypePolicies = {
  name: "Management Class",
  salaryStructurePolicy: {
    basicPercent: 60,
    houseRentPercent: 20,
    medicalPercent: 10,
    transportPercent: 5,
    foodPercent: 5,
  },
  attendancePolicy: {
    isEnabled: true,
    isEligibleForAttendanceBonus: true,
    attendanceBonusAmount: 1000,
    applyAbsentPenalty: true,
    applyLatePenalty: true,
  },
  latePolicy: {
    isEnabled: true,
    enableLateToAbsentConversion: true,
    lateDaysForOneAbsent: 3,
    lateCountForBonusLoss: 3,
    deductSalaryForLate: true,
    deductAttendanceBonusForLate: true,
  },
  overtimePolicy: {
    isEligible: true,
    calculationType: "FORMULA",
    basicPercentageFromGross: 60,
    monthlyWorkingDays: 30,
    hourBasis: "ASSIGNED_SHIFT_HOUR",
    fixedHourValue: 8,
    multiplier: 2,
    minimumOTMinutes: 0,
  },
  tiffinBillPolicy: {
    isEligible: true,
    allowAfterTime: "20:00",
    amount: 120,
    maxCountPerDay: 1,
  },
  nightBillPolicy: {
    isEligible: true,
    allowAfterTime: "23:55",
    amount: 200,
    supportsOvernightCheckout: true,
    maxCountPerDay: 1,
  },
  holidayBillPolicy: {
    isEligible: true,
    calculationType: "ONE_DAY_GROSS",
    fixedAmount: 0,
    allowWithOT: true,
    includeWeekend: true,
    includePublicHoliday: true,
  },
};

// Test Case 1: Overtime Amount for Worker (Gross 15000, 2 OT Hours)
const test1 = calculateDailyAttendancePolicyValues({
  attendance: {
    checkIn: "2026-06-25T09:00:00+06:00",
    checkOut: "2026-06-25T19:00:00+06:00",
    otHours: 2,
    status: "PRESENT",
    date: new Date("2026-06-25T00:00:00Z"),
  },
  employee: baseEmployee,
  employeeTypePolicies,
  shift: baseShift,
  isWeekend: false,
  isPublicHoliday: false,
  workedOnHoliday: false,
  grossSalary: 15000,
});
console.log("Test Case 1: OT Amount (Gross 15,000, 2 OT hours)");
console.log("Expected: calculatedOvertimeAmount = 150");
console.log(`Actual:   calculatedOvertimeAmount = ${test1.calculatedOvertimeAmount}`);
console.log(`Match?    ${test1.calculatedOvertimeAmount === 150 ? "PASS" : "FAIL"}\n`);

// Test Case 2: Tiffin bill checkout at 20:10 (Allowed)
const test2 = calculateDailyAttendancePolicyValues({
  attendance: {
    checkIn: "2026-06-25T09:00:00+06:00",
    checkOut: "2026-06-25T20:10:00+06:00",
    otHours: 0,
    status: "PRESENT",
    date: new Date("2026-06-25T00:00:00Z"),
  },
  employee: baseEmployee,
  employeeTypePolicies,
  shift: baseShift,
  isWeekend: false,
  isPublicHoliday: false,
  workedOnHoliday: false,
  grossSalary: 15000,
});
console.log("Test Case 2: Tiffin Bill past 20:00 (Allowed)");
console.log("Expected: tiffinBillAmount = 120");
console.log(`Actual:   tiffinBillAmount = ${test2.tiffinBillAmount}`);
console.log(`Match?    ${test2.tiffinBillAmount === 120 ? "PASS" : "FAIL"}\n`);

// Test Case 3: Tiffin bill checkout at 19:59 (Disallowed)
const test3 = calculateDailyAttendancePolicyValues({
  attendance: {
    checkIn: "2026-06-25T09:00:00+06:00",
    checkOut: "2026-06-25T19:59:00+06:00",
    otHours: 0,
    status: "PRESENT",
    date: new Date("2026-06-25T00:00:00Z"),
  },
  employee: baseEmployee,
  employeeTypePolicies,
  shift: baseShift,
  isWeekend: false,
  isPublicHoliday: false,
  workedOnHoliday: false,
  grossSalary: 15000,
});
console.log("Test Case 3: Tiffin Bill before 20:00 (Disallowed)");
console.log("Expected: tiffinBillAmount = 0");
console.log(`Actual:   tiffinBillAmount = ${test3.tiffinBillAmount}`);
console.log(`Match?    ${test3.tiffinBillAmount === 0 ? "PASS" : "FAIL"}\n`);

// Test Case 4: Night bill overnight checkout at 00:10 next day (Allowed)
const test4 = calculateDailyAttendancePolicyValues({
  attendance: {
    checkIn: "2026-06-25T22:00:00+06:00",
    checkOut: "2026-06-26T00:10:00+06:00",
    otHours: 0,
    status: "PRESENT",
    date: new Date("2026-06-25T00:00:00Z"),
  },
  employee: baseEmployee,
  employeeTypePolicies,
  shift: baseShift,
  isWeekend: false,
  isPublicHoliday: false,
  workedOnHoliday: false,
  grossSalary: 15000,
});
console.log("Test Case 4: Night Bill Overnight Checkout past 23:55 (Allowed)");
console.log("Expected: nightBillAmount = 200");
console.log(`Actual:   nightBillAmount = ${test4.nightBillAmount}`);
console.log(`Match?    ${test4.nightBillAmount === 200 ? "PASS" : "FAIL"}\n`);

// Test Case 5: Holiday bill ONE_DAY_GROSS (Gross 30,000, worked holiday)
const test5 = calculateDailyAttendancePolicyValues({
  attendance: {
    checkIn: "2026-06-25T09:00:00+06:00",
    checkOut: "2026-06-25T17:00:00+06:00",
    otHours: 0,
    status: "PRESENT",
    date: new Date("2026-06-25T00:00:00Z"),
  },
  employee: { ...baseEmployee, salary: 30000 },
  employeeTypePolicies,
  shift: baseShift,
  isWeekend: true,
  isPublicHoliday: false,
  workedOnHoliday: true,
  grossSalary: 30000,
});
console.log("Test Case 5: Holiday Bill (Gross 30,000, worked holiday)");
console.log("Expected: holidayBillAmount = 1000");
console.log(`Actual:   holidayBillAmount = ${test5.holidayBillAmount}`);
console.log(`Match?    ${test5.holidayBillAmount === 1000 ? "PASS" : "FAIL"}\n`);

// Test Case 6: Fallbacks when no policy active
const test6 = calculateDailyAttendancePolicyValues({
  attendance: {
    checkIn: "2026-06-25T09:00:00+06:00",
    checkOut: "2026-06-25T17:00:00+06:00",
    otHours: 2,
    status: "PRESENT",
    date: new Date("2026-06-25T00:00:00Z"),
  },
  employee: baseEmployee,
  employeeTypePolicies: {
    name: "No Policies",
  },
  shift: baseShift,
  isWeekend: true,
  isPublicHoliday: false,
  workedOnHoliday: true,
  grossSalary: 15000,
});
console.log("Test Case 6: Missing Policy Fallbacks");
console.log("Expected: OT=0, Tiffin=0, Night=0, Holiday=0");
console.log(`Actual:   OT=${test6.calculatedOvertimeAmount}, Tiffin=${test6.tiffinBillAmount}, Night=${test6.nightBillAmount}, Holiday=${test6.holidayBillAmount}`);
console.log(`Match?    ${test6.calculatedOvertimeAmount === 0 && test6.tiffinBillAmount === 0 && test6.nightBillAmount === 0 && test6.holidayBillAmount === 0 ? "PASS" : "FAIL"}\n`);
console.log("==========================================");
