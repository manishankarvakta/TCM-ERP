"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertSetting, getSetting } from "../_actions/settings.action";

/**
 * Get Inventory Settings
 */
export async function getInventorySettings() {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        settings: null,
      };
    }

    const result = await getSetting("inventory.defaults", "inventory");
    
    if (!result.success || !result.setting) {
      return {
        success: true,
        settings: {
          defaultWarehouseId: null,
        },
      };
    }

    const settings = result.setting.settings as {
      defaultWarehouseId?: string | null;
    };

    return {
      success: true,
      settings: {
        defaultWarehouseId: settings.defaultWarehouseId || null,
      },
    };
  } catch (error) {
    console.error("getInventorySettings error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch inventory settings",
      settings: null,
    };
  }
}

/**
 * Update Inventory Settings
 */
export async function updateInventorySettings(input: {
  defaultWarehouseId: string | null;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Validate warehouse exists if provided
    if (input.defaultWarehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: input.defaultWarehouseId },
        select: { id: true, status: true, isTrash: true },
      });

      if (!warehouse || warehouse.status !== "active" || warehouse.isTrash) {
        return {
          success: false,
          error: "Selected warehouse is not active",
        };
      }
    }

    const result = await upsertSetting({
      code: "inventory.defaults",
      category: "inventory",
      title: "Inventory Defaults",
      settings: {
        defaultWarehouseId: input.defaultWarehouseId,
      },
      isGlobal: true,
      displayOrder: 0,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to update inventory settings",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("updateInventorySettings error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update inventory settings",
    };
  }
}
