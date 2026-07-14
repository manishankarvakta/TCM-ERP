import { addDays, differenceInMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { HR_BUSINESS_TIMEZONE } from "../hr/shift-utils";

export { HR_BUSINESS_TIMEZONE };

// Helper to convert any input (Prisma Decimal, string, number) safely to a JS number
function toNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

// Helper to calculate threshold datetime in the business timezone
export function getThresholdDateTime(
  attendanceDate: Date,
  timeStr: string,
  timezone: string = HR_BUSINESS_TIMEZONE
): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  
  // Extract UTC calendar day components
  const year = attendanceDate.getUTCFullYear();
  const month = attendanceDate.getUTCMonth();
  const day = attendanceDate.getUTCDate();
  
  let targetDate = new Date(Date.UTC(year, month, day));
  
  // If the time is early morning (before 12:00 PM), it refers to the early morning of the next day
  if (hours < 12) {
    targetDate = addDays(targetDate, 1);
  }
  
  const yyyy = targetDate.getUTCFullYear();
  const mm = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getUTCDate()).padStart(2, '0');
  
  return fromZonedTime(`${yyyy}-${mm}-${dd} ${timeStr}:00`, timezone);
}

/**
 * 1. Calculate Salary Breakdown based on SalaryStructurePolicy
 */
export interface SalaryBreakdownInput {
  grossSalary: number;
  salaryStructurePolicy?: {
    basicPercent: any;
    houseRentPercent: any;
    medicalPercent: any;
    transportPercent: any;
    foodPercent: any;
  } | null;
}

export interface SalaryBreakdownOutput {
  grossSalary: number;
  basicSalary: number;
  houseRent: number;
  medical: number;
  transport: number;
  food: number;
  totalComponents: number;
  isValid: boolean;
}

export function calculateSalaryBreakdown(input: SalaryBreakdownInput): SalaryBreakdownOutput {
  const grossSalary = toNumber(input.grossSalary);
  const policy = input.salaryStructurePolicy;

  // Default percentages
  let basicPct = 55;
  let rentPct = 26;
  let medicalPct = 5;
  let transportPct = 4;
  let foodPct = 10;

  if (policy) {
    basicPct = toNumber(policy.basicPercent, 55);
    rentPct = toNumber(policy.houseRentPercent, 26);
    medicalPct = toNumber(policy.medicalPercent, 5);
    transportPct = toNumber(policy.transportPercent, 4);
    foodPct = toNumber(policy.foodPercent, 10);
  }

  const totalPct = basicPct + rentPct + medicalPct + transportPct + foodPct;
  const isValid = Math.abs(totalPct - 100) <= 0.01;

  const basicSalary = Number((grossSalary * (basicPct / 100)).toFixed(2));
  const houseRent = Number((grossSalary * (rentPct / 100)).toFixed(2));
  const medical = Number((grossSalary * (medicalPct / 100)).toFixed(2));
  const transport = Number((grossSalary * (transportPct / 100)).toFixed(2));
  const food = Number((grossSalary * (foodPct / 100)).toFixed(2));
  
  const totalComponents = Number((basicSalary + houseRent + medical + transport + food).toFixed(2));

  return {
    grossSalary,
    basicSalary,
    houseRent,
    medical,
    transport,
    food,
    totalComponents,
    isValid,
  };
}

/**
 * 2. Calculate Overtime Rate and Amount
 */
export interface OvertimeInput {
  grossSalary: number;
  overtimePolicy?: {
    isEligible: boolean;
    calculationType: string; // "FORMULA" | "FIXED_RATE"
    basicPercentageFromGross: any;
    monthlyWorkingDays: number;
    hourBasis: string; // "ASSIGNED_SHIFT_HOUR" | "FIXED_HOUR"
    fixedHourValue?: any;
    multiplier: any;
    fixedOTRate?: any;
    minimumOTMinutes: number;
  } | null;
  shiftHours?: number; // assigned shift duration in hours
  otMinutes?: number;
  otHours?: number;
}

export interface OvertimeOutput {
  isEligible: boolean;
  otHours: number;
  basicForOT: number;
  dayBasic: number;
  hourlyBasic: number;
  otRate: number;
  otAmount: number;
  formulaUsed: string;
  notes: string;
}

