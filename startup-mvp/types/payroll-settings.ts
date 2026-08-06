/**
 * Payroll Settings Type Definitions
 *
 * Structured configuration for payroll generation defaults, calculation rules,
 * statutory compliance, schedule, and accounting defaults used during payroll posting.
 *
 * Stored in the `settings` table under code = "payroll.settings".
 * Uses a merge-with-defaults pattern — adding new fields is always backward-compatible.
 */

// ---------------------------------------------------------------------------
// Account Settings
// ---------------------------------------------------------------------------

/**
 * Default ledger account IDs used when posting payroll vouchers.
 * Per-employee accounts on the Employee profile always take precedence.
 */
export interface PayrollAccountSettings {
  /** DR — Salary Expense (type: EXPENSE) */
  salaryExpenseAccountId: string;
  /** CR — Default Salary Payable Liability (type: LIABILITY) */
  defaultSalaryPayableAccountId: string;
  /** CR — Employee Tax Payable Liability (type: LIABILITY) */
  taxPayableAccountId: string;
  /** CR — Employee PF Payable Liability (type: LIABILITY) */
  pfPayableAccountId: string;
  /** CR — Default Advance/Loan Account (type: LIABILITY or ASSET) */
  defaultAdvanceAccountId: string;
  /** DR — Employer PF Expense (type: EXPENSE) — company's matching PF contribution cost */
  employerPfExpenseAccountId: string;
  /** CR — Employer PF Payable Liability (type: LIABILITY) — company's matching PF contribution owed */
  employerPfPayableAccountId: string;
  /** DR — Festival/Bonus Expense (type: EXPENSE) */
  festivalBonusExpenseAccountId: string;
}

// ---------------------------------------------------------------------------
// Pay Schedule Settings
// ---------------------------------------------------------------------------

/**
 * Controls when payroll runs, attendance cutoff, and the fiscal/tax calendar.
 * Currently informational — used by reminders and future auto-scheduler.
 */
export interface PayrollScheduleSettings {
  /**
   * How frequently payroll is processed.
   * Default: "monthly"
   */
  payFrequency: "monthly" | "biweekly" | "weekly";

  /**
   * Day of the month salary is disbursed (1–31).
   * For months shorter than this value, last day of month is used.
   * Default: 25
   */
  payDayOfMonth: number;

  /**
   * Day of the month after which attendance is locked for payroll generation (1–31).
   * Attendance entries on or before this day are included in the current month's payroll.
   * Default: 24
   */
  attendanceCutoffDay: number;

  /**
   * Month number (1–12) when the fiscal/tax year starts.
   * Used for tax slab resets and annual leave accrual.
   * Default: 7 (July) — common in South Asia
   */
  taxYearStartMonth: number;
}

// ---------------------------------------------------------------------------
// Calculation Settings
// ---------------------------------------------------------------------------

/**
 * Payroll calculation engine defaults.
 * All values here are used as global fallbacks; per-employee config takes precedence.
 */
export interface PayrollCalculationSettings {
  // --- Absent Deduction ---

  /** OT rate multiplier for weekday overtime. Default: 1.5 */
  otMultiplier: number;

  /** Standard working hours per day. Used in hourly rate calculation. Default: 8 */
  workingHoursPerDay: number;

  /**
   * Minimum daily hours an employee must work before OT applies.
   * Hours logged beyond this threshold count as OT.
   * Default: 8 (i.e., OT only kicks in after 8 hours/day)
   */
  dailyOtThresholdHours: number;

  /**
   * OT multiplier for weekend (Saturday/Sunday) work. Default: 2.0
   * Applied to hours logged on weekend days.
   */
  weekendOtMultiplier: number;

  /**
   * OT multiplier for public holidays. Default: 2.0
   */
  holidayOtMultiplier: number;

  /**
   * How to count monthly working days for daily-rate / absent-deduction calculation.
   * "calendar" = total calendar days in month (28–31)
   * "working"  = fixed standard working days per month
   */
  absentDeductionMode: "calendar" | "working";

  /**
   * Salary basis used for absenteeism deduction calculation.
   * "GROSS" = Daily rate calculated from Total Gross Salary (Gross ÷ Divisor)
   * "BASIC" = Daily rate calculated from Basic Salary (Basic ÷ Divisor)
   * Default: "BASIC"
   */
  absentDeductionBasis?: "GROSS" | "BASIC";

  /** Fixed working days per month (used when absentDeductionMode = "working"). Default: 26 */
  standardWorkingDays: number;

  // --- Default Allowances (% of Basic, global fallback) ---

