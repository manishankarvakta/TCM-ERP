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
  console.log("📥 [SYNC] Operation triggered. Raw Data received from device:");
  console.log(JSON.stringify(input.rawData, null, 2));

  const normalizedLogs = normalizeBiometricLogs(input.vendor, input.rawData);
  
  console.log("🔄 [SYNC] Data after normalization:");
  console.log(JSON.stringify(normalizedLogs, null, 2));
  
  // Get explicit device maps
  const deviceMaps = await prisma.employeeDeviceMap.findMany({
    where: { isActive: true },
    select: { deviceUserId: true, deviceId: true, employeeId: true }
  });

  // Get employees for mapping fallback
  const employees = await prisma.employee.findMany({
    select: { id: true, biometricDeviceId: true },
    where: { biometricDeviceId: { not: null } }
  });
  const empFallbackMap = new Map(employees.map((e) => [e.biometricDeviceId, e.id]));
  
  let processedCount = 0;
  let errorCount = 0;

  for (const log of normalizedLogs) {
    let employeeId = undefined;

    // 1. Try to find in EmployeeDeviceMap
    if (input.deviceId) {
      const mapEntry = deviceMaps.find(m => m.deviceId === input.deviceId && m.deviceUserId === log.biometricDeviceId);
      if (mapEntry) employeeId = mapEntry.employeeId;
    }

    // 2. Fallback to Employee.biometricDeviceId
    if (!employeeId) {
      employeeId = empFallbackMap.get(log.biometricDeviceId);
    }

    if (!employeeId) {
      // 3. Log Unmapped Biometric Punch
      try {
        await prisma.unmappedBiometricLog.create({
          data: {
            deviceUserId: log.biometricDeviceId,
            punchTime: log.timestamp,
            reason: "EMPLOYEE_NOT_FOUND",
          }
        });
      } catch (err) {
        console.error("Failed to insert UnmappedBiometricLog:", err);
      }
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
          deviceId: input.deviceId || undefined,
        },
      });
      processedCount++;
    } catch (err) {
      console.error("Upsert failed for employee:", log.biometricDeviceId, err);
      errorCount++;
    }
  }

  console.log("✅ [SYNC] Finish Result. Upserted:", processedCount, "Failed/Skipped:", errorCount);

  // Auto-chain: Enqueue processing for the affected date range
  if (processedCount > 0 && normalizedLogs.length > 0) {
    let minDate = normalizedLogs[0].timestamp;
    let maxDate = normalizedLogs[0].timestamp;
    for (const log of normalizedLogs) {
      if (log.timestamp < minDate) minDate = log.timestamp;
      if (log.timestamp > maxDate) maxDate = log.timestamp;
    }
    
    // Auto-enqueue attendance calculation
    await biometricQueue.add(`auto-process-${Date.now()}`, {
      type: BiometricJobType.PROCESS_ATTENDANCE,
      startDate: minDate,
      endDate: maxDate,
    });
    console.log(`🚀 [SYNC] Auto-chained processing job for ${minDate.toISOString()} to ${maxDate.toISOString()}`);
  }

  return { processedCount, errorCount };
}
