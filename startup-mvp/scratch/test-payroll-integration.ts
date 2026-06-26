import { calculateLatePolicyPreview } from "../lib/hr-payroll/policy-calculation";

console.log("==========================================");
console.log("RUNNING PHASE 5B MONTHLY PAYROLL TESTS");
console.log("==========================================\n");

function applyNetPayRounding(value: number, mode: string): number {
  if (mode === "nearest10")  return Math.round(value / 10) * 10;
  if (mode === "nearest100") return Math.round(value / 100) * 100;
  return value;
}

// Emulate the calculations inside generatePayroll for a single employee
interface EmpMock {
  id: string;
  name: string;
  salary: number;
  employeeType?: {
    name: string;
    salaryStructurePolicy?: any;
    attendancePolicy?: any;
    latePolicy?: any;
    overtimePolicy?: any;
  } | null;
}

interface AttMock {
  absentDays: number;
  otHours: number;
  lateCountTotal: number;
  totalCalculatedOvertimeAmount: number;
  totalTiffinAllowance: number;
  totalNightAllowance: number;
  totalHolidayAllowance: number;
}

interface CalcParams {
  emp: EmpMock;
  att: AttMock;
  defaultSalaryStructurePolicy?: any;
  empSalaryCustomSheet?: any;
  loans?: Array<{ monthlyInstallment: number; remainingBalance: number }>;
  taxPercentage?: number;
  pfPercentage?: number;
  calcGlobalSettings: {
    defaultHouseRentPct: number;
    defaultMedicalPct: number;
    defaultTransportPct: number;
    defaultFoodAllowancePct: number;
    workingHoursPerDay: number;
    dailyOtThresholdHours: number;
    otMultiplier: number;
    defaultFestivalBonusPct: number;
    netPayRounding: string;
  };
  payDivisor: number;
  includeFestivalBonus?: boolean;
  payrollSettingMock?: {
    defaultPayDivisor?: number;
    defaultMonthlyWorkingDays?: number;
  } | null;
}

