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

    const where: Prisma.SettingsWhereInput = {
      code,
      category,
      isActive: true,
    };

    // If userId is provided, get user-specific setting, otherwise get global setting
    if (userId !== undefined) {
      where.userId = userId;
    } else {
      // Try to get user-specific setting first, then global
      const userSetting = await prisma.settings.findFirst({
        where: {
          code,
          category,
          userId: session.user.id,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (userSetting) {
        return {
          success: true,
          setting: userSetting,
        };
      }

      // Fallback to global setting
      where.userId = null;
      where.isGlobal = true;
    }

    const setting = await prisma.settings.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      setting,
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

    const where: Prisma.SettingsWhereInput = {
      category,
      isActive: true,
    };

    if (userId !== undefined) {
      where.userId = userId;
    } else {
      // Get both user-specific and global settings
      where.OR = [
        { userId: session.user.id },
        { isGlobal: true, userId: null },
      ];
    }

    const settings = await prisma.settings.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    return {
      success: true,
      settings,
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

    const userId = input.userId !== undefined ? input.userId : (validated.isGlobal ? null : session.user.id);

    // Check if setting already exists
    const whereClause: Prisma.SettingsWhereInput = {
      code: validated.code,
      category: validated.category,
      isActive: true,
    };

    if (validated.isGlobal) {
      whereClause.userId = null;
      whereClause.isGlobal = true;
    } else {
      whereClause.userId = userId;
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
      if (validated.isGlobal !== existingSetting.isGlobal) changes.push("isGlobal");
      if (validated.displayOrder !== existingSetting.displayOrder) changes.push("displayOrder");

      setting = await prisma.settings.update({
        where: { id: existingSetting.id },
        data: {
          title: validated.title,
          settings: validated.settings as Prisma.InputJsonValue,
          isGlobal: validated.isGlobal,
          displayOrder: validated.displayOrder,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          creator: {
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
          code: validated.code,
          category: validated.category,
          title: validated.title,
          settings: validated.settings as Prisma.InputJsonValue,
          isGlobal: validated.isGlobal,
          displayOrder: validated.displayOrder,
          userId,
          createdBy: session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          creator: {
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

    // Revalidate settings page
    revalidateBothPaths("settings");

    return {
      success: true,
      setting,
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
      data: { isActive: false },
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
    revalidateBothPaths("settings");

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
    revalidateBothPaths("settings");

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