  /** Default House Rent Allowance as % of Basic. Default: 0 */
  defaultHouseRentPct: number;
  /** Default Medical Allowance as % of Basic. Default: 0 */
  defaultMedicalPct: number;
  /** Default Transport Allowance as % of Basic. Default: 0 */
  defaultTransportPct: number;
  /** Default Food Allowance as % of Basic. Default: 0 */
  defaultFoodAllowancePct: number;

  // --- Statutory / Compliance ---

  /**
   * Tax calculation method.
   * "flat"  = single flat-rate percentage (from EmployeeSalary.taxPercentage)
   * "slab"  = progressive tax brackets (future implementation)
   * Default: "flat"
   */
  taxCalculationMethod: "flat" | "slab";

  /**
   * Employer (company) PF matching contribution as % of employee basic salary.
   * This is the company's cost, separate from the employee's own PF deduction.
   * Set to 0 to disable. Default: 0
   */
  employerPfPct: number;

  // --- Festival / Bonus ---

  /**
   * Default festival bonus as % of Basic salary.
   * Only applied when generatePayroll() is called with includeFestivalBonus = true.
   * Per-employee override is possible via EmployeeSalary.festivalBonusPct (if field exists).
   * Default: 0 (disabled)
   */
  defaultFestivalBonusPct: number;

  // --- Rounding ---

  /**
   * How to round each employee's net pay.
   * "none"       = no rounding (full decimal precision)
   * "nearest10"  = round to nearest 10
   * "nearest100" = round to nearest 100
   * Default: "none"
   */
  netPayRounding: "none" | "nearest10" | "nearest100";

  /**
   * Configured weekend days of the week.
   * Array of day numbers where 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
   * Default: [0, 6] (Saturday & Sunday)
   */
  weekends: number[];
}

// ---------------------------------------------------------------------------
// Loan / Advance Policy Settings
// ---------------------------------------------------------------------------

/**
 * Company-wide loan and advance policy limits.
 * These are enforced at the loan application stage (not in payroll generation).
 * Set to 0 to disable each limit.
 */
export interface PayrollPolicySettings {
  /**
   * Maximum loan amount as a multiplier of monthly basic salary.
   * E.g. 3 means max loan = 3 × basic. Set to 0 to disable. Default: 0
   */
  maxLoanMultiplier: number;

  /**
   * Maximum number of active (APPROVED, non-zero balance) loans per employee.
   * Set to 0 to disable. Default: 0
   */
  maxActiveLoans: number;
}

// ---------------------------------------------------------------------------
// Root Type
// ---------------------------------------------------------------------------

/**
 * Complete Payroll Settings structure stored in the Settings table.
 */
export interface PayrollSettings {
  /** @deprecated Managed in Accounting Operation Settings instead */
  accounts: PayrollAccountSettings;
  schedule: PayrollScheduleSettings;
  calculation: PayrollCalculationSettings;
  policy: PayrollPolicySettings;
}

/**
 * Settings key (code) used to look up payroll settings in the Settings table.
 */
export const PAYROLL_SETTINGS_KEY = "payroll.settings";

/**
 * Factory: creates a fully populated default PayrollSettings object.
 * All account IDs are empty strings (not configured).
 * Numeric values use safe, standard industry defaults.
 */
export function createDefaultPayrollSettings(): PayrollSettings {
  return {
    accounts: {
      salaryExpenseAccountId: "",
      defaultSalaryPayableAccountId: "",
      taxPayableAccountId: "",
      pfPayableAccountId: "",
      defaultAdvanceAccountId: "",
      employerPfExpenseAccountId: "",
      employerPfPayableAccountId: "",
      festivalBonusExpenseAccountId: "",
    },
    schedule: {
      payFrequency: "monthly",
      payDayOfMonth: 25,
      attendanceCutoffDay: 24,
      taxYearStartMonth: 7,
    },
    calculation: {
      otMultiplier: 1.5,
      workingHoursPerDay: 8,
      dailyOtThresholdHours: 8,
      weekendOtMultiplier: 2.0,
      holidayOtMultiplier: 2.0,
      absentDeductionMode: "calendar",
      absentDeductionBasis: "BASIC",
      standardWorkingDays: 26,
      defaultHouseRentPct: 0,
      defaultMedicalPct: 0,
      defaultTransportPct: 0,
      defaultFoodAllowancePct: 0,
      taxCalculationMethod: "flat",
      employerPfPct: 0,
      defaultFestivalBonusPct: 0,
      netPayRounding: "none",
      weekends: [0, 6],
    },
    policy: {
      maxLoanMultiplier: 0,
      maxActiveLoans: 0,
    },
  };
}