export function calculateOvertimePreview(input: OvertimeInput): OvertimeOutput {
  const grossSalary = toNumber(input.grossSalary);
  const policy = input.overtimePolicy;
  const shiftHours = toNumber(input.shiftHours, 8);

  if (!policy || !policy.isEligible) {
    return {
      isEligible: false,
      otHours: 0,
      basicForOT: 0,
      dayBasic: 0,
      hourlyBasic: 0,
      otRate: 0,
      otAmount: 0,
      formulaUsed: "None",
      notes: policy ? "Overtime is disabled by policy" : "No Overtime Policy mapped",
    };
  }

  // Parse inputs
  let hoursCount = 0;
  if (input.otHours !== undefined) {
    hoursCount = toNumber(input.otHours);
  } else if (input.otMinutes !== undefined) {
    hoursCount = toNumber(input.otMinutes) / 60;
  }

  const minMinutes = toNumber(policy.minimumOTMinutes, 0);
  const totalOtMinutes = hoursCount * 60;

  let isThresholdMet = true;
  if (totalOtMinutes < minMinutes) {
    isThresholdMet = false;
  }

  const calcType = policy.calculationType || "FORMULA";
  const multiplier = toNumber(policy.multiplier, 2);
  const monthlyDays = toNumber(policy.monthlyWorkingDays, 30);
  const basicPercentage = toNumber(policy.basicPercentageFromGross, 60);
  const hourBasis = policy.hourBasis || "ASSIGNED_SHIFT_HOUR";
  const fixedHourVal = toNumber(policy.fixedHourValue, 8);
  const fixedRate = toNumber(policy.fixedOTRate, 0);

  let basicForOT = 0;
  let dayBasic = 0;
  let hourlyBasic = 0;
  let otRate = 0;
  let otAmount = 0;
  let formulaUsed = "";
  let notes = "";

  if (calcType === "FORMULA") {
    basicForOT = Number((grossSalary * (basicPercentage / 100)).toFixed(2));
    dayBasic = Number((basicForOT / monthlyDays).toFixed(2));
    
    const divisorHours = hourBasis === "FIXED_HOUR" ? fixedHourVal : shiftHours;
    hourlyBasic = Number((dayBasic / divisorHours).toFixed(2));
    
    otRate = Number((hourlyBasic * multiplier).toFixed(2));
    otAmount = isThresholdMet ? Number((hoursCount * otRate).toFixed(2)) : 0;
    
    formulaUsed = `Basic (${basicPercentage}%) = ${basicForOT}; Day Basic = Basic / ${monthlyDays} days; Hourly Basic = Day Basic / ${divisorHours} hrs (${hourBasis}); OT Rate = Hourly Basic * ${multiplier}x`;
  } else {
    // FIXED_RATE
    otRate = fixedRate;
    otAmount = isThresholdMet ? Number((hoursCount * otRate).toFixed(2)) : 0;
    formulaUsed = `Fixed Rate = ${otRate} BDT/hour`;
  }

  if (!isThresholdMet) {
    notes = `Worked ${totalOtMinutes.toFixed(1)} mins, which is below the policy minimum threshold of ${minMinutes} mins. Amount set to 0.`;
  } else {
    notes = `Calculated OT for ${hoursCount.toFixed(2)} hours.`;
  }

  return {
    isEligible: true,
    otHours: Number(hoursCount.toFixed(2)),
    basicForOT,
    dayBasic,
    hourlyBasic,
    otRate,
    otAmount,
    formulaUsed,
    notes,
  };
}

/**
 * 3. Calculate Tiffin Bill Preview
 */
export interface TiffinInput {
  tiffinPolicy?: {
    isEligible: boolean;
    allowAfterTime?: string | null;
    amount: any;
    maxCountPerDay: number;
  } | null;
  checkoutDateTime?: Date | string | null;
  attendanceDate?: Date | string | null;
  timezone?: string;
  maxCountPerDay?: number;
}

export interface TiffinOutput {
  isEligible: boolean;
  allowed: boolean;
  amount: number;
  reason: string;
  thresholdDateTime: string | null;
}

