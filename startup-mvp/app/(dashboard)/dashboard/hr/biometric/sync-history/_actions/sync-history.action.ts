"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function getBiometricSyncHistory(
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
        { errorMessage: { contains: search, mode: "insensitive" } },
        { device: { name: { contains: search, mode: "insensitive" } } },
        { device: { serialNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (source && source !== "all") {
      where.vendor = source;
    }

    const [logs, total] = await Promise.all([
      prisma.biometricSyncLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          device: {
            select: { id: true, name: true, serialNumber: true }
          },
          user: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.biometricSyncLog.count({ where }),
    ]);

    return {
      success: true,
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error: any) {
    console.error("Error fetching sync history:", error);
    return { success: false, error: error.message || "Failed to fetch history" };
  }
}
