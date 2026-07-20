"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { z } from "zod";
import type { AccountingOperationSettings } from "@/types/accounting-settings";
import { ACCOUNTING_OPERATIONS_KEY } from "@/types/accounting-settings";

/**
 * Validation schema for accounting operation settings
 */
const accountingOperationSettingsSchema = z.object({
  purchase: z.object({
    inventoryAccountId: z.string(),
    payableAccountId: z.string().optional().default(""),
  }),
  sales: z.object({
    revenueAccountId: z.string(),
    receivableAccountId: z.string().optional().default(""),
    cogsAccountId: z.string(),
    finishedGoodsInventoryAccountId: z.string(),
    couponDiscountAccountId: z.string().optional().default(""),
    salesDiscountAccountId: z.string().optional().default(""),
  }),
  production: z.object({
    consumptionWipAccountId: z.string(),
    consumptionRawMaterialInventoryId: z.string(),
    completionFinishedGoodsInventoryId: z.string(),
    completionWipAccountId: z.string(),
  }),
  inventoryAdjustment: z.object({
    positiveFgInventoryId: z.string(),
    positiveRmInventoryId: z.string(),
    positiveAdjustmentGainId: z.string(),
    negativeFgInventoryId: z.string(),
    negativeRmInventoryId: z.string(),
    negativeAdjustmentExpenseId: z.string(),
  }),
  payment: z.object({
    cashAccountId: z.string(),
    payableAccountId: z.string().optional().default(""),
  }),
  receipt: z.object({
    cashAccountId: z.string(),
    receivableAccountId: z.string().optional().default(""),
  }),
  contra: z.object({
    fromAccountId: z.string().optional().default(""),
    toAccountId: z.string().optional().default(""),
  }),
  payroll: z.object({
    salaryExpenseAccountId: z.string().optional().default(""),
    defaultSalaryPayableAccountId: z.string().optional().default(""),
    taxPayableAccountId: z.string().optional().default(""),
    pfPayableAccountId: z.string().optional().default(""),
    defaultAdvanceAccountId: z.string().optional().default(""),
    employerPfExpenseAccountId: z.string().optional().default(""),
    employerPfPayableAccountId: z.string().optional().default(""),
    festivalBonusExpenseAccountId: z.string().optional().default(""),
  }),
});

/**
 * Get accounting operation settings for current user or global
 */
export async function getAccountingOperationSettingsAction() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", settings: null };
    }

    const { getAccountingOperationSettingsFull } = await import("@/lib/accounting-settings");
    const result = await getAccountingOperationSettingsFull();
    
    if (!result) {
       return { success: true, settings: null, isGlobal: false };
    }

    return {
      success: true,
      settings: result.settings,
      isGlobal: result.isGlobal,
    };
  } catch (error) {
    console.error("getAccountingOperationSettingsAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch accounting settings",
      settings: null,
    };
  }
}

/**
 * Update accounting operation settings
 */
export async function updateAccountingOperationSettings(
  settings: AccountingOperationSettings,
  isGlobal: boolean = false
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate settings structure
    const validated = accountingOperationSettingsSchema.parse(settings);

    // Run strict validation on account types and existence
    const { validateOperationAccountSettings } = await import("@/lib/accounting-settings-validation");
    
    try {
      await validateOperationAccountSettings(validated);
    } catch (error) {
      // Return validation errors to user
      return {
        success: false,
        error: error instanceof Error ? error.message : "Validation failed",
      };
    }

    const userId = isGlobal ? null : session.user.id;

    // Check if setting already exists
    const existingSetting = await prisma.settings.findFirst({
      where: {
        code: ACCOUNTING_OPERATIONS_KEY,
        userId: userId,
        isActive: true,
      },
    });

    let result;
    const isUpdate = !!existingSetting;

    if (existingSetting) {
      // Update existing setting
      result = await prisma.settings.update({
        where: { id: existingSetting.id },
        data: {
          settings: validated as Prisma.InputJsonValue,
          isGlobal: isGlobal,
        },
      });

      await logItemUpdated(
        session.user.id,
        "AccountingOperationSettings",
        result.id,
        ["settings"],
        "Accounting Operation Settings"
      );
    } else {
      // Create new setting
      result = await prisma.settings.create({
        data: {
          code: ACCOUNTING_OPERATIONS_KEY,
          category: "accounting",
          title: "Accounting Operation Settings",
          settings: validated as Prisma.InputJsonValue,
          isGlobal: isGlobal,
          userId: userId,
          createdBy: session.user.id,
        },
      });

      await logItemCreated(
        session.user.id,
        "AccountingOperationSettings",
        result.id,
        "Accounting Operation Settings"
      );
    }

    // Revalidate paths
    revalidateBothPaths("settings");

    return {
      success: true,
      isUpdate,
      settingId: result.id,
    };
  } catch (error) {
    console.error("updateAccountingOperationSettings error:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save accounting settings",
    };
  }
}
