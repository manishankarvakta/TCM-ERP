"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { biometricDeviceSchema } from "../_schemas/device.schema";

export async function getBiometricDevices(
  page = 1,
  limit = 10,
  search = "",
  status = "all"
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
        { name: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const [devices, total] = await Promise.all([
      prisma.biometricDevice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { 
          warehouse: { select: { id: true, name: true, code: true } },
          _count: { select: { deviceMappings: true } }
        },
      }),
      prisma.biometricDevice.count({ where }),
    ]);

    return {
      success: true,
      devices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    console.error("Error fetching biometric devices:", error);
    return { success: false, error: error.message || "Failed to fetch devices" };
  }
}

export async function getActiveWarehouses() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const warehouses = await prisma.warehouse.findMany({
      where: { status: "active", isTrash: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return { success: true, warehouses };
  } catch (error: any) {
    console.error("Error fetching warehouses:", error);
    return { success: false, error: error.message || "Failed to fetch warehouses" };
  }
}

export async function getBiometricDeviceById(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasViewPerm = await hasPermission(session.user.id, "hr.biometric.view", "view");
    if (!hasViewPerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    const device = await prisma.biometricDevice.findUnique({
      where: { id },
    });

    if (!device) {
      return { success: false, error: "Device not found" };
    }

    return { success: true, device };
  } catch (error: any) {
    console.error("Error fetching device:", error);
    return { success: false, error: error.message || "Failed to fetch device" };
  }
}

export async function createBiometricDevice(data: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasManagePerm = await hasPermission(session.user.id, "hr.biometric.manage", "manage");
    if (!hasManagePerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    const validatedData = biometricDeviceSchema.parse(data);

    // Check duplicate serial number
    const existing = await prisma.biometricDevice.findUnique({
      where: { serialNumber: validatedData.serialNumber },
    });

    if (existing) {
      return { success: false, error: "Device with this serial number already exists" };
    }

    const device = await prisma.biometricDevice.create({
      data: {
        name: validatedData.name,
        serialNumber: validatedData.serialNumber,
        ipAddress: validatedData.ipAddress || null,
        port: validatedData.port || 4370,
        location: validatedData.location || null,
        deviceType: validatedData.deviceType || "ATTENDANCE",
        connectionMode: validatedData.connectionMode || "ADMS",
        isActive: validatedData.isActive,
        warehouseId: validatedData.warehouseId || null,
        vendor: validatedData.vendor,
        username: validatedData.username || null,
        password: validatedData.password || null,
        createdBy: session.user.id,
      },
    });

    revalidatePath("/dashboard/hr/biometric/devices");
    return { success: true, device };
  } catch (error: any) {
    console.error("Error creating device:", error);
    return { success: false, error: error.message || "Failed to create device" };
  }
}

export async function updateBiometricDevice(id: string, data: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasManagePerm = await hasPermission(session.user.id, "hr.biometric.manage", "manage");
    if (!hasManagePerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    console.log("updateBiometricDevice input:", id, data);
    const validatedData = biometricDeviceSchema.parse(data);
    console.log("Validated Data:", validatedData);

    // Check duplicate serial number (excluding self)
    const existing = await prisma.biometricDevice.findFirst({
      where: { 
        serialNumber: validatedData.serialNumber,
        NOT: { id }
      },
    });

    if (existing) {
      return { success: false, error: "Device with this serial number already exists" };
    }

    const device = await prisma.biometricDevice.update({
      where: { id },
      data: {
        name: validatedData.name,
        serialNumber: validatedData.serialNumber,
        ipAddress: validatedData.ipAddress || null,
        port: validatedData.port || 4370,
        location: validatedData.location || null,
        deviceType: validatedData.deviceType || "ATTENDANCE",
        connectionMode: validatedData.connectionMode || "ADMS",
        isActive: validatedData.isActive,
        warehouseId: validatedData.warehouseId || null,
        vendor: validatedData.vendor,
        username: validatedData.username || null,
        password: validatedData.password || null,
      },
    });

    revalidatePath("/dashboard/hr/biometric/devices");
    revalidatePath(`/dashboard/hr/biometric/devices/${id}/edit`);
    return { success: true, device };
  } catch (error: any) {
    console.error("Error updating device:", error);
    return { success: false, error: error.message || "Failed to update device" };
  }
}

export async function toggleBiometricDeviceStatus(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasManagePerm = await hasPermission(session.user.id, "hr.biometric.manage", "manage");
    if (!hasManagePerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    const device = await prisma.biometricDevice.findUnique({
      where: { id },
    });

    if (!device) {
      return { success: false, error: "Device not found" };
    }

    const updated = await prisma.biometricDevice.update({
      where: { id },
      data: {
        isActive: !device.isActive,
        status: !device.isActive ? "active" : "inactive",
      },
    });

    revalidatePath("/dashboard/hr/biometric/devices");
    return { success: true, device: updated };
  } catch (error: any) {
    console.error("Error toggling device status:", error);
    return { success: false, error: error.message || "Failed to toggle status" };
  }
}
