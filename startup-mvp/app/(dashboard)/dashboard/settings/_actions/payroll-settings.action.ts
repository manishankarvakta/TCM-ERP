"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { z } from "zod";
import {
  PAYROLL_SETTINGS_KEY,
  type PayrollSettings,
  type PayrollAccountSettings,
} from "@/types/payroll-settings";
import { getPayrollSettingsFull } from "@/lib/payroll-settings";

// ---------------------------------------------------------------------------
// Zod Validation Schema
// ---------------------------------------------------------------------------

const accountsSchema = z.object({
  salaryExpenseAccountId:        z.string().default(""),
  defaultSalaryPayableAccountId: z.string().default(""),
  taxPayableAccountId:           z.string().default(""),
  pfPayableAccountId:            z.string().default(""),
  defaultAdvanceAccountId:       z.string().default(""),
  employerPfExpenseAccountId:    z.string().default(""),
  employerPfPayableAccountId:    z.string().default(""),
  festivalBonusExpenseAccountId: z.string().default(""),
});

const scheduleSchema = z.object({
  payFrequency:        z.enum(["monthly", "biweekly", "weekly"]).default("monthly"),
  payDayOfMonth:       z.number().int().min(1).max(31).default(25),
  attendanceCutoffDay: z.number().int().min(1).max(31).default(24),
  taxYearStartMonth:   z.number().int().min(1).max(12).default(7),
});

const calculationSchema = z.object({
  otMultiplier:            z.number().min(1).max(5).default(1.5),
  workingHoursPerDay:      z.number().min(1).max(24).default(8),
  dailyOtThresholdHours:   z.number().min(0).max(24).default(8),
  weekendOtMultiplier:     z.number().min(1).max(10).default(2.0),
  holidayOtMultiplier:     z.number().min(1).max(10).default(2.0),
  absentDeductionMode:     z.enum(["calendar", "working"]).default("calendar"),
  standardWorkingDays:     z.number().int().min(20).max(31).default(26),
  defaultHouseRentPct:     z.number().min(0).max(100).default(0),
  defaultMedicalPct:       z.number().min(0).max(100).default(0),
  defaultTransportPct:     z.number().min(0).max(100).default(0),
  defaultFoodAllowancePct: z.number().min(0).max(100).default(0),
  taxCalculationMethod:    z.enum(["flat", "slab"]).default("flat"),
  employerPfPct:           z.number().min(0).max(100).default(0),
  defaultFestivalBonusPct: z.number().min(0).max(100).default(0),
  netPayRounding:          z.enum(["none", "nearest10", "nearest100"]).default("none"),
  weekends:                z.array(z.number().int().min(0).max(6)).default([0, 6]),
});

const policySchema = z.object({
  maxLoanMultiplier: z.number().min(0).max(100).default(0),
  maxActiveLoans:    z.number().int().min(0).max(50).default(0),
});

const payrollSettingsSchema = z.object({
  accounts:    accountsSchema.optional(),
  schedule:    scheduleSchema,
  calculation: calculationSchema,
  policy:      policySchema,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate that all configured account IDs exist and are active.
 */
async function validateAccountIds(accounts: z.infer<typeof accountsSchema>) {
  const ids = Object.values(accounts).filter(Boolean) as string[];
  if (ids.length === 0) return;

  const found = await prisma.chartOfAccount.findMany({
    where: { id: { in: ids }, status: "active" },
    select: { id: true },
  });
  const foundSet = new Set(found.map((a) => a.id));
  const missing = ids.filter((id) => !foundSet.has(id));
  if (missing.length > 0) {
    throw new Error(
      `The following account IDs do not exist or are inactive: ${missing.join(", ")}`
    );
  }
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Get current payroll settings for the settings form.
 */
export async function getPayrollSettingsAction() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", settings: null };

    const result = await getPayrollSettingsFull();
    if (!result) return { success: true, settings: null, isGlobal: false };

    return { success: true, settings: result.settings, isGlobal: result.isGlobal };
  } catch (error) {
    console.error("getPayrollSettingsAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch payroll settings",
      settings: null,
    };
  }
}

/**
 * Save / update payroll settings.
 * Validates structure with Zod, validates account IDs exist, then upserts the Settings row.
 */
export async function updatePayrollSettings(
  settings: Omit<PayrollSettings, "accounts"> & { accounts?: PayrollAccountSettings },
  isGlobal: boolean = false
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Validate shape
    const validated = payrollSettingsSchema.parse(settings);

    // Validate account IDs if provided
    if (validated.accounts) {
      await validateAccountIds(validated.accounts);
    }

    const userId = isGlobal ? null : session.user.id;

    const existing = await prisma.settings.findFirst({
      where: { code: PAYROLL_SETTINGS_KEY, userId, isActive: true },
    });

    let result;
    const isUpdate = !!existing;

    // Merge new settings with existing settings' accounts to prevent losing them
    const existingSettings = existing?.settings as any;
    const finalPayload = {
      ...validated,
      accounts: validated.accounts || existingSettings?.accounts || {
        salaryExpenseAccountId: "",
        defaultSalaryPayableAccountId: "",
        taxPayableAccountId: "",
        pfPayableAccountId: "",
        defaultAdvanceAccountId: "",
        employerPfExpenseAccountId: "",
        employerPfPayableAccountId: "",
        festivalBonusExpenseAccountId: "",
      }
    };

    if (existing) {
      result = await prisma.settings.update({
        where: { id: existing.id },
        data: { settings: finalPayload as Prisma.InputJsonValue, isGlobal },
      });
      await logItemUpdated(
        session.user.id,
        "PayrollSettings",
        result.id,
        ["settings"],
        "Payroll Settings"
      );
    } else {
      result = await prisma.settings.create({
        data: {
          code: PAYROLL_SETTINGS_KEY,
          category: "payroll",
          title: "Payroll Settings",
          settings: finalPayload as Prisma.InputJsonValue,
          isGlobal,
          userId,
          createdBy: session.user.id,
        },
      });
      await logItemCreated(session.user.id, "PayrollSettings", result.id, "Payroll Settings");
    }

    revalidateBothPaths("settings");

    return { success: true, isUpdate, settingId: result.id };
  } catch (error) {
    console.error("updatePayrollSettings error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((e) => e.message).join(", ") };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save payroll settings",
    };
  }
}
