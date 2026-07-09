import { config } from "../config";
import { logger } from "../logger";
import { AttendanceStore } from "../storage/attendance-store";
import { ConfigWorker } from "./config-worker";
import { sendHeartbeat } from "../live-server/send-heartbeat";

export class HeartbeatWorker {
  private static isRunning = false;

  /**
   * Runs the heartbeat sync
   */
  static async run(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info("HeartbeatWorker: Sending heartbeat report...");

    try {
      // 1. Get database log metrics
      const maxRetries = config.maxRetryCount;
      const metrics = AttendanceStore.getStatusSummary(maxRetries);

      // 2. Get active device count
      const devices = ConfigWorker.getLocalDevices();
      const activeCount = devices.filter((d) => d.isActive).length;

      // 3. Send heartbeat to live server
      const result = await sendHeartbeat({
        status: "ONLINE",
        pendingLogs: metrics.pending,
        failedLogs: metrics.failed,
        activeDevices: activeCount
      });

      if (result.success) {
        logger.info("HeartbeatWorker: Heartbeat sent successfully.");
      } else {
        logger.warn(`HeartbeatWorker: Heartbeat failed: ${result.error}`);
      }
    } catch (err) {
      logger.error("HeartbeatWorker: Uncaught error in heartbeat task", err);
    } finally {
      this.isRunning = false;
    }
  }
}
export default HeartbeatWorker;