export function calculateTiffinPreview(input: TiffinInput): TiffinOutput {
  const policy = input.tiffinPolicy;
  const timezone = input.timezone || HR_BUSINESS_TIMEZONE;

  if (!policy || !policy.isEligible) {
    return {
      isEligible: false,
      allowed: false,
      amount: 0,
      reason: policy ? "Tiffin is disabled by policy" : "No Tiffin Policy mapped",
      thresholdDateTime: null,
    };
  }

  if (!input.checkoutDateTime || !input.attendanceDate) {
    return {
      isEligible: true,
      allowed: false,
      amount: 0,
      reason: "Missing check-out timestamp or attendance calendar date",
      thresholdDateTime: null,
    };
  }

  const checkout = typeof input.checkoutDateTime === "string" ? new Date(input.checkoutDateTime) : input.checkoutDateTime;
  const attendance = typeof input.attendanceDate === "string" ? new Date(input.attendanceDate) : input.attendanceDate;

  if (isNaN(checkout.getTime()) || isNaN(attendance.getTime())) {
    return {
      isEligible: true,
      allowed: false,
      amount: 0,
      reason: "Invalid date format provided",
      thresholdDateTime: null,
    };
  }

  const allowAfterTime = policy.allowAfterTime;
  if (!allowAfterTime) {
    return {
      isEligible: true,
      allowed: false,
      amount: 0,
      reason: "Tiffin threshold time is not configured in policy",
      thresholdDateTime: null,
    };
  }

  const threshold = getThresholdDateTime(attendance, allowAfterTime, timezone);
  const isAllowed = checkout > threshold;
  const amount = isAllowed ? toNumber(policy.amount) : 0;
  const thresholdStr = formatInTimeZone(threshold, timezone, "yyyy-MM-dd HH:mm:ss");

  return {
    isEligible: true,
    allowed: isAllowed,
    amount,
    reason: isAllowed
      ? `Checkout ${formatInTimeZone(checkout, timezone, "HH:mm")} is after threshold ${allowAfterTime}`
      : `Checkout ${formatInTimeZone(checkout, timezone, "HH:mm")} is before/at threshold ${allowAfterTime}`,
    thresholdDateTime: thresholdStr,
  };
}

/**
 * 4. Calculate Night Bill Preview
 */
export interface NightBillInput {
  nightBillPolicy?: {
    isEligible: boolean;
    allowAfterTime?: string | null;
    amount: any;
    supportsOvernightCheckout: boolean;
    maxCountPerDay: number;
  } | null;
  checkoutDateTime?: Date | string | null;
  attendanceDate?: Date | string | null;
  timezone?: string;
}

export interface NightBillOutput {
  isEligible: boolean;
  allowed: boolean;
  amount: number;
  reason: string;
  thresholdDateTime: string | null;
  overnightApplied: boolean;
}

export function calculateNightBillPreview(input: NightBillInput): NightBillOutput {
  const policy = input.nightBillPolicy;
  const timezone = input.timezone || HR_BUSINESS_TIMEZONE;

  if (!policy || !policy.isEligible) {
    return {
      isEligible: false,
      allowed: false,
      amount: 0,
      reason: policy ? "Night bill is disabled by policy" : "No Night Bill Policy mapped",
      thresholdDateTime: null,
      overnightApplied: false,
    };
  }

  if (!input.checkoutDateTime || !input.attendanceDate) {
    return {
      isEligible: true,
      allowed: false,
      amount: 0,
      reason: "Missing check-out timestamp or attendance calendar date",
      thresholdDateTime: null,
      overnightApplied: false,
    };
  }

  const checkout = typeof input.checkoutDateTime === "string" ? new Date(input.checkoutDateTime) : input.checkoutDateTime;
  const attendance = typeof input.attendanceDate === "string" ? new Date(input.attendanceDate) : input.attendanceDate;

  if (isNaN(checkout.getTime()) || isNaN(attendance.getTime())) {
    return {
      isEligible: true,
      allowed: false,
      amount: 0,
      reason: "Invalid date format provided",
      thresholdDateTime: null,
      overnightApplied: false,
    };
  }

  const allowAfterTime = policy.allowAfterTime;
  if (!allowAfterTime) {
    return {
      isEligible: true,
      allowed: false,
      amount: 0,
      reason: "Night bill threshold time is not configured in policy",
      thresholdDateTime: null,
      overnightApplied: false,
    };
  }

  const threshold = getThresholdDateTime(attendance, allowAfterTime, timezone);
  const isAfterThreshold = checkout > threshold;

  // Check if calendar dates are different in timezone
  const checkoutDateStr = formatInTimeZone(checkout, timezone, "yyyy-MM-dd");
  const attendanceDateStr = formatInTimeZone(attendance, timezone, "yyyy-MM-dd");
  const isDifferentDay = checkoutDateStr !== attendanceDateStr;

  let isAllowed = isAfterThreshold;
  let overnightApplied = false;
  let reason = "";

  if (isDifferentDay) {
    if (!policy.supportsOvernightCheckout) {
      isAllowed = false;
      reason = `Checkout was on next day (${checkoutDateStr}), but overnight checkout is disabled in policy`;
    } else {
      overnightApplied = true;
      reason = `Allowed overnight checkout on next day (${checkoutDateStr}) after threshold ${allowAfterTime}`;
    }
  } else {
    reason = isAllowed
      ? `Checkout ${formatInTimeZone(checkout, timezone, "HH:mm")} is after threshold ${allowAfterTime}`
      : `Checkout ${formatInTimeZone(checkout, timezone, "HH:mm")} is before/at threshold ${allowAfterTime}`;
  }

  const amount = isAllowed ? toNumber(policy.amount) : 0;
  const thresholdStr = formatInTimeZone(threshold, timezone, "yyyy-MM-dd HH:mm:ss");

  return {
    isEligible: true,
    allowed: isAllowed,
    amount,
    reason,
    thresholdDateTime: thresholdStr,
    overnightApplied,
  };
}

