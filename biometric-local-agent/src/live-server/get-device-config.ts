import { config } from "../config";
import { DeviceConfig } from "../devices/adapter-factory";
import { logger } from "../logger";

export async function getDeviceConfig(): Promise<{ success: boolean; devices: DeviceConfig[]; error: string | null }> {
  const url = `${config.liveServerBaseUrl}/api/biometric/gateway/config`;
  logger.info(`Fetching device config from live server: ${url}`);

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
      return {
        success: false,
        devices: [],
        error: `Server responded with status ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json() as any;
    if (!data.success || !Array.isArray(data.devices)) {
      return {
        success: false,
        devices: [],
        error: data.error || "Invalid response format from live server"
      };
    }

    // Convert server response to local DeviceConfig format
    const devices: DeviceConfig[] = data.devices.map((d: any) => ({
      deviceId: d.deviceId,
      vendor: d.vendor,
      name: d.name,
      ipAddress: d.ipAddress,
      port: d.port,
      serialNumber: d.serialNumber,
      username: d.username,
      password: d.password,
      isActive: d.isActive !== undefined ? d.isActive : true
    }));

    return { success: true, devices, error: null };
  } catch (err: any) {
    logger.warn(`Failed to connect to live ERP configuration API: ${err.message}`);
    return { success: false, devices: [], error: err.message || "Network error" };
  }
}
