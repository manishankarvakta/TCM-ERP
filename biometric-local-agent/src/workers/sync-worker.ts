import { config } from "../config";
import { logger } from "../logger";
import { ConfigWorker, DevicesCache } from "./config-worker";
import { AdapterFactory, DeviceConfig } from "../devices/adapter-factory";
import { AttendanceStore } from "../storage/attendance-store";
import { sendAttendanceBatch } from "../live-server/send-attendance";
import { JsonDb } from "../storage/json-db";

export class SyncWorker {
  private static isRunning = false;

  /**
   * Main sync task runner
   */
  static async run(): Promise<void> {
    if (this.isRunning) {
      logger.info("SyncWorker: Pull operation already in progress, skipping.");
      return;
    }

    this.isRunning = true;
    logger.info("SyncWorker: Starting device polling sync cycle...");

    try {
      const devices = ConfigWorker.getLocalDevices();
      const activeDevices = devices.filter((d) => d.isActive);

      if (activeDevices.length === 0) {
        logger.info("SyncWorker: No active devices configured, skipping.");
        return;
      }

      for (const device of activeDevices) {
        await this.syncDevice(device);
      }
    } catch (err) {
      logger.error("SyncWorker: Uncaught error in sync cycle", err);
    } finally {
      this.isRunning = false;
      logger.info("SyncWorker: Polling sync cycle finished.");
    }
  }

  /**
   * Polls a specific device, caches punches, and uploads pending ones
   */
  private static async syncDevice(device: DeviceConfig): Promise<void> {
    logger.info(`SyncWorker: Syncing device: ${device.name} (${device.ipAddress})`);

    // 1. Pull logs from the device
    const result = await AdapterFactory.pullAttendance(device, config.deviceConnectTimeoutMs);
    
    if (!result.success) {
      logger.warn(`SyncWorker: Failed to pull logs from ${device.name}: ${result.error}`);
      return;
    }

    const pullCount = result.punches.length;
    logger.info(`SyncWorker: Pulled ${pullCount} logs from ${device.name}.`);

    // 2. Cache records locally (deduplication occurs here)
    const newAddedCount = AttendanceStore.addRecords(
      device.deviceId,
      device.vendor,
      device.serialNumber,
      result.punches
    );
    
    logger.info(`SyncWorker: Cached ${newAddedCount} new logs for ${device.name} after deduplication.`);

    // 3. Update device lastPulledAt in cache
    this.updateDeviceLastPulled(device.deviceId);

    // 4. If autoSync is enabled, immediately trigger sync of pending data for this device
    if (config.autoSyncEnabled) {
      await this.syncPendingForDevice(device);
    }
  }

  /**
   * Helper to update the lastPulledAt timestamp for a device in devices.json
   */
  private static updateDeviceLastPulled(deviceId: string): void {
    const cache = JsonDb.read<DevicesCache>("devices.json", {
      lastFetchedAt: null,
      devices: []
    });

    let modified = false;
    for (const d of cache.devices) {
      if (d.deviceId === deviceId) {
        d.lastPulledAt = new Date().toISOString();
        modified = true;
        break;
      }
    }

    if (modified) {
      JsonDb.write("devices.json", cache);
    }
  }

  /**
   * Batches up and sends pending records for a single device to the live ERP
   */
  private static async syncPendingForDevice(device: DeviceConfig): Promise<void> {
    const maxRetries = config.maxRetryCount;
    const batchSize = config.syncBatchSize;
    
    // Fetch pending logs specifically for this device
    const allPending = AttendanceStore.getCache().records.filter(
      (r) => 
        r.deviceId === device.deviceId && 
        (r.syncStatus === "PENDING" || r.syncStatus === "FAILED") && 
        r.retryCount < maxRetries
    );

    if (allPending.length === 0) {
      logger.info(`SyncWorker: No pending logs to send for ${device.name}.`);
      return;
    }

    // Process in batches
    for (let i = 0; i < allPending.length; i += batchSize) {
      const batch = allPending.slice(i, i + batchSize);
      logger.info(`SyncWorker: Uploading batch of ${batch.length} for ${device.name}...`);

      const uploadResult = await sendAttendanceBatch(device.vendor, device.deviceId, batch);

      if (uploadResult.success) {
        logger.info(`SyncWorker: Batch upload successful for ${device.name}.`);
        AttendanceStore.updateSyncStatuses(
          batch.map((b) => ({ id: b.id, status: "SYNCED" }))
        );
      } else {
        logger.warn(`SyncWorker: Batch upload failed for ${device.name}: ${uploadResult.error}`);
        AttendanceStore.updateSyncStatuses(
          batch.map((b) => ({ id: b.id, status: "FAILED", error: uploadResult.error || "Upload failed" }))
        );
      }
    }
  }
}
export default SyncWorker;
