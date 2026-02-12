"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { z } from "zod";

/**
 * Get setting by code and category
 */
export async function getSetting(code: string, category: string, userId?: string | null) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        setting: null,
      };
    }

    const where: any = {
      code,
      category,
      is_active: true,
    };

    // If userId is provided, get user-specific setting, otherwise get global setting
    if (userId !== undefined) {
      where.user_id = userId;
    } else {
      // Try to get user-specific setting first, then global
      const userSetting = await prisma.settings.findFirst({
        where: {
          code,
          category,
          user_id: session.user.id,
          is_active: true,
        },
        include: {
          User_settings_user_idToUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          User_settings_created_byToUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      if (userSetting) {
        return {
          success: true,
          setting: {
            ...userSetting,
            user: userSetting.User_settings_user_idToUser,
            creator: userSetting.User_settings_created_byToUser,
          },
        };
      }

      // Fallback to global setting
      where.user_id = null;
      where.is_global = true;
    }

    const setting = await prisma.settings.findFirst({
      where,
      include: {
        User_settings_user_idToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        User_settings_created_byToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return {
      success: true,
      setting: setting ? {
        ...setting,
        user: setting.User_settings_user_idToUser,
        creator: setting.User_settings_created_byToUser,
      } : null,
    };
  } catch (error) {
    console.error("getSetting error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch setting",
      setting: null,
    };
  }
}

/**
 * Get all settings by category
 */
export async function getSettingsByCategory(
  category: string,
  userId?: string | null
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        settings: [],
      };
    }

    const where: any = {
      category,
      is_active: true,
    };

    if (userId !== undefined) {
      where.user_id = userId;
    } else {
      // Get both user-specific and global settings
      where.OR = [
        { user_id: session.user.id },
        { is_global: true, user_id: null },
      ];
    }

    const settings = await prisma.settings.findMany({
      where,
      include: {
        User_settings_user_idToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        User_settings_created_byToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        display_order: "asc",
      },
    });

    return {
      success: true,
      settings: settings.map(s => ({
        ...s,
        user: s.User_settings_user_idToUser,
        creator: s.User_settings_created_byToUser,
      })),
    };
  } catch (error) {
    console.error("getSettingsByCategory error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch settings",
      settings: [],
    };
  }
}

/**
 * Create or update a setting
 */
const settingSchema = z.object({
  code: z.string().min(1),
  category: z.string().min(1),
  title: z.string().min(1),
  settings: z.record(z.string(), z.any()),
  isGlobal: z.boolean().optional().default(false),
  displayOrder: z.number().optional().default(0),
});

export async function upsertSetting(input: {
  code: string;
  category: string;
  title: string;
  settings: Record<string, unknown>;
  isGlobal?: boolean;
  displayOrder?: number;
  userId?: string | null;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        setting: null,
      };
    }

    // Validate input
    const validated = settingSchema.parse({
      code: input.code,
      category: input.category,
      title: input.title,
      settings: input.settings,
      isGlobal: input.isGlobal ?? false,
      displayOrder: input.displayOrder ?? 0,
    });

    const userIdValue = input.userId !== undefined ? input.userId : (validated.isGlobal ? null : session.user.id);

    // Check if setting already exists
    const whereClause: any = {
      code: validated.code,
      category: validated.category,
      is_active: true,
    };

    if (validated.isGlobal) {
      whereClause.user_id = null;
      whereClause.is_global = true;
    } else {
      whereClause.user_id = userIdValue;
    }

    const existingSetting = await prisma.settings.findFirst({
      where: whereClause,
    });

    let setting;
    const isUpdate = !!existingSetting;

    if (existingSetting) {
      // Update existing setting
      const changes: string[] = [];
      if (validated.title !== existingSetting.title) changes.push("title");
      if (JSON.stringify(validated.settings) !== JSON.stringify(existingSetting.settings)) changes.push("settings");
      if (validated.isGlobal !== existingSetting.is_global) changes.push("is_global");
      if (validated.displayOrder !== existingSetting.display_order) changes.push("display_order");

      setting = await prisma.settings.update({
        where: { id: existingSetting.id },
        data: {
          title: validated.title,
          settings: validated.settings as Prisma.InputJsonValue,
          is_global: validated.isGlobal,
          display_order: validated.displayOrder,
          updated_at: new Date(),
        },
        include: {
          User_settings_user_idToUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          User_settings_created_byToUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      // Log update
      if (changes.length > 0) {
        await logItemUpdated(
          session.user.id,
          "Settings",
          setting.id,
          changes,
          setting.title,
          {
            code: setting.code,
            category: setting.category,
            changes,
          }
        );
      }
    } else {
      // Create new setting
      setting = await prisma.settings.create({
        data: {
          id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          code: validated.code,
          category: validated.category,
          title: validated.title,
          settings: validated.settings as Prisma.InputJsonValue,
          is_global: validated.isGlobal,
          display_order: validated.displayOrder,
          user_id: userIdValue,
          created_by: session.user.id,
        },
        include: {
          User_settings_user_idToUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          User_settings_created_byToUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      // Log creation
      await logItemCreated(
        session.user.id,
        "Settings",
        setting.id,
        setting.title,
        {
          code: setting.code,
          category: setting.category,
        }
      );
    }

    const mappedSetting = {
      ...setting,
      user: setting.User_settings_user_idToUser,
      creator: setting.User_settings_created_byToUser,
    };

    // Revalidate settings page
    revalidateBothPaths("/dashboard/settings");

    return {
      success: true,
      setting: mappedSetting,
      isUpdate,
    };
  } catch (error) {
    console.error("upsertSetting error:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
        setting: null,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save setting",
      setting: null,
    };
  }
}

/**
 * Delete a setting (soft delete)
 */
export async function deleteSetting(settingId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const existingSetting = await prisma.settings.findUnique({
      where: { id: settingId },
    });

    if (!existingSetting) {
      return {
        success: false,
        error: "Setting not found",
      };
    }

    // Soft delete
    await prisma.settings.update({
      where: { id: settingId },
      data: { is_active: false },
    });

    // Log deletion
    await logItemDeleted(
      session.user.id,
      "Settings",
      settingId,
      existingSetting.title,
      {
        code: existingSetting.code,
        category: existingSetting.category,
      }
    );

    // Revalidate settings page
    revalidateBothPaths("/dashboard/settings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteSetting error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete setting",
    };
  }
}

/**
 * Permanently delete a setting
 */
export async function deleteSettingPermanently(settingId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const existingSetting = await prisma.settings.findUnique({
      where: { id: settingId },
    });

    if (!existingSetting) {
      return {
        success: false,
        error: "Setting not found",
      };
    }

    // Permanently delete
    await prisma.settings.delete({
      where: { id: settingId },
    });

    // Revalidate settings page
    revalidateBothPaths("/dashboard/settings");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteSettingPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete setting",
    };
  }
}
