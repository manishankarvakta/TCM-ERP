"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function getUnmappedBiometricLogs(
  page = 1,
  limit = 10,
  search = "",
  status = "all", // "unresolved", "resolved", "all"
  deviceSerialNumber = ""
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
        { deviceSerialNumber: { contains: search, mode: "insensitive" } },
        { deviceUserId: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
      ];
    }

    if (deviceSerialNumber) {
      where.deviceSerialNumber = deviceSerialNumber;
    }

    if (status === "unresolved") {
      where.status = "UNRESOLVED";
    } else if (status === "resolved") {
      where.status = "RESOLVED";
    }

    const [logs, total] = await Promise.all([
      prisma.unmappedBiometricLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.unmappedBiometricLog.count({ where }),
    ]);

    // Manually map device names based on serial numbers
    const serials = Array.from(new Set(logs.map(l => l.deviceSerialNumber).filter(Boolean))) as string[];
    const devices = serials.length > 0 ? await prisma.biometricDevice.findMany({
      where: { serialNumber: { in: serials } },
      select: { serialNumber: true, name: true, id: true }
    }) : [];
    
    const deviceMap = new Map(devices.map(d => [d.serialNumber, d]));

    const mappedLogs = logs.map(log => {
      const device = log.deviceSerialNumber ? deviceMap.get(log.deviceSerialNumber) : null;
      return {
        ...log,
        deviceId: device?.id || null,
        deviceName: device?.name || null
      };
    });

    return {
      success: true,
      logs: mappedLogs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error: any) {
    console.error("Error fetching unmapped logs:", error);
    return { success: false, error: error.message || "Failed to fetch logs" };
  }
}

export async function getUnmappedBiometricLogById(id: string) {
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

    const log = await prisma.unmappedBiometricLog.findUnique({
      where: { id },
    });

    if (!log) {
      return { success: false, error: "Log not found" };
    }

    return { success: true, log };
  } catch (error: any) {
    console.error("Error fetching unmapped log:", error);
    return { success: false, error: error.message || "Failed to fetch log" };
  }
}

export async function markUnmappedLogIgnored(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasManagePerm = await hasPermission(session.user.id, "hr.biometric.manage", "manage");
    if (!hasManagePerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    await prisma.unmappedBiometricLog.update({
      where: { id },
      data: { status: "IGNORED" }
    });

    revalidatePath("/dashboard/hr/biometric/unmapped-logs");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to ignore log" };
  }
}

export async function resolveUnmappedBiometricLog(data: {
  unmappedLogId: string;
  employeeId: string;
  deviceId?: string | null;
  deviceSerialNumber: string | null;
  deviceUserId: string;
  createMapping: boolean;
  reprocessAttendance: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const hasManagePerm = await hasPermission(session.user.id, "hr.biometric.manage", "manage");
    if (!hasManagePerm) return { success: false, error: "Forbidden: insufficient permissions" };

    const unmappedLog = await prisma.unmappedBiometricLog.findUnique({
      where: { id: data.unmappedLogId }
    });

    if (!unmappedLog) return { success: false, error: "Log not found" };
    if (unmappedLog.status === "RESOLVED") return { success: false, error: "Already resolved" };

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate employee
      const employee = await tx.employee.findUnique({ where: { id: data.employeeId } });
      if (!employee) throw new Error("Employee not found");

      // 2. Validate device
      let resolvedDeviceId = data.deviceId;
      if (!resolvedDeviceId && data.deviceSerialNumber) {
        const device = await tx.biometricDevice.findUnique({ where: { serialNumber: data.deviceSerialNumber } });
        if (device) resolvedDeviceId = device.id;
      }

      // 3. Create mapping if requested
      if (data.createMapping && resolvedDeviceId) {
        // Check conflicts
        const conflictingPin = await tx.employeeDeviceMap.findFirst({
          where: { deviceId: resolvedDeviceId, deviceUserId: data.deviceUserId }
        });
        if (conflictingPin && conflictingPin.employeeId !== data.employeeId) {
          throw new Error("Conflict: This device PIN is already mapped to a different employee.");
        }

        const existingMapping = await tx.employeeDeviceMap.findFirst({
          where: { employeeId: data.employeeId, deviceId: resolvedDeviceId }
        });

        if (!existingMapping && !conflictingPin) {
          await tx.employeeDeviceMap.create({
            data: {
              employeeId: data.employeeId,
              deviceId: resolvedDeviceId,
              deviceUserId: data.deviceUserId,
              isActive: true,
            }
          });
        }
      } else if (data.createMapping && !resolvedDeviceId) {
        throw new Error("Cannot create mapping without a known Device.");
      }

      // 4. Reprocess attendance if requested
      if (data.reprocessAttendance) {
        // Check for existing duplicate attendance punch
        const existingAttendance = await tx.attendanceLog.findUnique({
          where: {
            employeeId_timestamp: {
              employeeId: data.employeeId,
              timestamp: unmappedLog.punchTime
            }
          }
        });

        if (!existingAttendance) {
          await tx.attendanceLog.create({
            data: {
              employeeId: data.employeeId,
              timestamp: unmappedLog.punchTime,
              source: "BIOMETRIC",
              deviceId: resolvedDeviceId || null,
            }
          });
        }
      }

      // 5. Mark as resolved
      const updatedLog = await tx.unmappedBiometricLog.update({
        where: { id: data.unmappedLogId },
        data: { status: "RESOLVED" }
      });

      return updatedLog;
    });

    revalidatePath("/dashboard/hr/biometric/unmapped-logs");
    return { success: true, log: result };
  } catch (error: any) {
    console.error("Resolution error:", error);
    return { success: false, error: error.message || "Failed to resolve log" };
  }
}

export async function getActiveEmployeesForResolve() {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    
    return await prisma.employee.findMany({
      where: { status: { in: ["active", "inactive"] } },
      select: { id: true, name: true, employeeCode: true, department: true, designation: true },
      orderBy: { name: "asc" }
    });
  } catch (e) {
    return [];
  }
}

export async function getActiveDevicesForResolve() {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    
    return await prisma.biometricDevice.findMany({
      where: { isActive: true },
      select: { id: true, name: true, serialNumber: true, location: true },
      orderBy: { name: "asc" }
    });
  } catch (e) {
    return [];
  }
}
