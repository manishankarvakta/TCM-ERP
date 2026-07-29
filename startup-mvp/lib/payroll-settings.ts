/**
 * Payroll Settings Library
 *
 * Helper functions for retrieving payroll settings from the database.
 * Uses user-specific → global → hardcoded-defaults fallback pattern.
 * Never throws; always returns a complete PayrollSettings object.
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  type PayrollSettings,
  type PayrollAccountSettings,
  type PayrollScheduleSettings,
  type PayrollCalculationSettings,
  type PayrollPolicySettings,
  PAYROLL_SETTINGS_KEY,
  createDefaultPayrollSettings,
} from "@/types/payroll-settings";

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

function mergeAccounts(
  partial: Partial<PayrollAccountSettings> | undefined,
  def: PayrollAccountSettings
): PayrollAccountSettings {
  return {
    salaryExpenseAccountId:         partial?.salaryExpenseAccountId         ?? def.salaryExpenseAccountId,
    defaultSalaryPayableAccountId:  partial?.defaultSalaryPayableAccountId  ?? def.defaultSalaryPayableAccountId,
    taxPayableAccountId:            partial?.taxPayableAccountId            ?? def.taxPayableAccountId,
    pfPayableAccountId:             partial?.pfPayableAccountId             ?? def.pfPayableAccountId,
    defaultAdvanceAccountId:        partial?.defaultAdvanceAccountId        ?? def.defaultAdvanceAccountId,
    employerPfExpenseAccountId:     partial?.employerPfExpenseAccountId     ?? def.employerPfExpenseAccountId,
    employerPfPayableAccountId:     partial?.employerPfPayableAccountId     ?? def.employerPfPayableAccountId,
    festivalBonusExpenseAccountId:  partial?.festivalBonusExpenseAccountId  ?? def.festivalBonusExpenseAccountId,
  };
}

function mergeSchedule(
  partial: Partial<PayrollScheduleSettings> | undefined,
  def: PayrollScheduleSettings
): PayrollScheduleSettings {
  return {
    payFrequency:        partial?.payFrequency        ?? def.payFrequency,
    payDayOfMonth:       partial?.payDayOfMonth       ?? def.payDayOfMonth,
    attendanceCutoffDay: partial?.attendanceCutoffDay ?? def.attendanceCutoffDay,
    taxYearStartMonth:   partial?.taxYearStartMonth   ?? def.taxYearStartMonth,
  };
}

function mergeCalculation(
  partial: Partial<PayrollCalculationSettings> | undefined,
  def: PayrollCalculationSettings
): PayrollCalculationSettings {
  return {
    otMultiplier:            partial?.otMultiplier            ?? def.otMultiplier,
    workingHoursPerDay:      partial?.workingHoursPerDay      ?? def.workingHoursPerDay,
    dailyOtThresholdHours:   partial?.dailyOtThresholdHours   ?? def.dailyOtThresholdHours,
    weekendOtMultiplier:     partial?.weekendOtMultiplier     ?? def.weekendOtMultiplier,
    holidayOtMultiplier:     partial?.holidayOtMultiplier     ?? def.holidayOtMultiplier,
    absentDeductionMode:     partial?.absentDeductionMode     ?? def.absentDeductionMode,
    standardWorkingDays:     partial?.standardWorkingDays     ?? def.standardWorkingDays,
    defaultHouseRentPct:     partial?.defaultHouseRentPct     ?? def.defaultHouseRentPct,
    defaultMedicalPct:       partial?.defaultMedicalPct       ?? def.defaultMedicalPct,
    defaultTransportPct:     partial?.defaultTransportPct     ?? def.defaultTransportPct,
    defaultFoodAllowancePct: partial?.defaultFoodAllowancePct ?? def.defaultFoodAllowancePct,
    taxCalculationMethod:    partial?.taxCalculationMethod    ?? def.taxCalculationMethod,
    employerPfPct:           partial?.employerPfPct           ?? def.employerPfPct,
    defaultFestivalBonusPct: partial?.defaultFestivalBonusPct ?? def.defaultFestivalBonusPct,
    netPayRounding:          partial?.netPayRounding          ?? def.netPayRounding,
    weekends:                partial?.weekends                ?? def.weekends,
  };
}

function mergePolicy(
  partial: Partial<PayrollPolicySettings> | undefined,
  def: PayrollPolicySettings
): PayrollPolicySettings {
  return {
    maxLoanMultiplier: partial?.maxLoanMultiplier ?? def.maxLoanMultiplier,
    maxActiveLoans:    partial?.maxActiveLoans    ?? def.maxActiveLoans,
  };
}

function mergeWithDefaults(
  partial: Partial<PayrollSettings>,
  defaults: PayrollSettings
): PayrollSettings {
  return {
    accounts:    mergeAccounts(partial.accounts, defaults.accounts),
    schedule:    mergeSchedule(partial.schedule, defaults.schedule),
    calculation: mergeCalculation(partial.calculation, defaults.calculation),
    policy:      mergePolicy(partial.policy, defaults.policy),
  };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function fetchSetting(where: {
  code: string;
  userId: string | null;
  isGlobal?: boolean;
  isActive: boolean;
}) {
  return prisma.settings.findFirst({
    where,
    select: { settings: true, isGlobal: true },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get payroll settings.
 * Priority: user-specific → global → hardcoded defaults.
 * Never throws; always returns a complete PayrollSettings object.
 */
