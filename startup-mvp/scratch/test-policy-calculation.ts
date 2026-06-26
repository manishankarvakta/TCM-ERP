import {
  calculateSalaryBreakdown,
  calculateOvertimePreview,
  calculateTiffinPreview,
  calculateNightBillPreview,
  calculateHolidayBillPreview,
  calculateLatePolicyPreview,
  calculatePayrollPolicyPreview,
} from "../lib/hr-payroll/policy-calculation";

console.log("==========================================");
console.log("RUNNING PHASE 3 POLICY ENGINE TEST CASES");
console.log("==========================================\n");

// 1. Salary breakdown
const breakdown = calculateSalaryBreakdown({
  grossSalary: 20000,
  salaryStructurePolicy: {
    basicPercent: 55,
    houseRentPercent: 26,
    medicalPercent: 5,
    transportPercent: 4,
    foodPercent: 10,
  },
});
console.log("Test Case 1: Salary Breakdown (Gross 20,000)");
console.log("Expected: Basic=11000, Rent=5200, Med=1000, Trans=800, Food=2000");
console.log(`Actual:   Basic=${breakdown.basicSalary}, Rent=${breakdown.houseRent}, Med=${breakdown.medical}, Trans=${breakdown.transport}, Food=${breakdown.food}`);
console.log(`Match?    ${breakdown.basicSalary === 11000 && breakdown.houseRent === 5200 && breakdown.medical === 1000 && breakdown.transport === 800 && breakdown.food === 2000 ? "PASS" : "FAIL"}\n`);

// 2. OT formula
const otResult = calculateOvertimePreview({
  grossSalary: 15000,
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
  shiftHours: 8,
  otHours: 2,
});
console.log("Test Case 2: OT Formula Calculation (Gross 15,000, 2 OT Hours)");
console.log("Expected: BasicForOT=9000, DayBasic=300, HourlyBasic=37.50, OTRate=75, OTAmount=150");
console.log(`Actual:   BasicForOT=${otResult.basicForOT}, DayBasic=${otResult.dayBasic}, HourlyBasic=${otResult.hourlyBasic}, OTRate=${otResult.otRate}, OTAmount=${otResult.otAmount}`);
console.log(`Match?    ${otResult.basicForOT === 9000 && otResult.dayBasic === 300 && otResult.hourlyBasic === 37.50 && otResult.otRate === 75 && otResult.otAmount === 150 ? "PASS" : "FAIL"}\n`);

// 3. Tiffin allowed
const tiffinAllowed = calculateTiffinPreview({
  tiffinPolicy: {
    isEligible: true,
    allowAfterTime: "20:00",
    amount: 100,
    maxCountPerDay: 1,
  },
  checkoutDateTime: new Date("2026-06-25T20:10:00Z"),
  attendanceDate: new Date("2026-06-25T00:00:00Z"),
  timezone: "UTC", // Use UTC for absolute timestamp testing
});
console.log("Test Case 3: Tiffin Checkout after 20:00 (Allowed)");
console.log("Expected: allowed=true, amount=100");
console.log(`Actual:   allowed=${tiffinAllowed.allowed}, amount=${tiffinAllowed.amount}`);
console.log(`Match?    ${tiffinAllowed.allowed === true && tiffinAllowed.amount === 100 ? "PASS" : "FAIL"}\n`);

// 4. Tiffin disallowed
const tiffinDisallowed = calculateTiffinPreview({
  tiffinPolicy: {
    isEligible: true,
    allowAfterTime: "20:00",
    amount: 100,
    maxCountPerDay: 1,
  },
  checkoutDateTime: new Date("2026-06-25T19:59:00Z"),
  attendanceDate: new Date("2026-06-25T00:00:00Z"),
  timezone: "UTC",
});
console.log("Test Case 4: Tiffin Checkout before 20:00 (Disallowed)");
console.log("Expected: allowed=false, amount=0");
console.log(`Actual:   allowed=${tiffinDisallowed.allowed}, amount=${tiffinDisallowed.amount}`);
console.log(`Match?    ${tiffinDisallowed.allowed === false && tiffinDisallowed.amount === 0 ? "PASS" : "FAIL"}\n`);

