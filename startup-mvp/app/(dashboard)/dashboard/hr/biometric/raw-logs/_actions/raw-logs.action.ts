"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function getBiometricRawLogs(
  page = 1,
  limit = 10,
  search = "",
  status = "all",
  source = "all"
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasViewPerm = await hasPermission(session.user.id, "hr.biometric.view", "view");
    if (!hasViewPerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (search) {
      where.OR = [
        { deviceSerialNumber: { contains: search, mode: "insensitive" } },
        { deviceUserId: { contains: search, mode: "insensitive" } },
        { rawData: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      where.syncStatus = status;
    }

    if (source && source !== "all") {
      where.source = source;
    }

    // Select specific fields, omit rawData to prevent heavy payloads for table view
    const [rawLogs, total] = await Promise.all([
      prisma.biometricRawLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          deviceId: true,
          deviceSerialNumber: true,
          deviceUserId: true,
          punchTime: true,
          source: true,
          syncStatus: true,
          createdAt: true,
          // Omitting rawData for table
        },
      }),
      prisma.biometricRawLog.count({ where }),
    ]);

    // Manually map device names if deviceIds exist
    const deviceIds = Array.from(new Set(rawLogs.map(l => l.deviceId).filter(Boolean))) as string[];
    const devices = deviceIds.length > 0 ? await prisma.biometricDevice.findMany({
      where: { id: { in: deviceIds } },
      select: { id: true, name: true }
    }) : [];
    
    const deviceMap = new Map(devices.map(d => [d.id, d.name]));

    const mappedLogs = rawLogs.map(log => ({
      ...log,
      deviceName: log.deviceId ? deviceMap.get(log.deviceId) || null : null
    }));

    return {
      success: true,
      logs: mappedLogs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error: any) {
    console.error("Error fetching raw logs:", error);
    return { success: false, error: error.message || "Failed to fetch logs" };
  }
}

export async function getBiometricRawLogById(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasViewPerm = await hasPermission(session.user.id, "hr.biometric.view", "view");
    if (!hasViewPerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    const log = await prisma.biometricRawLog.findUnique({
      where: { id },
    });

    if (!log) {
      return { success: false, error: "Log not found" };
    }

    return { success: true, log };
  } catch (error: any) {
    console.error("Error fetching raw log:", error);
    return { success: false, error: error.message || "Failed to fetch log" };
  }
}
