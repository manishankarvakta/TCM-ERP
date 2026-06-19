"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { syncBiometricLogs, enqueueSafeAdmsCommand } from "@/lib/hr/biometric/sync-service";

export async function mapDevicePinToEmployee(
  deviceId: string,
  deviceSerialNumber: string,
  deviceUserId: string,
  employeeId: string
) {
  try {
    // 1. Upsert the mapping
    await prisma.employeeDeviceMap.upsert({
      where: {
        deviceId_deviceUserId: {
          deviceId,
          deviceUserId,
        },
      },
      update: {
        employeeId,
        isActive: true,
      },
      create: {
        deviceId,
        deviceUserId,
        employeeId,
        isActive: true,
      },
    });

    // Enqueue safe INFO command to verify device sync status
    await enqueueSafeAdmsCommand(deviceSerialNumber, "INFO", deviceId);

    // 2. Trigger a reprocess immediately
    await reprocessUnmappedPunches(deviceId, deviceSerialNumber, deviceUserId);

    try { revalidatePath(`/dashboard/hr/biometric/devices/${deviceId}`); } catch (e) {}
    return { success: true };
  } catch (error: any) {
    console.error("Mapping error:", error);
    return { success: false, error: "Failed to map PIN" };
  }
}

export async function reprocessUnmappedPunches(
  deviceId: string,
  deviceSerialNumber: string,
  deviceUserId: string
) {
  try {
    // Fetch unresolved unmapped punches for this PIN
    const unresolvedLogs = await prisma.unmappedBiometricLog.findMany({
      where: {
        deviceSerialNumber,
        deviceUserId,
        status: { in: ["UNRESOLVED", "PENDING"] },
      },
    });

    if (unresolvedLogs.length === 0) {
      return { success: true, message: "No unresolved punches to reprocess", processed: 0 };
    }

    // Build raw payload expected by syncBiometricLogs
    const rawDataToSync: any[] = [];
    
    for (const log of unresolvedLogs) {
      // Reconstruct payload as ZKTeco ATTLOG shape
      const pt = new Date(log.punchTime);
      const dateStr = pt.toISOString().split("T")[0]; // YYYY-MM-DD
      const timeStr = pt.toTimeString().split(" ")[0]; // HH:MM:SS
      
      rawDataToSync.push({
        EnrollNumber: deviceUserId,
        Date: dateStr,
        Time: timeStr,
        PunchType: "0",
        VerifyMode: "1",
        WorkCode: "0",
        DeviceID: deviceSerialNumber
      });
    }

    // Process via the standard sync service
    await syncBiometricLogs({
      vendor: "ZKTeco",
      rawData: rawDataToSync,
      deviceId,
    });

    // Mark as RESOLVED
    await prisma.unmappedBiometricLog.updateMany({
      where: {
        id: { in: unresolvedLogs.map(l => l.id) }
      },
      data: {
        status: "RESOLVED",
      }
    });

    try { revalidatePath(`/dashboard/hr/biometric/devices/${deviceId}`); } catch (e) {}
    return { success: true, processed: unresolvedLogs.length };
  } catch (error: any) {
    console.error("Reprocess error:", error);
    return { success: false, error: "Failed to reprocess punches" };
  }
}

export async function ignoreUnmappedPunch(id: string, deviceId: string) {
  try {
    await prisma.unmappedBiometricLog.update({
      where: { id },
      data: { status: "IGNORED" }
    });

    try { revalidatePath(`/dashboard/hr/biometric/devices/${deviceId}`); } catch (e) {}
    return { success: true };
  } catch (error: any) {
    console.error("Ignore error:", error);
    return { success: false, error: "Failed to ignore punch" };
  }
}

export async function setDeviceUserAccessStatus(mappingId: string, deviceId: string, isActive: boolean) {
  try {
    const map = await prisma.employeeDeviceMap.update({
      where: { id: mappingId },
      data: { isActive },
      include: { device: true }
    });

    if (map.device?.serialNumber) {
      await enqueueSafeAdmsCommand(map.device.serialNumber, "INFO", deviceId);
    }

    try { revalidatePath(`/dashboard/hr/biometric/devices/${deviceId}`); } catch (e) {}
    return { success: true };
  } catch (error: any) {
    console.error("Access toggle error:", error);
    return { success: false, error: "Failed to toggle access" };
  }
}

export async function setDeviceUserAccessByPin(deviceId: string, deviceUserId: string, isActive: boolean) {
  try {
    await prisma.employeeDeviceMap.updateMany({
      where: { deviceId, deviceUserId },
      data: { isActive }
    });

    const device = await prisma.biometricDevice.findUnique({ where: { id: deviceId } });
    if (device?.serialNumber) {
      await enqueueSafeAdmsCommand(device.serialNumber, "INFO", deviceId);
    }

    try { revalidatePath(`/dashboard/hr/biometric/devices/${deviceId}`); } catch (e) {}
    return { success: true };
  } catch (error: any) {
    console.error("Access toggle by PIN error:", error);
    return { success: false, error: "Failed to toggle access" };
  }
}