function runPayrollItemCalculation(params: CalcParams) {
  const {
    emp,
    att,
    defaultSalaryStructurePolicy,
    empSalaryCustomSheet,
    loans = [],
    taxPercentage = 0,
    pfPercentage = 0,
    calcGlobalSettings,
    payDivisor,
    includeFestivalBonus = false,
    payrollSettingMock = null
  } = params;

  const rawSalary = Number(emp.salary) || 0;

  // Resolve salary structure priority
  let basic = 0;
  let houseRent = 0;
  let medical = 0;
  let transport = 0;
  let foodAllowance = 0;

  const empTypePolicies = emp.employeeType;

  if (empTypePolicies?.salaryStructurePolicy) {
    const policy = empTypePolicies.salaryStructurePolicy;
    const basicPercent = Number(policy.basicPercent) || 55;
    const rentPercent = Number(policy.houseRentPercent) || 26;
    const medicalPercent = Number(policy.medicalPercent) || 5;
    const transportPercent = Number(policy.transportPercent) || 4;
    const foodPercent = Number(policy.foodPercent) || 10;

    basic = Number((rawSalary * (basicPercent / 100)).toFixed(2));
    houseRent = Number((rawSalary * (rentPercent / 100)).toFixed(2));
    medical = Number((rawSalary * (medicalPercent / 100)).toFixed(2));
    transport = Number((rawSalary * (transportPercent / 100)).toFixed(2));
    foodAllowance = Number((rawSalary * (foodPercent / 100)).toFixed(2));
  } else if (defaultSalaryStructurePolicy) {
    const basicPercent = Number(defaultSalaryStructurePolicy.basicPercent) || 55;
    const rentPercent = Number(defaultSalaryStructurePolicy.houseRentPercent) || 26;
    const medicalPercent = Number(defaultSalaryStructurePolicy.medicalPercent) || 5;
    const transportPercent = Number(defaultSalaryStructurePolicy.transportPercent) || 4;
    const foodPercent = Number(defaultSalaryStructurePolicy.foodPercent) || 10;

    basic = Number((rawSalary * (basicPercent / 100)).toFixed(2));
    houseRent = Number((rawSalary * (rentPercent / 100)).toFixed(2));
    medical = Number((rawSalary * (medicalPercent / 100)).toFixed(2));
    transport = Number((rawSalary * (transportPercent / 100)).toFixed(2));
    foodAllowance = Number((rawSalary * (foodPercent / 100)).toFixed(2));
  } else if (empSalaryCustomSheet) {
    basic = rawSalary;
    houseRent = Number(empSalaryCustomSheet.houseRent) || 0;
    medical = Number(empSalaryCustomSheet.medical) || 0;
    transport = Number(empSalaryCustomSheet.transport) || 0;
    foodAllowance = Number(empSalaryCustomSheet.foodAllowance) || 0;
  } else {
    basic = Number((rawSalary * 0.55).toFixed(2));
    houseRent = Number((rawSalary * 0.26).toFixed(2));
    medical = Number((rawSalary * 0.05).toFixed(2));
    transport = Number((rawSalary * 0.04).toFixed(2));
    foodAllowance = Number((rawSalary * 0.10).toFixed(2));
  }

  // Aggregated policy allowances
  const tiffinAllowance = att.totalTiffinAllowance;
  const nightAllowance = att.totalNightAllowance;
  const holidayAllowance = att.totalHolidayAllowance;

  // OT Amount
  let otAmount = 0;
  if (empTypePolicies?.overtimePolicy?.isEligible) {
    otAmount = att.totalCalculatedOvertimeAmount;
  } else {
    const hourlyRateForOT = basic / (payDivisor * calcGlobalSettings.workingHoursPerDay);
    const effectiveOtHours = Math.max(0, att.otHours - calcGlobalSettings.dailyOtThresholdHours);
    otAmount = Number((effectiveOtHours * hourlyRateForOT * calcGlobalSettings.otMultiplier).toFixed(2));
  }

  // Festival Bonus
  const festivalBonus = includeFestivalBonus
    ? basic * (calcGlobalSettings.defaultFestivalBonusPct / 100)
    : 0;

  // Absent Deduction
  const dailyRateForAbsent = basic / payDivisor;
  let absentDeduction = 0;
  const applyAbsentPenalty = empTypePolicies?.attendancePolicy 
    ? empTypePolicies.attendancePolicy.applyAbsentPenalty 
    : true;
  if (applyAbsentPenalty) {
    absentDeduction = Number((att.absentDays * dailyRateForAbsent).toFixed(2));
  }

  // Late policy monthly calculation
  let lateDeduction = 0;
  let attendanceBonusLost = false;
  let convertedAbsentDays = 0;
  const applyLatePenalty = empTypePolicies?.attendancePolicy
    ? empTypePolicies.attendancePolicy.applyLatePenalty
    : true;

  // Divisor priority logic
  let resolvedLateDeductionDivisor = 30;
  if (payrollSettingMock?.defaultPayDivisor) {
    resolvedLateDeductionDivisor = payrollSettingMock.defaultPayDivisor;
  } else if (payrollSettingMock?.defaultMonthlyWorkingDays) {
    resolvedLateDeductionDivisor = payrollSettingMock.defaultMonthlyWorkingDays;
  } else if (payDivisor) {
    resolvedLateDeductionDivisor = payDivisor;
  }

  if (applyLatePenalty && empTypePolicies?.latePolicy?.isEnabled) {
    const latePolicy = empTypePolicies.latePolicy;
    const dailyRateForLate = Number((rawSalary / resolvedLateDeductionDivisor).toFixed(2));
    const lateRes = calculateLatePolicyPreview({
      latePolicy: {
        isEnabled: latePolicy.isEnabled,
        enableLateToAbsentConversion: latePolicy.enableLateToAbsentConversion,
        lateDaysForOneAbsent: latePolicy.lateDaysForOneAbsent,
        lateCountForBonusLoss: latePolicy.lateCountForBonusLoss,
        deductSalaryForLate: latePolicy.deductSalaryForLate,
        deductAttendanceBonusForLate: latePolicy.deductAttendanceBonusForLate,
      },
      lateCountInPeriod: att.lateCountTotal,
      dailyRate: dailyRateForLate,
      attendanceBonusAmount: Number(empTypePolicies.attendancePolicy?.attendanceBonusAmount) || 0,
    });

    lateDeduction = lateRes.lateDeductionAmount;
    attendanceBonusLost = lateRes.attendanceBonusLost;
    convertedAbsentDays = lateRes.convertedAbsentDays;
  }

  // Attendance Bonus
  let otherAllowance = 0;
  let otherDeduction = 0;
  if (empTypePolicies?.attendancePolicy?.isEnabled && empTypePolicies?.attendancePolicy?.isEligibleForAttendanceBonus) {
    const bonusPolicy = empTypePolicies.attendancePolicy;
    if (bonusPolicy.bonusCalculationType === "FIXED") {
      const bonusAmt = Number(bonusPolicy.attendanceBonusAmount) || 0;
      const hasAbsences = att.absentDays > 0;
      const isBonusLost = attendanceBonusLost || (hasAbsences && applyAbsentPenalty);
      
      if (!isBonusLost) {
        otherAllowance = bonusAmt;
      } else {
        otherDeduction = 0;
      }
    }
  }

  // Loan Deduction
  let loanDeduction = 0;
  for (const loan of loans) {
    const deduction = Math.min(Number(loan.monthlyInstallment), Number(loan.remainingBalance));
    loanDeduction += deduction;
  }

  // Tax & PF
  const taxDeduction = basic * (taxPercentage / 100);
  const pfDeduction  = basic * (pfPercentage / 100);

  // Final grossPay and deductions
  const grossPay = Number((
    basic + houseRent + medical + transport + foodAllowance +
    otAmount + festivalBonus + tiffinAllowance + nightAllowance + holidayAllowance + otherAllowance
  ).toFixed(2));

  const totalDeduction = Number((
    absentDeduction + lateDeduction + loanDeduction + taxDeduction + pfDeduction + otherDeduction
  ).toFixed(2));

  const rawNetPay = grossPay - totalDeduction;
  const netPay = applyNetPayRounding(rawNetPay, calcGlobalSettings.netPayRounding);

  return {
    basic,
    houseRent,
    medical,
    transport,
    foodAllowance,
    otAmount,
    bonus: festivalBonus,
    grossPay,
    absentDeduction,
    loanDeduction,
    taxDeduction,
    pfDeduction,
    totalDeduction,
    netPay,
    tiffinAllowance,
    nightAllowance,
    holidayAllowance,
    otherAllowance,
    lateDeduction,
    otherDeduction
  };
}

