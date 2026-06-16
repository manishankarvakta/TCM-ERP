"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { employeeDeviceMappingSchema } from "../_schemas/mapping.schema";

export async function getEmployeeDeviceMappings(
  page = 1,
  limit = 10,
  search = "",
  status = "all",
  deviceId = ""
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasViewPerm = await hasPermission(session.user.id, "hr.biometric.view", "view");
    const hasManagePerm = await hasPermission(session.user.id, "hr.biometric.manage", "manage");
    if (!hasViewPerm && !hasManagePerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (search) {
      where.OR = [
        { employee: { name: { contains: search, mode: "insensitive" } } },
        { employee: { employeeCode: { contains: search, mode: "insensitive" } } },
        { device: { name: { contains: search, mode: "insensitive" } } },
        { device: { serialNumber: { contains: search, mode: "insensitive" } } },
        { deviceUserId: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    if (deviceId && deviceId !== "all") {
      where.deviceId = deviceId;
    }

    const [mappings, total] = await Promise.all([
      prisma.employeeDeviceMap.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { id: true, name: true, employeeCode: true, department: true, designation: true },
          },
          device: {
            select: { id: true, name: true, serialNumber: true, location: true },
          },
        },
      }),
      prisma.employeeDeviceMap.count({ where }),
    ]);

    return {
      success: true,
      mappings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error: any) {
    console.error("Error fetching mappings:", error);
    return { success: false, error: error.message || "Failed to fetch mappings" };
  }
}

export async function createEmployeeDeviceMapping(data: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasManagePerm = await hasPermission(session.user.id, "hr.biometric.manage", "manage");
    if (!hasManagePerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    const validated = employeeDeviceMappingSchema.parse(data);

    // 1. Check same deviceId + deviceUserId
    const samePin = await prisma.employeeDeviceMap.findFirst({
      where: { deviceId: validated.deviceId, deviceUserId: validated.deviceUserId },
    });
    if (samePin) {
      return { success: false, error: "This PIN/User ID is already mapped on this device." };
    }

    // 2. Check same employeeId + deviceId
    const sameEmployeeDevice = await prisma.employeeDeviceMap.findFirst({
      where: { employeeId: validated.employeeId, deviceId: validated.deviceId },
    });
    if (sameEmployeeDevice) {
      return { success: false, error: "This employee is already mapped to this device." };
    }

    const mapping = await prisma.employeeDeviceMap.create({
      data: {
        employeeId: validated.employeeId,
        deviceId: validated.deviceId,
        deviceUserId: validated.deviceUserId,
        isActive: validated.isActive,
      },
    });

    revalidatePath("/dashboard/hr/biometric/mapping");
    return { success: true, mapping };
  } catch (error: any) {
    console.error("Error creating mapping:", error);
    return { success: false, error: error.message || "Failed to create mapping" };
  }
}

export async function updateEmployeeDeviceMapping(id: string, data: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasManagePerm = await hasPermission(session.user.id, "hr.biometric.manage", "manage");
    if (!hasManagePerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    const validated = employeeDeviceMappingSchema.parse(data);

    // 1. Check same deviceId + deviceUserId
    const samePin = await prisma.employeeDeviceMap.findFirst({
      where: { deviceId: validated.deviceId, deviceUserId: validated.deviceUserId, NOT: { id } },
    });
    if (samePin) {
      return { success: false, error: "This PIN/User ID is already mapped on this device." };
    }

    // 2. Check same employeeId + deviceId
    const sameEmployeeDevice = await prisma.employeeDeviceMap.findFirst({
      where: { employeeId: validated.employeeId, deviceId: validated.deviceId, NOT: { id } },
    });
    if (sameEmployeeDevice) {
      return { success: false, error: "This employee is already mapped to this device." };
    }

    const mapping = await prisma.employeeDeviceMap.update({
      where: { id },
      data: {
        employeeId: validated.employeeId,
        deviceId: validated.deviceId,
        deviceUserId: validated.deviceUserId,
        isActive: validated.isActive,
      },
    });

    revalidatePath("/dashboard/hr/biometric/mapping");
    return { success: true, mapping };
  } catch (error: any) {
    console.error("Error updating mapping:", error);
    return { success: false, error: error.message || "Failed to update mapping" };
  }
}

export async function toggleEmployeeDeviceMappingStatus(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasManagePerm = await hasPermission(session.user.id, "hr.biometric.manage", "manage");
    if (!hasManagePerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    const mapping = await prisma.employeeDeviceMap.findUnique({ where: { id } });
    if (!mapping) return { success: false, error: "Mapping not found" };

    const updated = await prisma.employeeDeviceMap.update({
      where: { id },
      data: { isActive: !mapping.isActive },
    });

    revalidatePath("/dashboard/hr/biometric/mapping");
    return { success: true, mapping: updated };
  } catch (error: any) {
    console.error("Error toggling mapping status:", error);
    return { success: false, error: error.message || "Failed to toggle status" };
  }
}

export async function deleteEmployeeDeviceMapping(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasManagePerm = await hasPermission(session.user.id, "hr.biometric.manage", "manage");
    if (!hasManagePerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    await prisma.employeeDeviceMap.delete({ where: { id } });

    revalidatePath("/dashboard/hr/biometric/mapping");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting mapping:", error);
    return { success: false, error: error.message || "Failed to delete mapping" };
  }
}