export async function getPayrollSettings(): Promise<PayrollSettings> {
  const defaults = createDefaultPayrollSettings();
  try {
    let session;
    try {
      session = await auth();
    } catch (e) {
      // ignore auth session errors in CLI
    }

    if (session?.user) {
      // 1. User-specific
      const userSetting = await fetchSetting({
        code: PAYROLL_SETTINGS_KEY,
        userId: session.user.id,
        isActive: true,
      });
      if (userSetting?.settings) {
        return mergeWithDefaults(userSetting.settings as Partial<PayrollSettings>, defaults);
      }
    }

    // 2. Global (fallback when no user session is present)
    const globalSetting = await fetchSetting({
      code: PAYROLL_SETTINGS_KEY,
      userId: null,
      isGlobal: true,
      isActive: true,
    });
    if (globalSetting?.settings) {
      return mergeWithDefaults(globalSetting.settings as Partial<PayrollSettings>, defaults);
    }

    return defaults;
  } catch (error) {
    try {
      const globalSetting = await prisma.settings.findFirst({
        where: { code: PAYROLL_SETTINGS_KEY, userId: null, isGlobal: true, isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (globalSetting?.settings) {
        return mergeWithDefaults(globalSetting.settings as Partial<PayrollSettings>, defaults);
      }
    } catch (dbErr) {
      console.error("getPayrollSettings database fallback error:", dbErr);
    }
    return defaults;
  }
}

/**
 * Get payroll settings with metadata (isGlobal, etc.) — used by the settings form.
 */
export async function getPayrollSettingsFull(): Promise<{
  settings: PayrollSettings;
  isGlobal: boolean;
} | null> {
  try {
    const session = await auth();
    if (!session?.user) return null;

    const defaults = createDefaultPayrollSettings();

    // 1. User-specific
    const userSetting = await prisma.settings.findFirst({
      where: { code: PAYROLL_SETTINGS_KEY, userId: session.user.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (userSetting?.settings) {
      return {
        settings: mergeWithDefaults(userSetting.settings as Partial<PayrollSettings>, defaults),
        isGlobal: userSetting.isGlobal,
      };
    }

    // 2. Global
    const globalSetting = await prisma.settings.findFirst({
      where: { code: PAYROLL_SETTINGS_KEY, userId: null, isGlobal: true, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (globalSetting?.settings) {
      return {
        settings: mergeWithDefaults(globalSetting.settings as Partial<PayrollSettings>, defaults),
        isGlobal: true,
      };
    }

    // 3. Return factory defaults
    return { settings: defaults, isGlobal: false };
  } catch (error) {
    console.error("getPayrollSettingsFull error:", error);
    return null;
  }
}

/**
 * Check if a date falls on a weekend based on payroll settings.
 */
export function isConfiguredWeekend(date: Date, weekends: number[] = [0, 6]): boolean {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return weekends.includes(day);
}
