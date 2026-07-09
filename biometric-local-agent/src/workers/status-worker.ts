import { config } from "../config";
import { logger } from "../logger";
import { ConfigWorker } from "./config-worker";
import { AdapterFactory } from "../devices/adapter-factory";
import { sendDeviceStatus, DeviceStatusReport } from "../live-server/send-device-status";

export class StatusWorker {
  private static isRunning = false;
  private static lastReachableMap: Map<string, { reachable: boolean; lastCheckedAt: string; lastError: string | null }> = new Map();

  /**
   * Retrieves the reachability details of a device
   */
  static getDeviceStatus(deviceId: string) {
    return this.lastReachableMap.get(deviceId);
  }

  /**
   * Runs the status health check
   */
  static async run(): Promise<void> {
    if (this.isRunning) {
      logger.info("StatusWorker: Connection test already running, skipping.");
      return;
    }

    this.isRunning = true;
    logger.info("StatusWorker: Testing reachability of configured devices...");

    try {
      const devices = ConfigWorker.getLocalDevices();
      const activeDevices = devices.filter((d) => d.isActive);

      if (activeDevices.length === 0) {
        logger.info("StatusWorker: No active devices to check.");
        return;
      }

      const reports: DeviceStatusReport[] = [];

      for (const device of activeDevices) {
        logger.info(`StatusWorker: Testing connection for ${device.name} (${device.ipAddress})...`);
        const result = await AdapterFactory.testConnection(device, config.deviceConnectTimeoutMs);
        
        const lastChecked = new Date().toISOString();
        StatusWorker.lastReachableMap.set(device.deviceId, {
          reachable: result.success,
          lastCheckedAt: lastChecked,
          lastError: result.error
        });

        reports.push({
          deviceId: device.deviceId,
          vendor: device.vendor,
          reachable: result.success,
          lastCheckedAt: lastChecked,
          lastError: result.error
        });

        if (result.success) {
          logger.info(`StatusWorker: ${device.name} is REACHABLE.`);
        } else {
          logger.warn(`StatusWorker: ${device.name} is UNREACHABLE. Error: ${result.error}`);
        }
      }

      // Send status reports to live server
      const result = await sendDeviceStatus(reports);
      if (result.success) {
        logger.info("StatusWorker: Device status report uploaded successfully.");
      } else {
        logger.warn(`StatusWorker: Failed to upload status report: ${result.error}`);
      }
    } catch (err) {
      logger.error("StatusWorker: Uncaught error in health check task", err);
    } finally {
      this.isRunning = false;
    }
  }
}
export default StatusWorker;
