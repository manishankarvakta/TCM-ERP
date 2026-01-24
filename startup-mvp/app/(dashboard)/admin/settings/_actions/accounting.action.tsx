"use server";

import { auth } from "@/lib/auth";
import { upsertSetting, getSetting } from "../_actions/settings.action";

export type COGSMethod = "FIFO" | "LIFO" | "AVERAGE" | "SPECIFIC_IDENTIFICATION";

/**
 * Get Accounting Settings
 */
export async function getAccountingSettings() {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        settings: null,
      };
    }

    const result = await getSetting("accounting.defaults", "accounting");
    
    if (!result.success || !result.setting) {
      return {
        success: true,
        settings: {
          cogsMethod: "FIFO" as COGSMethod,
        },
      };
    }

    const settings = result.setting.settings as {
      cogsMethod?: COGSMethod;
    };

    return {
      success: true,
      settings: {
        cogsMethod: settings.cogsMethod || ("FIFO" as COGSMethod),
      },
    };
  } catch (error) {
    console.error("getAccountingSettings error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch accounting settings",
      settings: null,
    };
  }
}

/**
 * Update Accounting Settings
 */
export async function updateAccountingSettings(input: {
  cogsMethod: COGSMethod;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Validate COGS method
    const validMethods: COGSMethod[] = ["FIFO", "LIFO", "AVERAGE", "SPECIFIC_IDENTIFICATION"];
    if (!validMethods.includes(input.cogsMethod)) {
      return {
        success: false,
        error: "Invalid COGS method",
      };
    }

    const result = await upsertSetting({
      code: "accounting.defaults",
      category: "accounting",
      title: "Accounting Defaults",
      settings: {
        cogsMethod: input.cogsMethod,
      },
      isGlobal: true,
      displayOrder: 0,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to update accounting settings",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("updateAccountingSettings error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update accounting settings",
    };
  }
}
