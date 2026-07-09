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
  syncedBy?: string | null;
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
  
  // Pre-load common data to optimize chunk processing
  const deviceMaps = await prisma.employeeDeviceMap.findMany({
    select: { id: true, deviceUserId: true, deviceId: true, employeeId: true, isActive: true }
  });

  const employees = await prisma.employee.findMany({
    select: { id: true, biometricDeviceId: true },
    where: { biometricDeviceId: { not: null } }
  });
  const empFallbackMap = new Map(employees.map((e) => [e.biometricDeviceId, e.id]));
  
  // Get deviceSerialNumber for UnmappedBiometricLog
  let deviceSerialNumber = undefined;
  if (input.deviceId) {
    const d = await prisma.biometricDevice.findUnique({
      where: { id: input.deviceId },
      select: { serialNumber: true }
    });
    if (d?.serialNumber) deviceSerialNumber = d.serialNumber;
  }

  let processedCount = 0;
  let errorCount = 0;

  for (const log of normalizedLogs) {
    let employeeId = undefined;
    let isDisabledAccess = false;

    // 1. Try to find in EmployeeDeviceMap
    let mapEntry = input.deviceId
      ? deviceMaps.find(m => m.deviceId === input.deviceId && m.deviceUserId === log.biometricDeviceId)
      : undefined;

    if (mapEntry) {
      if (!mapEntry.isActive) {
        isDisabledAccess = true;
      } else {
        employeeId = mapEntry.employeeId;
      }
    }

    // 2. Auto-generate map if employee exists with this biometric ID
    if (!employeeId && !isDisabledAccess) {
      const matchingEmployeeId = empFallbackMap.get(log.biometricDeviceId);
      if (matchingEmployeeId) {
        // Enforce "one employee will have one map" -> Check if employee already has a map
        const existingEmpMap = deviceMaps.find(m => m.employeeId === matchingEmployeeId);
        
        if (existingEmpMap) {
          // Update the existing mapping to point to the new device / deviceUserId
          try {
            await prisma.employeeDeviceMap.update({
              where: { id: existingEmpMap.id },
              data: {
                deviceId: input.deviceId || existingEmpMap.deviceId,
                deviceUserId: log.biometricDeviceId,
                isActive: true,
                syncStatus: "SYNCED"
              }
            });
            
            // Update local memory list
            existingEmpMap.deviceId = input.deviceId || existingEmpMap.deviceId;
            existingEmpMap.deviceUserId = log.biometricDeviceId;
            existingEmpMap.isActive = true;
            
            employeeId = matchingEmployeeId;
            console.log(`[SYNC] Updated existing EmployeeDeviceMap ID:${existingEmpMap.id} for employee:${employeeId} to deviceUserId:${log.biometricDeviceId}`);
          } catch (err) {
            console.error("[SYNC] Failed to update existing mapping:", err);
          }
        } else if (input.deviceId) {
          // Auto-generate a new EmployeeDeviceMap in the DB
          try {
            const newMap = await prisma.employeeDeviceMap.create({
              data: {
                deviceId: input.deviceId,
                deviceUserId: log.biometricDeviceId,
                employeeId: matchingEmployeeId,
                isActive: true,
                syncStatus: "SYNCED"
              }
            });
            
            // Add to local list to prevent duplicate creation in this loop
            deviceMaps.push({
              id: newMap.id,
              deviceId: input.deviceId,
              deviceUserId: log.biometricDeviceId,
              employeeId: matchingEmployeeId,
              isActive: true
            });
            
            employeeId = matchingEmployeeId;
            console.log(`[SYNC] Auto-generated new EmployeeDeviceMap for employee:${employeeId} device:${input.deviceId} pin:${log.biometricDeviceId}`);
          } catch (err) {
            console.error("[SYNC] Failed to auto-generate mapping:", err);
          }
        }
      }
    }

    if (isDisabledAccess || !employeeId) {
      // 3. Log Unmapped or Disabled Biometric Punch
      try {
        await prisma.unmappedBiometricLog.create({
          data: {
            deviceSerialNumber: deviceSerialNumber || undefined,
            deviceUserId: log.biometricDeviceId,
            punchTime: log.timestamp,
            reason: isDisabledAccess ? "DISABLED_ACCESS" : "EMPLOYEE_NOT_FOUND",
            status: isDisabledAccess ? "REJECTED" : "UNRESOLVED",
          }
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          console.log(`[SYNC] Duplicate unmapped/disabled punch skipped for PIN:${log.biometricDeviceId} Time:${log.timestamp.toISOString()}`);
        } else {
          console.error("Failed to insert UnmappedBiometricLog:", err);
        }
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

/**
 * Validates a user's local access mapping for biometric processing.
 */
export async function checkDeviceUserAccess({
  deviceId,
  deviceSerialNumber,
  deviceUserId,
}: {
  deviceId?: string;
  deviceSerialNumber?: string;
  deviceUserId: string;
}): Promise<{
  mappingFound: boolean;
  employeeId?: string;
  isActive?: boolean;
  reason?: "UNMAPPED" | "DISABLED_ACCESS" | "ACTIVE";
}> {
  if (!deviceId) return { mappingFound: false, reason: "UNMAPPED" };

  const mapEntry = await prisma.employeeDeviceMap.findUnique({
    where: { deviceId_deviceUserId: { deviceId, deviceUserId } }
  });

  if (!mapEntry) {
    // Check fallback
    const employee = await prisma.employee.findFirst({
      where: { biometricDeviceId: deviceUserId }
    });
    if (employee) {
      return { mappingFound: true, employeeId: employee.id, isActive: true, reason: "ACTIVE" };
    }
    return { mappingFound: false, reason: "UNMAPPED" };
  }

  return {
    mappingFound: true,
    employeeId: mapEntry.employeeId,
    isActive: mapEntry.isActive,
    reason: mapEntry.isActive ? "ACTIVE" : "DISABLED_ACCESS"
  };
}

/**
 * Prepares a safe ADMS command for device synchronization.
 * Currently limited to CHECK/INFO to avoid destructive operations.
 */
export async function enqueueSafeAdmsCommand(
  deviceSerialNumber: string,
  action: "CHECK" | "INFO",
  deviceId?: string
) {
  try {
    const cmd = await prisma.biometricCommand.create({
      data: {
        deviceSerialNumber,
        deviceId,
        commandType: action,
        commandText: action === "INFO" ? "INFO" : "CHECK",
        status: "PENDING"
      }
    });
    return { success: true, commandId: cmd.id };
  } catch (error) {
    console.error("Failed to enqueue safe ADMS command:", error);
    return { success: false, error: "Command generation failed" };
  }
}
