"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { z } from "zod";
import type { PreferencesSettings } from "@/types/preferences";
import { PREFERENCES_KEY } from "@/types/preferences";
import { DEFAULT_PREFERENCES } from "@/lib/preferences-data";

/**
 * Validation schema for preferences
 */
const preferencesSchema = z.object({
  currency: z.string().min(3).max(3),
  currencySymbol: z.string().min(1),
  country: z.string().min(2).max(2),
  language: z.string().min(2).max(5),
  timezone: z.string().min(1),
  dateFormat: z.string().min(1),
  timeFormat: z.enum(["12h", "24h"]),
  decimalSeparator: z.enum([".", ","]),
  thousandsSeparator: z.enum([",", ".", " ", "none"]),
});

/**
 * Get preferences for current user or global
 */
export async function getPreferencesAction() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", preferences: null };
    }

    // Try user-specific preferences first
    const userSetting = await prisma.settings.findFirst({
      where: {
        code: PREFERENCES_KEY,
        userId: session.user.id,
        isActive: true,
      },
      select: {
        settings: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (userSetting && userSetting.settings) {
      const preferences = userSetting.settings as unknown as PreferencesSettings;
      return {
        success: true,
        preferences,
      };
    }

    // Fallback to global preferences
    const globalSetting = await prisma.settings.findFirst({
      where: {
        code: PREFERENCES_KEY,
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
      const preferences = globalSetting.settings as unknown as PreferencesSettings;
      return {
        success: true,
        preferences,
      };
    }

    // Return defaults if nothing found
    return {
      success: true,
      preferences: DEFAULT_PREFERENCES,
    };
  } catch (error) {
    console.error("getPreferencesAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch preferences",
      preferences: null,
    };
  }
}

/**
 * Update preferences
 */
export async function updatePreferencesAction(
  preferences: PreferencesSettings,
  isGlobal: boolean = false
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate preferences structure
    const validated = preferencesSchema.parse(preferences);

    const userId = isGlobal ? null : session.user.id;

    // Check if setting already exists
    const existingSetting = await prisma.settings.findFirst({
      where: {
        code: PREFERENCES_KEY,
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
        "Preferences",
        result.id,
        ["settings"],
        "App Preferences"
      );
    } else {
      // Create new setting
      result = await prisma.settings.create({
        data: {
          code: PREFERENCES_KEY,
          category: "app",
          title: "App Preferences",
          settings: validated as Prisma.InputJsonValue,
          isGlobal: isGlobal,
          userId: userId,
          createdBy: session.user.id,
        },
      });

      await logItemCreated(
        session.user.id,
        "Preferences",
        result.id,
        "App Preferences"
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
    console.error("updatePreferencesAction error:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save preferences",
    };
  }
}
