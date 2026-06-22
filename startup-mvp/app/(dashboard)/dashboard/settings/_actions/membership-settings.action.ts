"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { z } from "zod";

import {
  MEMBERSHIP_SETTINGS_KEY,
  type MembershipSettings,
  DEFAULT_MEMBERSHIP_SETTINGS,
} from "./membership-settings.types";

const membershipSettingsSchema = z.object({
  pointsSpentRatio: z.number().min(0.01, "Earning ratio must be greater than 0"),
  pointValue: z.number().min(0, "Point value cannot be negative"),
  enableThresholdDiscount: z.boolean(),
  minPurchaseForDiscount: z.number().min(0, "Purchase threshold cannot be negative"),
  discountPercentage: z.number().min(0, "Discount percentage cannot be negative").max(100, "Discount cannot exceed 100%"),
});

/**
 * Get global membership settings
 */
export async function getMembershipSettingsAction() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", settings: null };
    }

    const globalSetting = await prisma.settings.findFirst({
      where: {
        code: MEMBERSHIP_SETTINGS_KEY,
        userId: null,
        isGlobal: true,
        isActive: true,
      },
      select: {
        settings: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (globalSetting && globalSetting.settings) {
      const settings = globalSetting.settings as unknown as MembershipSettings;
      return {
        success: true,
        settings,
      };
    }

    return {
      success: true,
      settings: DEFAULT_MEMBERSHIP_SETTINGS,
    };
  } catch (error) {
    console.error("getMembershipSettingsAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch membership settings",
      settings: null,
    };
  }
}

/**
 * Save global membership settings
 */
export async function saveMembershipSettingsAction(settings: MembershipSettings) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Only Admin can modify settings
    if (session.user.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Forbidden: Admin access required" };
    }

    // Validate settings structure
    const validated = membershipSettingsSchema.parse(settings);

    // Check if setting already exists
    const existingSetting = await prisma.settings.findFirst({
      where: {
        code: MEMBERSHIP_SETTINGS_KEY,
        userId: null,
        isGlobal: true,
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
        },
      });

      await logItemUpdated(
        session.user.id,
        "Settings",
        result.id,
        ["settings"],
        "Membership Settings"
      );
    } else {
      // Create new setting
      result = await prisma.settings.create({
        data: {
          code: MEMBERSHIP_SETTINGS_KEY,
          category: "peoples",
          title: "Membership Settings",
          settings: validated as Prisma.InputJsonValue,
          isGlobal: true,
          userId: null,
          createdBy: session.user.id,
        },
      });

      await logItemCreated(
        session.user.id,
        "Settings",
        result.id,
        "Membership Settings"
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
    console.error("saveMembershipSettingsAction error:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save membership settings",
    };
  }
}