/**
 * 5. Calculate Holiday Bill Preview
 */
export interface HolidayBillInput {
  grossSalary: number;
  holidayBillPolicy?: {
    isEligible: boolean;
    calculationType: string; // "ONE_DAY_GROSS" | "FIXED_AMOUNT" | "OT_BASED"
    fixedAmount?: any;
    allowWithOT: boolean;
    includeWeekend: boolean;
    includePublicHoliday: boolean;
  } | null;
  isWeekend: boolean;
  isPublicHoliday: boolean;
  workedOnHoliday: boolean;
  otAmount?: number;
}

export interface HolidayBillOutput {
  isEligible: boolean;
  allowed: boolean;
  amount: number;
  calculationType: string;
  reason: string;
}

export function calculateHolidayBillPreview(input: HolidayBillInput): HolidayBillOutput {
  const grossSalary = toNumber(input.grossSalary);
  const policy = input.holidayBillPolicy;
  const { isWeekend, isPublicHoliday, workedOnHoliday, otAmount = 0 } = input;

  if (!policy || !policy.isEligible) {
    return {
      isEligible: false,
      allowed: false,
      amount: 0,
      calculationType: "NONE",
      reason: policy ? "Holiday bill is disabled by policy" : "No Holiday Bill Policy mapped",
    };
  }

  if (!workedOnHoliday) {
    return {
      isEligible: true,
      allowed: false,
      amount: 0,
      calculationType: policy.calculationType || "NONE",
      reason: "Employee did not work on holiday/weekend",
    };
  }

  const isWeekendAllowed = isWeekend && policy.includeWeekend;
  const isPublicHolidayAllowed = isPublicHoliday && policy.includePublicHoliday;

  if (!isWeekendAllowed && !isPublicHolidayAllowed) {
    return {
      isEligible: true,
      allowed: false,
      amount: 0,
      calculationType: policy.calculationType || "NONE",
      reason: `Worked on holiday, but policy does not include this day type (Weekend: ${policy.includeWeekend}, Public Holiday: ${policy.includePublicHoliday})`,
    };
  }

  const calcType = policy.calculationType || "ONE_DAY_GROSS";
  let amount = 0;
  let reason = "";

  if (calcType === "ONE_DAY_GROSS") {
    amount = Number((grossSalary / 30).toFixed(2));
    reason = `Allowed 1-Day Gross Salary (Gross BDT ${grossSalary} / 30)`;
  } else if (calcType === "FIXED_AMOUNT") {
    amount = toNumber(policy.fixedAmount);
    reason = `Allowed fixed allowance amount of BDT ${amount}`;
  } else if (calcType === "OT_BASED") {
    amount = otAmount;
    reason = `Allowed OT-based holiday allowance matching overtime payment of BDT ${otAmount}`;
  }

  return {
    isEligible: true,
    allowed: true,
    amount,
    calculationType: calcType,
    reason,
  };
}

/**
 * 6. Calculate Late Policy Preview
 */
export interface LatePolicyInput {
  latePolicy?: {
    isEnabled: boolean;
    enableLateToAbsentConversion: boolean;
    lateDaysForOneAbsent: number;
    lateCountForBonusLoss: number;
    deductSalaryForLate: boolean;
    deductAttendanceBonusForLate: boolean;
  } | null;
  lateCountInPeriod: number;
  dailyRate?: number;
  attendanceBonusAmount?: number;
}

