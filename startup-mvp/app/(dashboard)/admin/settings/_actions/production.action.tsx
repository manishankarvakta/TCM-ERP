"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertSetting, getSetting } from "../_actions/settings.action";

/**
 * Get Production Settings
 */
export async function getProductionSettings() {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        settings: null,
      };
    }

    const result = await getSetting("production.defaults", "production");
    
    if (!result.success || !result.setting) {
      return {
        success: true,
        settings: {
          defaultWastagePercentage: 0,
          bomDefaults: {},
        },
      };
    }

    const settings = result.setting.settings as {
      defaultWastagePercentage?: number;
      bomDefaults?: Record<string, unknown>;
    };

    return {
      success: true,
      settings: {
        defaultWastagePercentage: settings.defaultWastagePercentage ?? 0,
        bomDefaults: settings.bomDefaults || {},
      },
    };
  } catch (error) {
    console.error("getProductionSettings error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch production settings",
      settings: null,
    };
  }
}

/**
 * Update Production Settings
 */
export async function updateProductionSettings(input: {
  defaultWastagePercentage: number;
  bomDefaults?: Record<string, unknown>;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Validate wastage percentage
    if (input.defaultWastagePercentage < 0 || input.defaultWastagePercentage > 100) {
      return {
        success: false,
        error: "Wastage percentage must be between 0 and 100",
      };
    }

    const result = await upsertSetting({
      code: "production.defaults",
      category: "production",
      title: "Production Defaults",
      settings: {
        defaultWastagePercentage: input.defaultWastagePercentage,
        bomDefaults: input.bomDefaults || {},
      },
      isGlobal: true,
      displayOrder: 0,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to update production settings",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("updateProductionSettings error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update production settings",
    };
  }
}
