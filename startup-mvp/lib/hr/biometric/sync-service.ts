import { prisma } from "@/lib/prisma";
import { normalizeBiometricLogs, NormalizedPunch } from "./normalization";
import { biometricQueue, BiometricJobType } from "./queue";

/**
 * Biometric Sync Service
 * Handles raw log ingestion and duplicate prevention
 */
export async function syncBiometricLogs(input: {
  vendor: string;
  rawData: any[];
  syncedBy: string;
  deviceId?: string;
}) {
  try {
    // 1. Create a Sync Log in PENDING status
    const syncLog = await prisma.biometricSyncLog.create({
      data: {
        vendor: input.vendor,
        deviceId: input.deviceId,
        recordsCount: input.rawData.length,
        syncedBy: input.syncedBy,
        status: "PENDING" as any,
      },
    });

    // 2. Enqueue the sync job
    await biometricQueue.add(`sync-${syncLog.id}`, {
      type: BiometricJobType.SYNC_LOGS,
      syncLogId: syncLog.id,
      vendor: input.vendor,
      rawData: input.rawData,
      deviceId: input.deviceId,
      syncedBy: input.syncedBy,
    });

    return { success: true, syncLogId: syncLog.id, message: "Sync job enqueued" };
  } catch (error) {
    console.error("syncBiometricLogs error:", error);
    return { success: false, error: "Failed to enqueue sync job" };
  }
}

/**
 * Process a chunk of normalized logs (called by worker)
 */
export async function processNormalizedChunk(input: {
  vendor: string;
  rawData: any[];
  deviceId?: string;
}) {
  const normalizedLogs = normalizeBiometricLogs(input.vendor, input.rawData);
  
  // Get employees for mapping
  const employees = await prisma.employee.findMany({
    select: { id: true, employeeCode: true, deviceUserId: true },
  });
  const empMap = new Map<string, string>();
  employees.forEach((e) => {
    if (e.deviceUserId) {
      empMap.set(e.deviceUserId, e.id);
    }
    if (e.employeeCode) {
      // Map it as fallback if not already mapped by deviceUserId
      if (!empMap.has(e.employeeCode)) {
        empMap.set(e.employeeCode, e.id);
      }
    }
  });
  
  // Get all biometric devices to map deviceId/IP/Serial to database ID
  const devices = await prisma.biometricDevice.findMany({
    select: { id: true, ipAddress: true, serialNumber: true },
  });
  const deviceMap = new Map<string, string>();
  devices.forEach((d) => {
    deviceMap.set(d.id, d.id);
    if (d.ipAddress) deviceMap.set(d.ipAddress, d.id);
    if (d.serialNumber) deviceMap.set(d.serialNumber, d.id);
  });

  let processedCount = 0;
  let errorCount = 0;

  for (const log of normalizedLogs) {
    const employeeId = empMap.get(log.employeeCode);
    if (!employeeId) {
      errorCount++;
      continue;
    }

    let dbDeviceId = input.deviceId ? deviceMap.get(input.deviceId) : null;
    if (!dbDeviceId && log.deviceId) {
      dbDeviceId = deviceMap.get(log.deviceId) || null;
    }

    try {
      await prisma.attendanceLog.upsert({
        where: {
          employeeId_timestamp: {
            employeeId,
            timestamp: log.timestamp,
          },
        },
        update: {},
        create: {
          employeeId,
          timestamp: log.timestamp,
          source: "BIOMETRIC",
          deviceId: dbDeviceId || null,
        },
      });
      processedCount++;
    } catch (err) {
      errorCount++;
    }
  }

  return { processedCount, errorCount };
}