export interface LatePolicyOutput {
  lateCountInPeriod: number;
  convertedAbsentDays: number;
  attendanceBonusLost: boolean;
  attendanceBonusDeduction: number;
  lateDeductionAmount: number;
  notes: string;
}

export function calculateLatePolicyPreview(input: LatePolicyInput): LatePolicyOutput {
  const policy = input.latePolicy;
  const lateCountInPeriod = toNumber(input.lateCountInPeriod);
  const dailyRate = toNumber(input.dailyRate, 0);
  const bonusAmount = toNumber(input.attendanceBonusAmount, 0);

  if (!policy || !policy.isEnabled) {
    return {
      lateCountInPeriod,
      convertedAbsentDays: 0,
      attendanceBonusLost: false,
      attendanceBonusDeduction: 0,
      lateDeductionAmount: 0,
      notes: policy ? "Late policy is disabled" : "No Late Policy mapped",
    };
  }

  // Late to absent conversion
  let convertedAbsentDays = 0;
  if (policy.enableLateToAbsentConversion && policy.lateDaysForOneAbsent > 0) {
    convertedAbsentDays = Math.floor(lateCountInPeriod / policy.lateDaysForOneAbsent);
  }

  // Attendance bonus loss check
  let attendanceBonusLost = false;
  if (policy.deductAttendanceBonusForLate) {
    attendanceBonusLost = lateCountInPeriod >= policy.lateCountForBonusLoss;
  }

  const attendanceBonusDeduction = attendanceBonusLost ? bonusAmount : 0;
  
  // Late deduction amount
  const lateDeductionAmount = policy.deductSalaryForLate ? Number((convertedAbsentDays * dailyRate).toFixed(2)) : 0;

  const notesList: string[] = [];
  if (convertedAbsentDays > 0) {
    notesList.push(`${lateCountInPeriod} lates converted to ${convertedAbsentDays} absent day(s) (ratio 1:${policy.lateDaysForOneAbsent})`);
  }
  if (attendanceBonusLost) {
    notesList.push(`Attendance bonus forfeited (exceeded max of ${policy.lateCountForBonusLoss} lates)`);
  }
  if (policy.deductSalaryForLate && lateDeductionAmount > 0) {
    notesList.push(`Deducted ${lateDeductionAmount} BDT for absent conversion (daily rate ${dailyRate.toFixed(2)})`);
  }

  return {
    lateCountInPeriod,
    convertedAbsentDays,
    attendanceBonusLost,
    attendanceBonusDeduction,
    lateDeductionAmount,
    notes: notesList.join("; ") || "No penalties applied.",
  };
}

/**
 * 7. Combined Payroll Policy Preview
 */
export interface PayrollPolicyPreviewInput {
  employee: {
    id: string;
    name: string;
    employeeCode: string | null;
  };
  employeeTypePolicies: {
    name: string;
    salaryStructurePolicy?: any;
    attendancePolicy?: any;
    latePolicy?: any;
    overtimePolicy?: any;
    tiffinBillPolicy?: any;
    nightBillPolicy?: any;
    holidayBillPolicy?: any;
  };
  shift?: {
    startTime: string;
    endTime: string;
  } | null;
  grossSalary: number;
  
  // Sample punches and attendance parameters
  checkIn?: string | null;
  checkOut?: string | null;
  otMinutes?: number;
  otHours?: number;
  lateCountInPeriod?: number;
  isWeekend?: boolean;
  isPublicHoliday?: boolean;
  workedOnHoliday?: boolean;
  
  otherAllowance?: number;
  deductions?: number;
}

export interface PayrollPolicyPreviewOutput {
  salaryBreakdown: SalaryBreakdownOutput;
  overtime: OvertimeOutput;
  tiffin: TiffinOutput;
  nightBill: NightBillOutput;
  holidayBill: HolidayBillOutput;
  latePolicy: LatePolicyOutput;
  earningsSummary: {
    grossSalary: number;
    otAmount: number;
    holidayBillAmount: number;
    nightBillAmount: number;
    tiffinBillAmount: number;
    otherAllowance: number;
    totalEarnings: number;
  };
  deductionSummary: {
    deductions: number;
    lateDeduction: number;
    attendanceBonusDeduction: number;
    totalDeductions: number;
  };
  netSalaryPreview: number;
}

