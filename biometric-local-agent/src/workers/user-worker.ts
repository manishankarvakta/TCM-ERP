import { config } from "../config";
import { logger } from "../logger";
import { ConfigWorker } from "./config-worker";
import { AdapterFactory, DeviceConfig } from "../devices/adapter-factory";

export interface UserMapping {
  deviceId: string;
  deviceUserId: string;
  employeeId: string;
  isActive: boolean;
}

export interface UserMappingStatusReport {
  deviceId: string;
  deviceUserId: string;
  status: "SYNCED" | "FAILED";
  error: string | null;
}

export class UserWorker {
  private static isRunning = false;

  /**
   * Fetches expected mappings from the live server
   */
  private static async fetchExpectedMappings(): Promise<{ success: boolean; mappings: UserMapping[]; error: string | null }> {
    const url = `${config.liveServerBaseUrl}/api/biometric/gateway/user-mappings`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config.gatewayApiKey}`,
          "X-Gateway-Id": config.gatewayId,
          "Accept": "application/json"
        }
      });

      if (response.status !== 200) {
        return { success: false, mappings: [], error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json() as any;
      if (!data.success || !Array.isArray(data.mappings)) {
        return { success: false, mappings: [], error: data.error || "Invalid response format" };
      }

      return { success: true, mappings: data.mappings, error: null };
    } catch (e: any) {
      return { success: false, mappings: [], error: e.message || "Network error" };
    }
  }

  /**
   * Uploads verification status reports back to the live server
   */
  private static async uploadReports(reports: UserMappingStatusReport[]): Promise<boolean> {
    const url = `${config.liveServerBaseUrl}/api/biometric/gateway/user-mappings/status`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.gatewayApiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ reports })
      });

      if (response.status !== 200) {
        const contentType = response.headers.get("content-type") || "";
        let errorMsg = response.statusText || "Error";
        if (!contentType.includes("text/html")) {
          const text = await response.text().catch(() => "");
          if (text) errorMsg = text.slice(0, 150);
        }
        logger.warn(`UserWorker: Failed to upload reports: HTTP ${response.status} - ${errorMsg}`);
        return false;
      }

      const data = await response.json() as any;
      return !!data.success;
    } catch (e: any) {
      logger.error("UserWorker: Failed to transmit mapping status reports", e);
      return false;
    }
  }

  /**
   * Runs the user verification task
   */
  static async run(): Promise<void> {
    if (this.isRunning) {
      logger.info("UserWorker: Run already in progress, skipping.");
      return;
    }

    this.isRunning = true;
    logger.info("UserWorker: Fetching expected user mappings to verify...");

    try {
      // 1. Fetch expected user mappings from live server
      const fetchResult = await this.fetchExpectedMappings();
      if (!fetchResult.success) {
        logger.warn(`UserWorker: Could not retrieve expected user mappings: ${fetchResult.error}`);
        return;
      }

      const mappings = fetchResult.mappings;
      if (mappings.length === 0) {
        logger.info("UserWorker: No user mappings defined on ERP for this gateway.");
        return;
      }

      logger.info(`UserWorker: Found ${mappings.length} mappings to verify.`);

      // 2. Load active devices
      const devices = ConfigWorker.getLocalDevices();
      const activeDevices = devices.filter((d) => d.isActive);

      const reports: UserMappingStatusReport[] = [];

      // 3. Verify mappings on each device
      for (const device of activeDevices) {
        const deviceMappings = mappings.filter((m) => m.deviceId === device.deviceId);
        if (deviceMappings.length === 0) continue;

        logger.info(`UserWorker: Verifying ${deviceMappings.length} mappings for ${device.name}...`);

        // Pull users from physical device
        const pullResult = await AdapterFactory.pullUsers(device, config.deviceConnectTimeoutMs);

        if (pullResult.success) {
          const physicalUserIds = new Set(pullResult.userIds);
          logger.info(`UserWorker: Found ${physicalUserIds.size} users registered on physical device ${device.name}.`);

          for (const mapping of deviceMappings) {
            const exists = physicalUserIds.has(mapping.deviceUserId);
            reports.push({
              deviceId: mapping.deviceId,
              deviceUserId: mapping.deviceUserId,
              status: exists ? "SYNCED" : "FAILED",
              error: exists ? null : "User ID not registered on physical device"
            });
          }
        } else {
          logger.warn(`UserWorker: Failed to pull users from ${device.name}: ${pullResult.error}`);
          // Report failure for all mappings on this device due to connection issues
          for (const mapping of deviceMappings) {
            reports.push({
              deviceId: mapping.deviceId,
              deviceUserId: mapping.deviceUserId,
              status: "FAILED",
              error: `Failed to connect to device: ${pullResult.error}`
            });
          }
        }
      }

      // 4. Send verification reports back to live server
      if (reports.length > 0) {
        logger.info(`UserWorker: Uploading ${reports.length} user mapping verification reports...`);
        const ok = await this.uploadReports(reports);
        if (ok) {
          logger.info("UserWorker: Verification reports uploaded successfully.");
        } else {
          logger.warn("UserWorker: Failed to sync verification reports with live ERP.");
        }
      }
    } catch (err) {
      logger.error("UserWorker: Uncaught error in user mappings verification", err);
    } finally {
      this.isRunning = false;
      logger.info("UserWorker: Verification task finished.");
    }
  }
}
export default UserWorker;
