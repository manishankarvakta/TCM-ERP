import { config } from "../config";
import { logger } from "../logger";
import { AttendanceStore, AttendanceCacheRecord } from "../storage/attendance-store";
import { ConfigWorker } from "./config-worker";
import { sendAttendanceBatch } from "../live-server/send-attendance";

export class RetryWorker {
  private static isRunning = false;

  /**
   * Runs the retry sync loop
   */
  static async run(): Promise<void> {
    if (this.isRunning) {
      logger.info("RetryWorker: Run already in progress, skipping.");
      return;
    }

    this.isRunning = true;
    logger.info("RetryWorker: Initiating retry sync for failed/pending records...");

    try {
      const maxRetries = config.maxRetryCount;
      const batchSize = config.syncBatchSize;

      // 1. Get all pending/failed logs
      const pendingRecords = AttendanceStore.getPendingRecords(maxRetries, batchSize);

      if (pendingRecords.length === 0) {
        logger.info("RetryWorker: No pending/failed records require retry.");
        return;
      }

      logger.info(`RetryWorker: Found ${pendingRecords.length} records to retry.`);

      // 2. Group records by deviceId
      const groups = new Map<string, AttendanceCacheRecord[]>();
      for (const record of pendingRecords) {
        const list = groups.get(record.deviceId) || [];
        list.push(record);
        groups.set(record.deviceId, list);
      }

      // 3. Load device configs to resolve vendors
      const devices = ConfigWorker.getLocalDevices();
      const deviceMap = new Map(devices.map((d) => [d.deviceId, d]));

      // 4. Send each group
      for (const [deviceId, records] of groups.entries()) {
        const device = deviceMap.get(deviceId);
        const vendor = device ? device.vendor : records[0].vendor; // Fallback to record's stored vendor

        logger.info(`RetryWorker: Retrying ${records.length} logs for device ID ${deviceId} (${vendor})...`);
        const result = await sendAttendanceBatch(vendor, deviceId, records);

        if (result.success) {
          logger.info(`RetryWorker: Retry successful for device ID ${deviceId}.`);
          AttendanceStore.updateSyncStatuses(
            records.map((r) => ({ id: r.id, status: "SYNCED" }))
          );
        } else {
          logger.warn(`RetryWorker: Retry failed for device ID ${deviceId}: ${result.error}`);
          AttendanceStore.updateSyncStatuses(
            records.map((r) => ({
              id: r.id,
              status: "FAILED",
              error: result.error || "Retry upload failed"
            }))
          );
        }
      }
    } catch (err) {
      logger.error("RetryWorker: Uncaught error in retry task", err);
    } finally {
      this.isRunning = false;
      logger.info("RetryWorker: Retry sync cycle finished.");
    }
  }
}
export default RetryWorker;