// Global configuration mock
const defaultGlobals = {
  defaultHouseRentPct: 26,
  defaultMedicalPct: 5,
  defaultTransportPct: 4,
  defaultFoodAllowancePct: 10,
  workingHoursPerDay: 8,
  dailyOtThresholdHours: 0,
  otMultiplier: 1.5,
  defaultFestivalBonusPct: 50,
  netPayRounding: "none",
};

// ===========================================================================
// Test Case A: Gross salary = 20,000, defaultPayDivisor = 40
// Expected: lateDeduction = 500
// ===========================================================================
const tcA = runPayrollItemCalculation({
  emp: {
    id: "emp-A",
    name: "John Divisor 40",
    salary: 20000,
    employeeType: {
      name: "Late Class",
      attendancePolicy: { applyLatePenalty: true },
      latePolicy: {
        isEnabled: true,
        enableLateToAbsentConversion: true,
        lateDaysForOneAbsent: 3,
        deductSalaryForLate: true,
      }
    }
  },
  att: { absentDays: 0, otHours: 0, lateCountTotal: 3, totalCalculatedOvertimeAmount: 0, totalTiffinAllowance: 0, totalNightAllowance: 0, totalHolidayAllowance: 0 },
  calcGlobalSettings: defaultGlobals,
  payDivisor: 30,
  payrollSettingMock: { defaultPayDivisor: 40 }
});
console.log("Test Case A: Divisor 40 Late Deduction");
console.log("Expected: lateDeduction = 500");
console.log(`Actual:   lateDeduction = ${tcA.lateDeduction}`);
console.log(`Match?    ${tcA.lateDeduction === 500 ? "PASS" : "FAIL"}\n`);

