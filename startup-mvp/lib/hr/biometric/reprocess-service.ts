import { prisma } from "@/lib/prisma";
import { syncBiometricLogs } from "./sync-service";

/**
 * Reprocess raw biometric logs that are either pending or failed.
 */
export async function reprocessRawLogsByDeviceAndDate(
  deviceId: string,
  fromDate: Date,
  toDate: Date
) {
  const device = await prisma.biometricDevice.findUnique({
    where: { id: deviceId },
    select: { serialNumber: true }
  });

  if (!device?.serialNumber) {
    return { success: false, error: "Device serial number not found" };
  }

  // Find un-synced or failed raw logs in date range
  const rawLogs = await prisma.biometricRawLog.findMany({
    where: {
      deviceSerialNumber: device.serialNumber,
      punchTime: {
        gte: fromDate,
        lte: toDate,
      },
      // Process all in range, let constraints handle duplicates
    },
  });

  if (rawLogs.length === 0) {
    return { success: true, processed: 0, skipped: 0, message: "No raw logs found for this date range" };
  }

  const rawDataToSync: any[] = [];
  for (const log of rawLogs) {
    if (log.rawData) {
      try {
        const parsed = JSON.parse(log.rawData);
        rawDataToSync.push(parsed);
      } catch {
        rawDataToSync.push(reconstructAttlogPayload(log.deviceUserId || "", log.punchTime as Date, device.serialNumber));
      }
    } else {
      rawDataToSync.push(reconstructAttlogPayload(log.deviceUserId || "", log.punchTime as Date, device.serialNumber));
    }
  }

  const res = await syncBiometricLogs({
    vendor: "ZKTeco",
    rawData: rawDataToSync,
    deviceId: deviceId,
  });

  return { success: true, processed: rawDataToSync.length, syncLogId: (res as any).syncLogId };
}

/**
 * Reprocess unknown punches safely for a date range.
 */
export async function reprocessUnknownPunchesByDeviceAndDate(
  deviceId: string,
  fromDate: Date,
  toDate: Date
) {
  const device = await prisma.biometricDevice.findUnique({
    where: { id: deviceId },
    select: { serialNumber: true }
  });

  if (!device?.serialNumber) {
    return { success: false, error: "Device serial number not found" };
  }

  const unresolvedLogs = await prisma.unmappedBiometricLog.findMany({
    where: {
      deviceSerialNumber: device.serialNumber,
      punchTime: {
        gte: fromDate,
        lte: toDate,
      },
      status: { in: ["UNRESOLVED", "PENDING", "REJECTED"] },
    },
  });

  if (unresolvedLogs.length === 0) {
    return { success: true, processed: 0, message: "No unresolved/rejected punches found" };
  }

  const rawDataToSync: any[] = [];
  
  for (const log of unresolvedLogs) {
    rawDataToSync.push(reconstructAttlogPayload(log.deviceUserId, new Date(log.punchTime), device.serialNumber));
  }

  const res = await syncBiometricLogs({
    vendor: "ZKTeco",
    rawData: rawDataToSync,
    deviceId,
  });

  await prisma.unmappedBiometricLog.updateMany({
    where: {
      id: { in: unresolvedLogs.map(l => l.id) }
    },
    data: {
      status: "RESOLVED",
    }
  });

  return { success: true, processed: rawDataToSync.length, syncLogId: (res as any).syncLogId };
}

/**
 * Retry failed SyncLogs
 */
export async function reprocessFailedSyncsByDeviceAndDate(
  deviceId: string,
  fromDate: Date,
  toDate: Date
) {
  const failedLogs = await prisma.biometricSyncLog.findMany({
    where: {
      deviceId,
      status: "FAILED",
      syncTime: {
        gte: fromDate,
        lte: toDate,
      }
    }
  });

  if (failedLogs.length === 0) {
    return { success: true, processed: 0, message: "No failed syncs found" };
  }

  return { 
    success: false, 
    error: "Cannot retry: raw payload unavailable directly on sync log. Please use 'Reprocess Raw Logs' instead." 
  };
}

export async function queueTestAdmsHistoricalQuery(deviceId: string) {
  const device = await prisma.biometricDevice.findUnique({
    where: { id: deviceId },
    select: { serialNumber: true }
  });

  if (!device?.serialNumber) {
    return { success: false, error: "Device serial number not found" };
  }

  const cmd = await prisma.biometricCommand.create({
    data: {
      deviceSerialNumber: device.serialNumber,
      deviceId,
      commandType: "QUERY",
      commandText: "DATA QUERY ATTLOG StartTime=1970-01-01 00:00:00",
      status: "PENDING"
    }
  });

  return { success: true, commandId: cmd.id, message: "ADMS Historical query queued. Await physical device verification." };
}

// Helper
function reconstructAttlogPayload(pin: string, punchTime: Date, deviceSn: string) {
  const dateStr = punchTime.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = punchTime.toTimeString().split(" ")[0]; // HH:MM:SS
  return {
    EnrollNumber: pin,
    Date: dateStr,
    Time: timeStr,
    PunchType: "0",
    VerifyMode: "1",
    WorkCode: "0",
    DeviceID: deviceSn
  };
}