export function calculatePayrollPolicyPreview(input: PayrollPolicyPreviewInput): PayrollPolicyPreviewOutput {
  const grossSalary = toNumber(input.grossSalary);
  const policies = input.employeeTypePolicies;
  const timezone = HR_BUSINESS_TIMEZONE;

  // A. Date setup
  const attendanceDate = new Date(); // Mock calendar date for calculation
  const checkoutDateTime = input.checkOut ? new Date(input.checkOut) : null;

  // B. Resolve shift duration
  let shiftHours = 8;
  if (input.shift && input.shift.startTime && input.shift.endTime) {
    const startStr = input.shift.startTime;
    const endStr = input.shift.endTime;
    const start = combineDateAndTime(attendanceDate, startStr, timezone);
    let end = combineDateAndTime(attendanceDate, endStr, timezone);
    if (endStr <= startStr) {
      end = addDays(end, 1);
    }
    const diff = differenceInMinutes(end, start);
    shiftHours = diff > 0 ? Number((diff / 60).toFixed(2)) : 8;
  }

  // 1. Salary breakdown
  const salaryBreakdown = calculateSalaryBreakdown({
    grossSalary,
    salaryStructurePolicy: policies.salaryStructurePolicy,
  });

  // 2. Overtime calculation
  const overtime = calculateOvertimePreview({
    grossSalary,
    overtimePolicy: policies.overtimePolicy,
    shiftHours,
    otMinutes: input.otMinutes,
    otHours: input.otHours,
  });

  // 3. Tiffin calculation
  const tiffin = calculateTiffinPreview({
    tiffinPolicy: policies.tiffinBillPolicy,
    checkoutDateTime,
    attendanceDate,
    timezone,
  });

  // 4. Night bill calculation
  const nightBill = calculateNightBillPreview({
    nightBillPolicy: policies.nightBillPolicy,
    checkoutDateTime,
    attendanceDate,
    timezone,
  });

  // 5. Holiday bill calculation
  const holidayBill = calculateHolidayBillPreview({
    grossSalary,
    holidayBillPolicy: policies.holidayBillPolicy,
    isWeekend: !!input.isWeekend,
    isPublicHoliday: !!input.isPublicHoliday,
    workedOnHoliday: !!input.workedOnHoliday,
    otAmount: overtime.otAmount,
  });

  // 6. Late policy calculation
  // Daily rate is grossSalary / 30 or divisor. We will default to 30 days divisor.
  const dailyRate = Number((grossSalary / 30).toFixed(2));
  const attendanceBonusAmount = policies.attendancePolicy?.isEligibleForAttendanceBonus
    ? toNumber(policies.attendancePolicy.attendanceBonusAmount)
    : 0;

  const latePolicy = calculateLatePolicyPreview({
    latePolicy: policies.latePolicy,
    lateCountInPeriod: toNumber(input.lateCountInPeriod),
    dailyRate,
    attendanceBonusAmount,
  });

  // C. Earnings Summary
  const otherAllowance = toNumber(input.otherAllowance, 0);
  const totalEarnings = Number(
    (
      grossSalary +
      overtime.otAmount +
      holidayBill.amount +
      nightBill.amount +
      tiffin.amount +
      otherAllowance
    ).toFixed(2)
  );

  const earningsSummary = {
    grossSalary,
    otAmount: overtime.otAmount,
    holidayBillAmount: holidayBill.amount,
    nightBillAmount: nightBill.amount,
    tiffinBillAmount: tiffin.amount,
    otherAllowance,
    totalEarnings,
  };

  // D. Deduction Summary
  const deductions = toNumber(input.deductions, 0);
  const totalDeductions = Number(
    (deductions + latePolicy.lateDeductionAmount + latePolicy.attendanceBonusDeduction).toFixed(2)
  );

  const deductionSummary = {
    deductions,
    lateDeduction: latePolicy.lateDeductionAmount,
    attendanceBonusDeduction: latePolicy.attendanceBonusDeduction,
    totalDeductions,
  };

  // E. Net salary
  const netSalaryPreview = Number((totalEarnings - totalDeductions).toFixed(2));

  return {
    salaryBreakdown,
    overtime,
    tiffin,
    nightBill,
    holidayBill,
    latePolicy,
    earningsSummary,
    deductionSummary,
    netSalaryPreview,
  };
}

// Minimal helper to combine date and time for shift length calculations
function combineDateAndTime(date: Date, timeStr: string, timezone: string): Date {
  const dateKey = formatInTimeZone(date, "UTC", "yyyy-MM-dd");
  return fromZonedTime(`${dateKey} ${timeStr}:00`, timezone);
}
