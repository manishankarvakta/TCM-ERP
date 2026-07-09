import * as fs from "fs";
import * as path from "path";
import { config } from "../config";
import { logger } from "../logger";
import { JsonDb } from "../storage/json-db";
import { getDeviceConfig } from "../live-server/get-device-config";
import { DeviceConfig } from "../devices/adapter-factory";

export interface DevicesCache {
  lastFetchedAt: string | null;
  devices: DeviceConfig[];
}

export class ConfigWorker {
  private static CACHE_FILE = "devices.json";

  /**
   * Loads the current local devices cache
   */
  static getLocalDevices(): DeviceConfig[] {
    const cache = JsonDb.read<DevicesCache>(this.CACHE_FILE, {
      lastFetchedAt: null,
      devices: []
    });
    return cache.devices;
  }

  /**
   * Runs the config fetch task
   */
  static async run(): Promise<void> {
    logger.info("ConfigWorker: Fetching device configuration...");

    // 1. Fetch from live server
    const serverResult = await getDeviceConfig();

    if (serverResult.success && serverResult.devices.length > 0) {
      logger.info(`ConfigWorker: Successfully fetched ${serverResult.devices.length} devices from live server.`);
      this.mergeAndSaveDevices(serverResult.devices);
      return;
    }

    logger.warn(`ConfigWorker: Server fetch did not return device data: ${serverResult.error || "Empty device list"}`);

    // 2. Fallback to local config if configured and cache is empty or fallback enabled
    if (config.localConfigFallback) {
      const localConfigPath = path.resolve(process.cwd(), "gateway.config.json");
      const currentCache = this.getLocalDevices();

      if (currentCache.length === 0 && fs.existsSync(localConfigPath)) {
        logger.info("ConfigWorker: Local cache is empty. Bootstrapping from gateway.config.json fallback.");
        try {
          const fileContent = fs.readFileSync(localConfigPath, "utf8");
          const parsed = JSON.parse(fileContent);
          if (parsed && Array.isArray(parsed.devices)) {
            this.mergeAndSaveDevices(parsed.devices);
            logger.info(`ConfigWorker: Successfully bootstrapped ${parsed.devices.length} devices from fallback.`);
          }
        } catch (e) {
          logger.error("ConfigWorker: Failed to read local fallback config", e);
        }
      }
    }
  }

  /**
   * Helper to merge incoming devices with the local cache to preserve local metadata like lastPulledAt
   */
  private static mergeAndSaveDevices(incomingDevices: DeviceConfig[]): void {
    const localCache = JsonDb.read<DevicesCache>(this.CACHE_FILE, {
      lastFetchedAt: null,
      devices: []
    });

    const localMap = new Map<string, DeviceConfig>();
    for (const d of localCache.devices) {
      localMap.set(d.deviceId, d);
    }

    const mergedDevices: DeviceConfig[] = incomingDevices.map((incoming) => {
      const local = localMap.get(incoming.deviceId);
      
      // Preserve local state fields if they aren't provided by the incoming server object
      return {
        ...incoming,
        username: incoming.username || local?.username,
        password: incoming.password || local?.password,
        port: incoming.port || local?.port,
        serialNumber: incoming.serialNumber || local?.serialNumber,
        lastPulledAt: local?.lastPulledAt // Crucial local tracking state
      };
    });

    const updatedCache: DevicesCache = {
      lastFetchedAt: new Date().toISOString(),
      devices: mergedDevices
    };

    JsonDb.write(this.CACHE_FILE, updatedCache);
    logger.info("ConfigWorker: Devices configuration cache updated.");
  }
}
export default ConfigWorker;
