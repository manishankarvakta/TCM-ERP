"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { z } from "zod";

import {
  POS_SETTINGS_KEY,
  posSettingsSchema,
  type POSSettings,
  DEFAULT_POS_SETTINGS,
} from "./pos-settings.types";

/**
 * Get global POS settings
 */
export async function getPOSSettingsAction() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", settings: null };
    }

    const globalSetting = await prisma.settings.findFirst({
      where: {
        code: POS_SETTINGS_KEY,
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
      const settings = globalSetting.settings as unknown as POSSettings;
      return {
        success: true,
        settings: {
          ...DEFAULT_POS_SETTINGS,
          ...settings,
        },
      };
    }

    return {
      success: true,
      settings: DEFAULT_POS_SETTINGS,
    };
  } catch (error) {
    console.error("getPOSSettingsAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch POS settings",
      settings: null,
    };
  }
}

/**
 * Save global POS settings
 */
export async function savePOSSettingsAction(settings: POSSettings) {
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
    const validated = posSettingsSchema.parse(settings);

    // Check if setting already exists
    const existingSetting = await prisma.settings.findFirst({
      where: {
        code: POS_SETTINGS_KEY,
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
        "POS Settings"
      );
    } else {
      // Create new setting
      result = await prisma.settings.create({
        data: {
          code: POS_SETTINGS_KEY,
          category: "pos",
          title: "POS Settings",
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
        "POS Settings"
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
    console.error("savePOSSettingsAction error:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save POS settings",
    };
  }
}
