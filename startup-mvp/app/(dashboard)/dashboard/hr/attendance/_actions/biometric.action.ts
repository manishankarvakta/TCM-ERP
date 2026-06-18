"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { syncBiometricLogs } from "@/lib/hr/biometric/sync-service";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { biometricQueue, BiometricJobType } from "@/lib/hr/biometric/queue";

/**
 * Sync Biometric Logs (External JSON/CSV trigger)
 */
export async function triggerBiometricSync(input: {
  vendor: string;
  rawData: any[];
  deviceId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canSync = await hasPermission(session.user.id, "hr.attendance", "create");
    if (!canSync) return { success: false, error: "Permission denied" };

    const result = await syncBiometricLogs({
      ...input,
      syncedBy: session.user.id,
    });

    if (result.success) {
      revalidateBothPaths("hr/attendance");
    }

    return result;
  } catch (error) {
    return { success: false, error: "Action failed" };
  }
}

/**
 * Process Raw Logs into Attendance Records
 */
export async function triggerAttendanceProcessing(startDate: Date, endDate: Date) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canProcess = await hasPermission(session.user.id, "hr.attendance", "edit");
    if (!canProcess) return { success: false, error: "Permission denied" };

    // Enqueue background processing job
    await biometricQueue.add(`process-${Date.now()}`, {
      type: BiometricJobType.PROCESS_ATTENDANCE,
      startDate: startDate,
      endDate: endDate,
    });

    return { success: true, message: "Attendance processing started in the background" };
  } catch (error) {
    console.error("triggerAttendanceProcessing error:", error);
    return { success: false, error: "Failed to start processing" };
  }
}

/**
 * Get Sync Logs
 */
export async function getBiometricSyncLogs(limit = 10) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const logs = await prisma.biometricSyncLog.findMany({
      take: limit,
      orderBy: { syncTime: "desc" },
      include: { user: { select: { name: true } } },
    });

    return { success: true, logs };
  } catch (error) {
    return { success: false, error: "Failed to fetch logs" };
  }
}

/**
 * Trigger Active Pull from all TCP/IP (Direct) Devices
 */
export async function triggerActiveDeviceSync() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canSync = await hasPermission(session.user.id, "hr.attendance", "create");
    if (!canSync) return { success: false, error: "Permission denied" };

    // Fetch all active IP devices
    const devices = await prisma.biometricDevice.findMany({
      where: { status: "active", connectionType: "IP" },
    });

    if (devices.length === 0) {
      return { success: false, error: "No active TCP/IP devices configured." };
    }

    const { pullLogsFromDevice } = await import("@/lib/hr/biometric/zklib-service");

    let totalPulled = 0;
    let failedDevices = 0;

    for (const device of devices) {
      if (!device.ipAddress) {
        failedDevices++;
        continue;
      }

      // Update ping time
      await prisma.biometricDevice.update({
        where: { id: device.id },
        data: { lastPingAt: new Date() }
      });

      const port = device.port || 4370;
      const pullResult = await pullLogsFromDevice(device.ipAddress, port);

      if (pullResult.success && pullResult.logs && pullResult.logs.length > 0) {
        // Enqueue the downloaded logs using existing queue logic
        await syncBiometricLogs({
          vendor: device.vendor || "ZKTeco",
          rawData: pullResult.logs,
          deviceId: device.id,
          syncedBy: session.user.id,
        });
        totalPulled += pullResult.logs.length;
      } else if (!pullResult.success) {
        failedDevices++;
      }
    }

    revalidateBothPaths("hr/attendance");

    if (failedDevices > 0 && totalPulled === 0) {
      return { success: false, error: `Failed to connect to ${failedDevices} device(s).` };
    }

    return { 
      success: true, 
      message: `Successfully queued ${totalPulled} logs from devices.`,
      totalPulled
    };

  } catch (error: any) {
    console.error("triggerActiveDeviceSync error:", error);
    return { success: false, error: "Action failed" };
  }
}