// ===========================================================================
// Test Case B: Gross salary = 20,000, defaultPayDivisor = 30
// Expected: lateDeduction = 666.67
// ===========================================================================
const tcB = runPayrollItemCalculation({
  emp: {
    id: "emp-B",
    name: "John Divisor 30",
    salary: 20000,
    employeeType: {
      name: "Late Class",
      attendancePolicy: { applyLatePenalty: true },
      latePolicy: {
        isEnabled: true,
        enableLateToAbsentConversion: true,
        lateDaysForOneAbsent: 3,
        deductSalaryForLate: true,
      }
    }
  },
  att: { absentDays: 0, otHours: 0, lateCountTotal: 3, totalCalculatedOvertimeAmount: 0, totalTiffinAllowance: 0, totalNightAllowance: 0, totalHolidayAllowance: 0 },
  calcGlobalSettings: defaultGlobals,
  payDivisor: 30,
  payrollSettingMock: { defaultPayDivisor: 30 }
});
console.log("Test Case B: Divisor 30 Late Deduction");
console.log("Expected: lateDeduction = 666.67");
console.log(`Actual:   lateDeduction = ${tcB.lateDeduction}`);
console.log(`Match?    ${tcB.lateDeduction === 666.67 ? "PASS" : "FAIL"}\n`);

// ===========================================================================
// Test Case C: Net salary using divisor 40
// Expected: NetPay = 19,350
// ===========================================================================
const tcC = runPayrollItemCalculation({
  emp: {
    id: "emp-C",
    name: "Jane Complex 40",
    salary: 20000,
    employeeType: {
      name: "Complex Mappings",
      attendancePolicy: {
        isEnabled: true,
        isEligibleForAttendanceBonus: true,
        attendanceBonusAmount: 600,
        applyLatePenalty: true,
        applyAbsentPenalty: true
      },
      latePolicy: {
        isEnabled: true,
        enableLateToAbsentConversion: true,
        lateDaysForOneAbsent: 3,
        lateCountForBonusLoss: 3,
        deductSalaryForLate: true,
        deductAttendanceBonusForLate: true,
      },
      overtimePolicy: { isEligible: true }
    }
  },
  att: {
    absentDays: 1,
    otHours: 0,
    lateCountTotal: 3,
    totalCalculatedOvertimeAmount: 150,
    totalTiffinAllowance: 120,
    totalNightAllowance: 80,
    totalHolidayAllowance: 1000
  },
  calcGlobalSettings: defaultGlobals,
  payDivisor: 22, // basic = 11000 / 22 = 500 absent deduction
  loans: [{ monthlyInstallment: 1000, remainingBalance: 5000 }],
  payrollSettingMock: { defaultPayDivisor: 40 } // rawSalary 20000 / 40 = 500 late deduction
});
console.log("Test Case C: Full Net Salary Formula With Divisor 40");
console.log("Expected: NetPay = 19,350");
console.log(`Actual:   NetPay = ${tcC.netPay}`);
console.log(`Match?    ${tcC.netPay === 19350 ? "PASS" : "FAIL"}\n`);

console.log("==========================================");
