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
    select: { id: true, employeeCode: true },
  });
  const empMap = new Map(employees.map((e) => [e.employeeCode, e.id]));
  
  let processedCount = 0;
  let errorCount = 0;

  for (const log of normalizedLogs) {
    const employeeId = empMap.get(log.employeeCode);
    if (!employeeId) {
      errorCount++;
      continue;
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
          deviceId: log.deviceId || input.deviceId,
        },
      });
      processedCount++;
    } catch (err) {
      errorCount++;
    }
  }

  return { processedCount, errorCount };
}