// 5. Night bill overnight checkout
const nightAllowed = calculateNightBillPreview({
  nightBillPolicy: {
    isEligible: true,
    allowAfterTime: "23:55",
    amount: 150,
    supportsOvernightCheckout: true,
    maxCountPerDay: 1,
  },
  checkoutDateTime: new Date("2026-06-26T00:10:00Z"), // Next day checkout
  attendanceDate: new Date("2026-06-25T00:00:00Z"),
  timezone: "UTC",
});
console.log("Test Case 5: Night Bill Overnight Checkout (Allowed)");
console.log("Expected: allowed=true, amount=150, overnightApplied=true");
console.log(`Actual:   allowed=${nightAllowed.allowed}, amount=${nightAllowed.amount}, overnightApplied=${nightAllowed.overnightApplied}`);
console.log(`Match?    ${nightAllowed.allowed === true && nightAllowed.amount === 150 && nightAllowed.overnightApplied === true ? "PASS" : "FAIL"}\n`);

// 6. Holiday bill ONE_DAY_GROSS
const holidayResult = calculateHolidayBillPreview({
  grossSalary: 30000,
  holidayBillPolicy: {
    isEligible: true,
    calculationType: "ONE_DAY_GROSS",
    fixedAmount: 0,
    allowWithOT: true,
    includeWeekend: true,
    includePublicHoliday: true,
  },
  isWeekend: true,
  isPublicHoliday: false,
  workedOnHoliday: true,
});
console.log("Test Case 6: Holiday Bill (Gross 30,000, ONE_DAY_GROSS)");
console.log("Expected: allowed=true, amount=1000");
console.log(`Actual:   allowed=${holidayResult.allowed}, amount=${holidayResult.amount}`);
console.log(`Match?    ${holidayResult.allowed === true && holidayResult.amount === 1000 ? "PASS" : "FAIL"}\n`);

// 7. Late policy penalties
const lateResult = calculateLatePolicyPreview({
  latePolicy: {
    isEnabled: true,
    enableLateToAbsentConversion: true,
    lateDaysForOneAbsent: 3,
    lateCountForBonusLoss: 3,
    deductSalaryForLate: true,
    deductAttendanceBonusForLate: true,
  },
  lateCountInPeriod: 3,
  dailyRate: 500,
  attendanceBonusAmount: 1000,
});
console.log("Test Case 7: Late Policy (3 Lates, Conversion & Bonus Loss)");
console.log("Expected: convertedAbsentDays=1, attendanceBonusLost=true, attendanceBonusDeduction=1000, lateDeductionAmount=500");
console.log(`Actual:   convertedAbsentDays=${lateResult.convertedAbsentDays}, attendanceBonusLost=${lateResult.attendanceBonusLost}, bonusDeduction=${lateResult.attendanceBonusDeduction}, lateDeduction=${lateResult.lateDeductionAmount}`);
console.log(`Match?    ${lateResult.convertedAbsentDays === 1 && lateResult.attendanceBonusLost === true && lateResult.attendanceBonusDeduction === 1000 && lateResult.lateDeductionAmount === 500 ? "PASS" : "FAIL"}\n`);

// 8. Missing policy fallbacks
const fallbackResult = calculatePayrollPolicyPreview({
  employee: { id: "test-emp", name: "John Doe", employeeCode: "EMP001" },
  employeeTypePolicies: {
    name: "Unassigned Mappings",
    // All policies missing
  },
  grossSalary: 20000,
  checkIn: "2026-06-25T09:00:00",
  checkOut: "2026-06-25T17:00:00",
  otHours: 4,
  lateCountInPeriod: 2,
  isWeekend: false,
  isPublicHoliday: false,
  workedOnHoliday: false,
  otherAllowance: 100,
  deductions: 50,
});
console.log("Test Case 8: Missing Policy Fallbacks");
console.log("Expected: Salary breakdown defaults split basic=11000; OT=0, Holiday=0, Night=0, Tiffin=0, LateDeductions=0");
console.log(`Salary:   basicSalary=${fallbackResult.salaryBreakdown.basicSalary}, houseRent=${fallbackResult.salaryBreakdown.houseRent}`);
console.log(`OT Amt:   ${fallbackResult.overtime.otAmount}`);
console.log(`Tiffin:   ${fallbackResult.tiffin.amount}`);
console.log(`Late Ded: ${fallbackResult.latePolicy.lateDeductionAmount}`);
console.log(`Net Sal:  ${fallbackResult.netSalaryPreview} BDT`);
console.log(`Match?    ${fallbackResult.salaryBreakdown.basicSalary === 11000 && fallbackResult.overtime.otAmount === 0 && fallbackResult.latePolicy.lateDeductionAmount === 0 && fallbackResult.netSalaryPreview === 20050 ? "PASS" : "FAIL"}`);
console.log("==========================================");
