"use server";

import { prisma } from "@/lib/prisma";

export async function isGarmentsModuleEnabled(): Promise<boolean> {
  // 1. Check environment override
  if (process.env.NEXT_PUBLIC_ENABLE_GARMENTS === "false") {
    return false;
  }
  if (process.env.NEXT_PUBLIC_ENABLE_GARMENTS === "true") {
    return true;
  }

  // 2. Query system-wide global settings
  try {
    const configSetting = await prisma.settings.findFirst({
      where: {
        code: "system_config",
        isGlobal: true,
      },
    });

    if (configSetting && typeof configSetting.settings === "object") {
      const settingsObj = configSetting.settings as Record<string, any>;
      return settingsObj.garmentsEnabled === true;
    }
  } catch (error) {
    console.error("Error reading garment feature flag:", error);
  }

  // Default to true as standard fallback for database availability
  return true;
}
